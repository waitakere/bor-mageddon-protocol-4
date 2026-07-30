import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameConfig } from '../game/main';

interface GameContainerProps {
  selectedCharacter: string;
}

export const GameContainer: React.FC<GameContainerProps> = ({ selectedCharacter }) => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // =========================================================
    // CRITICAL FIX: BRIDGE REACT STATE TO PHASER
    // Force the selection into local storage immediately so 
    // MainLevel.ts can read it the millisecond it boots!
    // =========================================================
    window.localStorage.setItem('selectedCharacter', selectedCharacter.toLowerCase());

    const config: Phaser.Types.Core.GameConfig = {
      ...GameConfig,
      parent: 'game-container', 
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    (window as any).phaserGame = game;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        (window as any).phaserGame = undefined; 
      }
    };
  }, [selectedCharacter]); 

  return (
    <div 
        id="game-container" 
        data-selected-character={selectedCharacter}
        className="w-full h-full bg-[#050505] overflow-hidden flex items-center justify-center" 
    />
  );
};