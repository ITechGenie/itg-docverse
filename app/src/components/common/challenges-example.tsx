import { Challenges } from "./challenges";
import { ChallengesWithFilters } from "./challenges-with-filters";
import { Button } from "../ui/button";
import { useState } from "react";
import type { Challenge } from "@/types/challenges";

export const ChallengesExample = () => {
  const [viewMode, setViewMode] = useState<'basic' | 'filtered'>('basic');

  const handleChallengeClick = (challenge: Challenge) => {
    console.log('Challenge clicked:', challenge);
    // Handle challenge click - could navigate to challenge detail page
    alert(`Clicked on: ${challenge.title}`);
  };

  return (
    <div className="space-y-8">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'basic' ? 'default' : 'outline'}
          onClick={() => setViewMode('basic')}
        >
          Basic View
        </Button>
        <Button
          variant={viewMode === 'filtered' ? 'default' : 'outline'}
          onClick={() => setViewMode('filtered')}
        >
          Filtered View
        </Button>
      </div>

      {/* Basic Challenges Component */}
      {viewMode === 'basic' && (
        <div>
          {/* <h2 className="text-2xl font-bold mb-4">Basic Challenges</h2> */}
          <Challenges onChallengeClick={handleChallengeClick} />
        </div>
      )}

      {/* Enhanced Challenges Component with Filters */}
      {viewMode === 'filtered' && (
        <div>
          {/* <h2 className="text-2xl font-bold mb-4">Challenges with Filters</h2> */}
          <ChallengesWithFilters
            onChallengeClick={handleChallengeClick}
            showFilters={true}
            showSearch={true}
          />
        </div>
      )}

      {/* Usage Examples */}
      {/* <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Usage Examples:</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Basic usage:</strong> <code>{'<Challenges />'}</code></p>
          <p><strong>With click handler:</strong> <code>{'<Challenges onChallengeClick={handleClick} />'}</code></p>
          <p><strong>With custom data:</strong> <code>{'<Challenges challenges={customData} />'}</code></p>
          <p><strong>With filters:</strong> <code>{'<ChallengesWithFilters showFilters={true} />'}</code></p>
          <p><strong>Search only:</strong> <code>{'<ChallengesWithFilters showFilters={false} showSearch={true} />'}</code></p>
        </div>
      </div> */}
    </div>
  );
}; 