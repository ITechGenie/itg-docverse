import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Challenge } from '@/types/index';
import { api } from '@/services/api-client';

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
    searchQuery = '',
  } = options;

  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(initialDifficulty);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [searchTerm, setSearchTerm] = useState<string>(searchQuery);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await api.getChallenges();
        if (resp.success && Array.isArray(resp.data)) {
          if (mounted) setAllChallenges(resp.data);
        } else {
          if (mounted) setAllChallenges([]);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load challenges');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredChallenges = useMemo(() => {
    let filtered = allChallenges.slice();

    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter((c) => c.difficulty === difficultyFilter);
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter((c) => c.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((c) => !c.isActive);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => {
        return (
          (c.title || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.tags?.map(t => t.name).join(' ') || '').toLowerCase().includes(q)
        );
      });
    }

    return filtered;
  }, [allChallenges, difficultyFilter, statusFilter, searchTerm]);

  const getChallenge = useCallback((id: string) => {
    return allChallenges.find((c) => c.id === id) || null;
  }, [allChallenges]);

  const getActive = useCallback(() => {
    return allChallenges.filter((c) => c.isActive);
  }, [allChallenges]);

  const getByDifficulty = useCallback((difficulty: Challenge['difficulty']) => {
    return allChallenges.filter((c) => c.difficulty === difficulty);
  }, [allChallenges]);

  const resetFilters = useCallback(() => {
    setDifficultyFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  }, []);

  return {
    challenges: filteredChallenges,
    allChallenges,
    loading,
    error,
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