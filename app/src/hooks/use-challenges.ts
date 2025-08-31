import { useState, useMemo, useCallback } from 'react';
import { challengesData, getActiveChallenges, getChallengesByDifficulty, getChallengeById } from '@/types/challenges';
import type { Challenge } from '@/types/challenges';

type DifficultyFilter = Challenge['difficulty'] | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

interface UseChallengesOptions {
  initialDifficulty?: DifficultyFilter;
  initialStatus?: StatusFilter;
  searchQuery?: string;
}

export const useChallenges = (options: UseChallengesOptions = {}) => {
  const { 
    initialDifficulty = 'all', 
    initialStatus = 'all', 
    searchQuery = '' 
  } = options;

  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(initialDifficulty);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  // Filter challenges based on current filters
  const filteredChallenges = useMemo(() => {
    let filtered = challengesData;

    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(challenge => challenge.difficulty === difficultyFilter);
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(challenge => challenge.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(challenge => !challenge.isActive);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(challenge => 
        challenge.title.toLowerCase().includes(query) ||
        challenge.description.toLowerCase().includes(query) ||
        challenge.tag.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [difficultyFilter, statusFilter, searchTerm]);

  // Get challenge by ID
  const getChallenge = useCallback((id: number) => {
    return getChallengeById(id);
  }, []);

  // Get active challenges
  const getActive = useCallback(() => {
    return getActiveChallenges();
  }, []);

  // Get challenges by difficulty
  const getByDifficulty = useCallback((difficulty: Challenge['difficulty']) => {
    return getChallengesByDifficulty(difficulty);
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setDifficultyFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  }, []);

  return {
    challenges: filteredChallenges,
    allChallenges: challengesData,
    difficultyFilter,
    statusFilter,
    searchTerm,
    setDifficultyFilter,
    setStatusFilter,
    setSearchTerm,
    getChallenge,
    getActive,
    getByDifficulty,
    resetFilters,
  };
}; 