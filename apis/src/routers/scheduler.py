"""
Scheduler Router
API endpoints for manual job triggers and status
"""

from typing import Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from ..middleware.dependencies import get_current_user_from_middleware
from ..services.scheduler import get_scheduler
from ..services.database.factory import DatabaseServiceFactory
from ..config.settings import settings

router = APIRouter()


@router.get("/jobs")
async def list_jobs(
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """List all registered scheduled jobs"""
    scheduler = get_scheduler()
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not available")
    
    return {
        "success": True,
        "jobs": scheduler.get_job_status()
    }


@router.post("/jobs/{job_id}/trigger")
async def trigger_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Manually trigger a scheduled job"""
    scheduler = get_scheduler()
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not available")
    
    success = await scheduler.trigger_job_manually(job_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return {
        "success": True,
        "message": f"Job {job_id} triggered successfully"
    }


@router.get("/jobs/weekly_digest/preview/{user_id}", response_class=HTMLResponse)
async def preview_weekly_digest(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """
    Preview the weekly digest email for a specific user
    Useful for testing and debugging the digest template
    """
    try:
        # Import here to avoid circular dependencies
        from ..services.jobs.weekly_digest import _collect_user_digest_data, _render_digest_email
        
        db = DatabaseServiceFactory.create_service()
        
        # Get user info
        user_query = "SELECT id, email, username FROM users WHERE id = ?"
        if settings.database_type == "postgresql":
            user_query = db._convert_placeholders(user_query)
            user_result = await db.execute_query(user_query, (user_id,))
        else:
            user_result = await db.execute_query(user_query, (user_id,))
        
        if not user_result:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result[0]
        
        # Calculate date range (last 7 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        date_range = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
        
        # Collect digest data
        digest_data = await _collect_user_digest_data(db, user['id'], user['email'], start_date)
        
        # Render email
        html_content = _render_digest_email(digest_data, date_range)
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")

