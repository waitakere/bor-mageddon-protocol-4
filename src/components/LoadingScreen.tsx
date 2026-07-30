import React, { useEffect, useState } from 'react';

export const LoadingScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for the signal from Phaser that MainLevel has finished building
    const handleReady = () => {
      setIsReady(true);
      setProgress(100);
      
      // Auto-close 1.2 seconds after the level is ready
      setTimeout(() => {
        closeScreen();
      }, 1200);
    };

    window.addEventListener('phaser-ready', handleReady);
    return () => window.removeEventListener('phaser-ready', handleReady);
  }, []);

  // Fake progress bar animation for visual flair while BootScene downloads assets
  useEffect(() => {
    if (isReady) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Cap the fake progress at 90% until the actual ready signal arrives
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 15);
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [isReady]);

  const closeScreen = () => {
    setIsVisible(false);
    
    // Resume the game exactly when the overlay vanishes
    const game = (window as any).phaserGame;
    if (game) {
      game.scene.resume('MainLevel');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex justify-center items-center">
      
      {/* Arcade Style Popup Box */}
      <div className="relative text-center border-[4px] border-double border-[#ff3333] p-[60px] bg-[#1a0a05] shadow-[0_0_50px_rgba(255,51,51,0.2)] min-w-[500px]">
        
        {/* Close Button (X) */}
        <button 
          onClick={closeScreen}
          className="absolute top-4 right-5 text-zinc-500 hover:text-red-500 font-bold text-2xl font-mono cursor-pointer transition-colors"
          title="Force Start"
        >
          X
        </button>

        <h1 className="font-metal text-[clamp(50px,6vw,80px)] text-white drop-shadow-[4px_4px_0px_#ff3333] m-0 mb-[15px] tracking-[4px]">
          {isReady ? 'READY!' : 'LOADING'}
        </h1>
        
        <div className="font-mono text-[#ff3333] text-[20px] tracking-[8px] mb-[40px]">
          {isReady ? '[SYSTEM_ONLINE]' : '[INITIATING_PROTOCOL]'}
        </div>

        {/* Progress Bar Container */}
        <div className="h-8 w-full border-[3px] border-zinc-300 bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
          {/* Progress Fill */}
          <div 
            className="h-full bg-[#ff3333] transition-all duration-200" 
            style={{ width: `${progress}%` }} 
          />
        </div>

      </div>
    </div>
  );
};