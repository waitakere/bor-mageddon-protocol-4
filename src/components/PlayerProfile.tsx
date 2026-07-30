import React from 'react';
import { profileService, PlayerProfile } from '@/game/services/ProfileService';
import { scoreService } from '@/game/services/ScoreService';

interface PlayerProfileProps {
  profile: PlayerProfile | null;
}

const PlayerProfileDisplay: React.FC<PlayerProfileProps> = ({ profile }) => {
  if (!profile) return null;

  return (
    <div className="hud-panel">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-primary/20 border-2 border-primary flex items-center justify-center">
          <span className="font-pixel text-2xl text-primary">
            {profile.username.charAt(0)}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-pixel text-lg text-foreground">{profile.username}</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="font-retro text-xs text-muted-foreground">TOTAL SCORE</p>
              <p className="font-retro text-secondary">
                {scoreService.formatScore(profile.total_score)}
              </p>
            </div>
            <div>
              <p className="font-retro text-xs text-muted-foreground">GAMES</p>
              <p className="font-retro text-foreground">{profile.games_played}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileDisplay;
