import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Challenge } from "@/types/index";
import { useChallenges } from '@/hooks/use-challenges';
import { Badge } from "../ui/badge";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Types
interface ChallengesProps {
  challenges?: Challenge[];
  className?: string;
  onChallengeClick?: (challenge: Challenge) => void;
  initialCount?: number;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onClick?: (challenge: Challenge) => void;
}

// Constants
const CHALLENGE_CARD_STYLES = {
  card: "light-mode-gradient dark:sunset-glow-gradient text-white border-0 hover:shadow-lg transition-shadow cursor-pointer",
  header: "flex flex-row items-center gap-2 space-y-0 pb-2",
  title: "text-2xl font-bold",
  content: "space-y-2",
  description: "text-xs opacity-90",
  badgesContainer: "flex items-center gap-2 flex-wrap",
  tagBadge: "hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-3 py-1",
  participants: "text-xs opacity-75"
} as const;

const GRID_STYLES = {
  container: "grid grid-cols-1 md:grid-cols-2 gap-4"
} as const;

const BUTTON_STYLES = {
  viewAll: "mt-6 w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
} as const;


// Challenge Card Component
const ChallengeCard = ({ challenge }: ChallengeCardProps) => {

  const navigate = useNavigate();

  return (
    
      <Card
        className={CHALLENGE_CARD_STYLES.card}
      >
        <CardHeader className={CHALLENGE_CARD_STYLES.header}>
          <Link to={`/post/${challenge.id}`} className="block">
            <div className={CHALLENGE_CARD_STYLES.title}>
              {challenge.title}
            </div>
          </Link>
        </CardHeader>

      <CardContent className={CHALLENGE_CARD_STYLES.content}>
        <p className={CHALLENGE_CARD_STYLES.description}>
          {challenge.description}
        </p>

        <div className={CHALLENGE_CARD_STYLES.badgesContainer}>
            {challenge.tags
            ?.filter((tag) => tag.name.toLowerCase() !== "challenges")
            .map((tag) => (
              <Badge
                key={tag.name}
                variant="secondary"
                className={`${CHALLENGE_CARD_STYLES.tagBadge} cursor-pointer`}
                onClick={() => navigate(`/tags/${encodeURIComponent(tag.name)}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/tags/${encodeURIComponent(tag.name)}`);
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}

          {/* Uncomment and refactor when needed */}
          {/* {challenge.isActive && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              Active
            </Badge>
          )}
          {challenge.difficulty && (
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${getDifficultyColor(challenge.difficulty)}`}
            >
              {challenge.difficulty}
            </Badge>
          )} */}
        </div>

          {/* commenting participants for now 
        {challenge.participants && (
          <p className={CHALLENGE_CARD_STYLES.participants}>
            {challenge.participants} participants
          </p>
        )}
          */}
      </CardContent>
    </Card>
  );
};

// Main Challenges Component
export const Challenges = ({
  challenges,
  className = "",
  onChallengeClick,
  initialCount = 4
}: ChallengesProps) => {
  // If no challenges prop provided, use hook to fetch and filter
  const { challenges: fetchedChallenges } = useChallenges();
  const resolvedChallenges = challenges ?? fetchedChallenges;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayChallenges = isExpanded 
    ? resolvedChallenges 
    : resolvedChallenges.slice(0, initialCount);
  
  const hasMoreChallenges = resolvedChallenges.length > initialCount;
  const containerClassName = `${GRID_STYLES.container} ${className}`.trim();

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-4">
      <div className={containerClassName}>
  {displayChallenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onClick={onChallengeClick}
          />
        ))}
      </div>
      
  {hasMoreChallenges && (
        <Button
          variant="outline"
          onClick={handleToggleExpanded}
          className={BUTTON_STYLES.viewAll}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              View All ({resolvedChallenges.length} challenges)
            </>
          )}
        </Button>
      )}
    </div>
  );
};
