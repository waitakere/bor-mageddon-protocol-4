import React, { useState } from 'react';
import { CharacterSelector } from './components/CharacterSelector';
import { GameContainer } from './components/GameContainer';
import { SettingsMenu, ControlsHUD } from './components/SettingsMenu';
import { WorldMap } from './components/WorldMap';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING'>('MENU');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  
  // Audio state split into dedicated BGM and SFX buses
  const [bgmVolume, setBgmVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(0.8);

  const handleCharacterSelect = (characterId: string) => {
    console.log("Protocol Initiated for Agent:", characterId);
    setSelectedCharacter(characterId);
    setGameState('PLAYING');
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      
      {/* 1. CHARACTER SELECTION (THREE.JS) */}
      {gameState === 'MENU' && (
        <CharacterSelector onSelect={handleCharacterSelect} />
      )}
      
      {/* 2. GAME WORLD (PHASER) */}
      {gameState === 'PLAYING' && selectedCharacter && (
        <div className="absolute inset-0 z-0 animate-in fade-in duration-1000">
           <GameContainer selectedCharacter={selectedCharacter} />
        </div>
      )}

      {/* 3. HUD & OVERLAYS */}
      {gameState === 'PLAYING' && (
        <>
          <GameHUD />
          <ControlsHUD />
          
          <div className="absolute top-40 right-4 z-50 flex flex-col gap-3 items-end">
            <button 
              onClick={() => setIsMapOpen(true)}
              className="text-[#b87333] font-mono text-xs border border-[#b87333] px-3 py-1 bg-black/80 hover:bg-[#b87333] hover:text-black transition-colors uppercase tracking-widest pointer-events-auto"
            >
              [OPERATIVNA MAPA]
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-white font-mono text-xs border border-zinc-600 px-3 py-1 bg-black/80 hover:bg-white hover:text-black transition-colors uppercase tracking-widest pointer-events-auto"
            >
              [SETTINGS]
            </button>
          </div>

          <PauseMenu />
          <LoadingScreen />
        </>
      )}

      {/* MODALS */}
      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        crtEnabled={crtEnabled} 
        onCrtToggle={setCrtEnabled}
        bgmVolume={bgmVolume} 
        onBgmVolumeChange={setBgmVolume}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={setSfxVolume}
      />

      {isMapOpen && <WorldMap onClose={() => setIsMapOpen(false)} />}

      {/* POST-PROCESSING CRT FILTER */}
      {crtEnabled && (
        <div 
          className="pointer-events-none absolute inset-0 z-[100] mix-blend-overlay opacity-25"
          style={{
            background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 118, 0.06))",
            backgroundSize: "100% 3px, 3px 100%"
          }}
        />
      )}
    </div>
  );
}