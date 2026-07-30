import React, { useEffect, useState } from 'react';

// Optional: Import Supabase if you have it configured, otherwise the component will safely fall back to LocalStorage
// import { supabase } from '@/lib/supabase';

interface Era {
  id: string;
  year: string;
  title: string;
  description: string;
  unlocked: boolean;
  coordinates: { x: string, y: string };
}

/**
 * WorldMap: The "Vremenska Kapija" (Time Gate) Interface.
 * Allows players to travel between historical segments of Bor.
 */
export const WorldMap: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [hoveredEra, setHoveredEra] = useState<Era | null>(null);

  const eras: Era[] = [
    { 
      id: '1993', 
      year: '1993', 
      title: 'INDUSTRIJSKA NOĆNA MORA', 
      description: 'The era of copper and hyperinflation.',
      unlocked: true, // Level 1 is always unlocked
      coordinates: { x: '50%', y: '60%' }
    },
    { 
      id: '1944', 
      year: '1944', 
      title: 'PARTIZANSKI PARADOKS', 
      description: 'Snowy tunnels and Mecha-Tito.',
      unlocked: unlockedLevel >= 2,
      coordinates: { x: '25%', y: '40%' }
    },
    { 
      id: '2090', 
      year: '2090', 
      title: 'NEO-BOR DISTOPIJA', 
      description: 'Cyber-enforcers and the B.I.A. Drone.',
      unlocked: unlockedLevel >= 3,
      coordinates: { x: '75%', y: '30%' }
    }
  ];

  // Fetch Progress safely
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Attempt Supabase fetch if it exists in your window/imports
        // const { data } = await supabase.from('game_saves').select('current_level').single();
        // if (data) setUnlockedLevel(data.current_level);
        
        // Fallback: Use LocalStorage for immediate browser testing
        const savedLevel = localStorage.getItem('bor_unlocked_level');
        if (savedLevel) setUnlockedLevel(parseInt(savedLevel, 10));
      } catch (error) {
        console.warn("Database not connected, falling back to Level 1.");
      }
    };
    fetchProgress();

    // Allow closing with ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectEra = (eraId: string) => {
    if (window.phaserGame) {
      window.phaserGame.sound.playAudioSprite('sfx_atlas', 'ui_click'); // Play confirm sound
      window.phaserGame.events.emit('transition-to-era', eraId); // Tell Phaser to change levels
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#1a0f0f] flex items-center justify-center z-50 font-mono text-[#b87333]">
      {/* Fallback background if the map_grid.png image isn't loaded yet */}
      <div className="absolute inset-0 bg-[url('/assets/ui/map_grid.png')] bg-cover opacity-30" />

      <div className="relative w-[900px] h-[600px] border-4 border-[#b87333] shadow-[0_0_30px_rgba(184,115,51,0.3)] bg-black/80 p-6 overflow-hidden backdrop-blur-sm">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-6 text-zinc-500 hover:text-red-500 font-bold text-2xl cursor-pointer z-50"
          title="Close Map (ESC)"
        >
          X
        </button>

        {/* VHS Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]" />

        <h2 className="text-3xl text-[#39ff14] mb-8 uppercase tracking-[0.2em] text-center border-b-2 border-[#b87333] pb-4">
          OPERATIVNA MAPA: BOR-MAGEDDON
        </h2>

        {/* Map Markers */}
        <div className="relative w-full h-[350px]">
          {eras.map((era) => (
            <button
              key={era.id}
              onClick={() => era.unlocked && selectEra(era.id)}
              onMouseEnter={() => setHoveredEra(era)}
              onMouseLeave={() => setHoveredEra(null)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-4 transition-all z-10
                ${era.unlocked ? 'cursor-pointer hover:scale-110 hover:z-20' : 'cursor-not-allowed opacity-40 grayscale'}
              `}
              style={{ left: era.coordinates.x, top: era.coordinates.y }}
            >
              <div className={`w-14 h-14 border-2 ${era.unlocked ? 'border-[#39ff14] shadow-[0_0_15px_#39ff14]' : 'border-red-900'} rotate-45 flex items-center justify-center bg-black/80`}>
                <span className="-rotate-45 text-sm font-bold text-white">{era.year}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Info Panel */}
        <div className="absolute bottom-6 left-6 right-6 h-32 border-t-2 border-[#b87333] bg-black/90 p-4 z-10">
          {hoveredEra ? (
            <>
              <h3 className="text-[#39ff14] text-xl uppercase font-bold tracking-wider">{hoveredEra.title}</h3>
              <p className="text-[#b87333] mt-2 italic">{hoveredEra.description}</p>
              {!hoveredEra.unlocked && (
                <p className="text-red-600 text-xs mt-3 uppercase font-bold animate-pulse">
                  [ TERMINAL ZAKLJUČAN: PORAZI PRETHODNOG BOSSA ]
                </p>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-[#b87333] opacity-50 uppercase tracking-[0.3em] animate-pulse">
                Odaberi vremenski sektor za stabilizaciju...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};