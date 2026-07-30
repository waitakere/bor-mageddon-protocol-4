import React from 'react';

interface PangHUDProps {
  currentScore: number;
  highScore: number;
  multiplier: number;
  dinarsPopped: number;
}

const PangHUD: React.FC<PangHUDProps> = ({
  currentScore,
  highScore,
  multiplier,
  dinarsPopped
}) => {
  const formatLargeNumber = (num: number): string => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="absolute bottom-0 inset-x-0 pointer-events-none z-40">
      <div className="flex items-end justify-between p-4">
        {/* Stats */}
        <div className="hud-panel">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-pixel text-[10px] text-muted-foreground">DINARS POPPED</p>
              <p className="font-retro text-xl text-foreground">{dinarsPopped}</p>
            </div>
            <div>
              <p className="font-pixel text-[10px] text-muted-foreground">MULTIPLIER</p>
              <p className="font-retro text-xl text-secondary">x{multiplier.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* High Score */}
        <div className="hud-panel">
          <p className="font-pixel text-[10px] text-muted-foreground">HIGH SCORE</p>
          <p className="font-retro text-lg text-muted-foreground">
            {formatLargeNumber(highScore)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PangHUD;
