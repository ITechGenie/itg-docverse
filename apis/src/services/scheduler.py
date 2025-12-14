"""
Scheduler Service
Thread-based job scheduler with distributed locking via database
"""

import threading
import logging
from datetime import datetime, timedelta
from typing import Dict, Callable, Optional, List
from dataclasses import dataclass
import asyncio

from ..utils.logger import get_logger

logger = get_logger("SchedulerService", level="DEBUG", json_format=False)

@dataclass
class JobConfig:
    """Configuration for a scheduled job"""
    job_id: str
    name: str
    handler: Callable
    interval_hours: int  # How often to run (in hours)
    enabled: bool = True


class SchedulerService:
    """
    Distributed job scheduler using database locks
    Safe for multi-pod deployments
    """
    
    def __init__(self, db_service, event_loop: Optional[asyncio.AbstractEventLoop] = None):
        self.db = db_service
        self.jobs: Dict[str, JobConfig] = {}
        self.timers: Dict[str, threading.Timer] = {}
        self.running = False
        self.lock_timeout_minutes = 10  # If lock older than this, assume stale
        self.event_loop = event_loop  # Main event loop reference
    
    def register_job(self, job_config: JobConfig):
        """Register a job to be scheduled"""
        self.jobs[job_config.job_id] = job_config
        logger.info(f"Registered job: {job_config.name} (every {job_config.interval_hours}h)")
    
    async def _acquire_lock(self, job_id: str) -> bool:
        """
        Try to acquire a distributed lock for this job
        Returns True if lock acquired, False otherwise
        Uses 'active' status for locked, 'completed' for released
        Checks updated_ts to detect stale locks from crashed pods
        """
        try:
            lock_key = f"scheduler_lock_{job_id}"
            logger.debug(f"Lock key for {job_id}: {lock_key}")
            
            # Check existing lock (returns dict with setting_value and updated_ts)
            existing = await self.db.get_site_setting(lock_key)
            
            if existing:
                lock_status = existing.get('setting_value')
                
                # Check if lock is active
                if lock_status == 'active':
                    # Check if lock is stale using updated_ts
                    try:
                        updated_ts = existing.get('updated_ts')
                        if updated_ts:
                            # Handle both datetime objects and ISO strings
                            if isinstance(updated_ts, str):
                                # Remove timezone info if present for parsing
                                if updated_ts.endswith('+00:00') or updated_ts.endswith('Z'):
                                    updated_ts = updated_ts.replace('+00:00', '').replace('Z', '')
                                lock_time = datetime.fromisoformat(updated_ts)
                            else:
                                lock_time = updated_ts
                            
                            # Calculate age in minutes
                            age_minutes = (datetime.utcnow() - lock_time).total_seconds() / 60
                            
                            if age_minutes < self.lock_timeout_minutes:
                                # Lock is still fresh, another pod owns it
                                logger.debug(f"Lock busy for {job_id} (status: active, age={age_minutes:.2f}m)")
                                return False
                            else:
                                logger.warning(f"Stale lock detected for {job_id} (age={age_minutes:.2f}m), claiming it")
                    except Exception as e:
                        logger.warning(f"Error checking lock staleness for {job_id}: {e}, claiming it")
                else:
                    logger.debug(f"Lock available for {job_id} (status: {lock_status})")
            
            # Acquire/refresh lock by setting to 'active'
            await self.db.set_site_setting(lock_key, 'active')
            logger.debug(f"Lock acquired for {job_id} (set to active)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to acquire lock for {job_id}: {e}")
            return False
    
    async def _release_lock(self, job_id: str):
        """
        Release the distributed lock by setting status to 'completed'
        This avoids making site_settings a transactional table with constant deletes
        """
        try:
            lock_key = f"scheduler_lock_{job_id}"
            await self.db.set_site_setting(lock_key, 'completed')
            logger.debug(f"Lock released for {job_id} (set to completed)")
        except Exception as e:
            logger.warning(f"Failed to release lock for {job_id}: {e}")
    
    async def _should_run_job(self, job_id: str, interval_hours: int) -> bool:
        """Check if job should run based on last execution time"""
        try:
            last_run_key = f"scheduler_last_run_{job_id}"
            last_run = await self.db.get_site_setting(last_run_key)
            
            if not last_run:
                logger.debug(f"Job {job_id} has never run; due now")
                return True  # Never run before
            
            last_run_time = datetime.fromisoformat(last_run)
            hours_since = (datetime.utcnow() - last_run_time).total_seconds() / 3600
            
            logger.debug(f"Job {job_id} last run {hours_since:.2f}h ago; interval {interval_hours}h")
            return hours_since >= interval_hours
            
        except Exception as e:
            logger.error(f"Error checking job schedule for {job_id}: {e}")
            return False
    
    async def _update_last_run(self, job_id: str):
        """Update the last run timestamp"""
        try:
            last_run_key = f"scheduler_last_run_{job_id}"
            await self.db.set_site_setting(last_run_key, datetime.utcnow().isoformat())
            logger.debug(f"Updated last run for {job_id}")
        except Exception as e:
            logger.error(f"Failed to update last run for {job_id}: {e}")
    
    async def _execute_job(self, job_config: JobConfig, manual: bool = False):
        """Execute a single job with locking"""
        job_id = job_config.job_id
        
        try:
            if not manual:
                # For scheduled runs, check if it's time
                if not await self._should_run_job(job_id, job_config.interval_hours):
                    logger.debug(f"Skipping {job_config.name} - not due yet")
                    return
                
                # Try to acquire lock
                if not await self._acquire_lock(job_id):
                    logger.debug(f"Another pod is running {job_config.name}")
                    return
            
            logger.info(f"{'[MANUAL]' if manual else '[SCHEDULED]'} Executing job: {job_config.name}")
            
            # Execute the handler
            try:
                result = job_config.handler()
                if asyncio.iscoroutine(result):
                    await result
            except Exception as handler_error:
                logger.error(f"Job {job_config.name} handler failed: {handler_error}")
            
            # Update last run timestamp
            await self._update_last_run(job_id)
            
            logger.info(f"Job {job_config.name} completed successfully")
            
        except Exception as e:
            logger.error(f"Error executing job {job_config.name}: {e}")
        finally:
            if not manual:
                # Release lock
                await self._release_lock(job_id)
    
    def _schedule_next_check(self, job_config: JobConfig):
        """Schedule the next check for a job"""
        if not self.running:
            return
        
        # Check every hour (adjust based on your needs)
        check_interval_seconds = 100
        
        def run_check():
            if not self.running:
                return
            
            # Schedule the async work on the main event loop
            if self.event_loop and self.event_loop.is_running():
                future = asyncio.run_coroutine_threadsafe(
                    self._execute_job(job_config), 
                    self.event_loop
                )
                # Add callback to handle any exceptions
                def handle_future_result(fut):
                    try:
                        fut.result()  # This will re-raise any exception
                    except Exception as e:
                        logger.error(f"Scheduled job {job_config.name} failed: {e}", exc_info=True)
                
                future.add_done_callback(handle_future_result)
            else:
                logger.error(f"Event loop not available for {job_config.name}")
            
            # Schedule next check
            self._schedule_next_check(job_config)
        
        timer = threading.Timer(check_interval_seconds, run_check)
        timer.daemon = True
        timer.start()
        logger.debug(f"Scheduled next check for {job_config.name} in {check_interval_seconds/3600:.1f}h")
        
        self.timers[job_config.job_id] = timer
    
    def start(self):
        """Start the scheduler"""
        if self.running:
            logger.warning("Scheduler already running")
            return
        
        self.running = True
        logger.info(f"Starting scheduler with {len(self.jobs)} jobs")
        
        for job_config in self.jobs.values():
            if job_config.enabled:
                logger.info(f"Scheduling: {job_config.name} (interval={job_config.interval_hours}h)")
                self._schedule_next_check(job_config)
            else:
                logger.info(f"Skipping disabled job: {job_config.name}")
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        
        for job_id, timer in self.timers.items():
            timer.cancel()
            logger.debug(f"Cancelled timer for {job_id}")
        
        self.timers.clear()
        logger.info("Scheduler stopped")
    
    async def trigger_job_manually(self, job_id: str) -> bool:
        """Manually trigger a job (bypass schedule check)"""
        if job_id not in self.jobs:
            logger.error(f"Job {job_id} not found")
            return False
        
        job_config = self.jobs[job_id]
        logger.info(f"Manual trigger requested for: {job_config.name}")
        
        await self._execute_job(job_config, manual=True)
        return True
    
    def get_job_status(self) -> List[Dict]:
        """Get status of all registered jobs"""
        status = []
        for job_config in self.jobs.values():
            status.append({
                "job_id": job_config.job_id,
                "name": job_config.name,
                "interval_hours": job_config.interval_hours,
                "enabled": job_config.enabled
            })
        return status


# Global scheduler instance
_scheduler_instance: Optional[SchedulerService] = None


def get_scheduler() -> Optional[SchedulerService]:
    """Get the global scheduler instance"""
    return _scheduler_instance


def set_scheduler(scheduler: SchedulerService):
    """Set the global scheduler instance"""
    global _scheduler_instance
    _scheduler_instance = scheduler
