import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Filter, X } from "lucide-react";
import { useChallenges } from "@/hooks/use-challenges";
import type { Challenge } from "@/types/index";

interface ChallengesWithFiltersProps {
  className?: string;
  onChallengeClick?: (challenge: Challenge) => void;
  showFilters?: boolean;
  showSearch?: boolean;
}

// Challenge card component
const ChallengeCard = ({ 
  challenge
}: { 
  challenge: Challenge; 
}) => (
  <Card
    className="sunset-glow-gradient text-white border-0 hover:shadow-lg transition-shadow cursor-pointer"
  >
    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
      <div className="text-2xl font-bold">{challenge.title}</div>
    </CardHeader>
    <CardContent className="space-y-2">
      <p className="text-xs opacity-90">{challenge.description}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {challenge.tags
                    ?.filter((tag) => tag.name.toLowerCase() !== "challenges")
                    .map((tag) => (
                      <Badge
                      key={tag.name}
                      variant="secondary"
                        className="hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-3 py-1"

                      >
                      {tag.name}
                      </Badge>
                    ))}
        {challenge.isActive && (
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            Active
          </Badge>
        )}
        {challenge.difficulty && (
          <Badge 
            variant="outline" 
            className={`text-xs px-2 py-0.5 ${
              challenge.difficulty === 'easy' ? 'text-green-400' :
              challenge.difficulty === 'medium' ? 'text-yellow-400' :
              'text-red-400'
            }`}
          >
            {challenge.difficulty}
          </Badge>
        )}
      </div>
      {challenge.participants && (
        <p className="text-xs opacity-75">
          {challenge.participants} participants
        </p>
      )}
      {challenge.reward && (
        <p className="text-xs opacity-75 font-medium">
          Reward: {challenge.reward}
        </p>
      )}
    </CardContent>
  </Card>
);

// Filters component
const ChallengeFilters = ({ 
  difficultyFilter, 
  statusFilter, 
  searchTerm,
  onDifficultyChange,
  onStatusChange,
  onSearchChange,
  onReset
}: {
  difficultyFilter: string;
  statusFilter: string;
  searchTerm: string;
  onDifficultyChange: (value: any) => void;
  onStatusChange: (value: any) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}) => (
  <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search challenges..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
    
    <div className="flex gap-2">
      <Select value={difficultyFilter} onValueChange={onDifficultyChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="icon"
        onClick={onReset}
        title="Reset filters"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export const ChallengesWithFilters = ({ 
  className = "",
  showFilters = true,
  showSearch = true
}: ChallengesWithFiltersProps) => {
  const {
    challenges,
    difficultyFilter,
    statusFilter,
    searchTerm,
    setDifficultyFilter,
    setStatusFilter,
    setSearchTerm,
    resetFilters,
  } = useChallenges();

  return (
    <div className={className}>
      {(showFilters || showSearch) && (
        <ChallengeFilters
          difficultyFilter={difficultyFilter || 'all'}
          statusFilter={statusFilter || 'all'}
          searchTerm={searchTerm || ''}
          onDifficultyChange={setDifficultyFilter}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchTerm}
          onReset={resetFilters}
        />
      )}
      
      {challenges.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No challenges found matching your criteria.</p>
          <Button 
            variant="outline" 
            onClick={resetFilters}
            className="mt-2"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge: Challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 