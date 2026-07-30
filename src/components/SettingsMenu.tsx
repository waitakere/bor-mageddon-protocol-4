import React, { useEffect, useState } from 'react';

// ==========================================
// 1. PERMANENT CONTROLS HUD (Corner Overlay)
// ==========================================
export const ControlsHUD: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 z-40 bg-black/60 border border-[#b87333] p-3 rounded-sm pointer-events-none select-none backdrop-blur-sm">
      <h3 className="text-[#39ff14] font-mono text-xs mb-2 uppercase tracking-widest border-b border-zinc-700 pb-1">
        [SYS_CONTROLS]
      </h3>
      <ul className="text-zinc-300 font-mono text-[10px] space-y-1">
        <li><span className="text-orange-500 font-bold">ARROWS:</span> MOVE</li>
        <li><span className="text-orange-500 font-bold">SPACE:</span> JUMP</li>
        <li><span className="text-orange-500 font-bold">Q:</span> PUNCH 1 (JAB)</li>
        <li><span className="text-orange-500 font-bold">W:</span> PUNCH 2 (HOOK)</li>
        <li><span className="text-orange-500 font-bold">A:</span> KICK 1 (SNAP)</li>
        <li><span className="text-orange-500 font-bold">S:</span> KICK 2 (HEAVY)</li>
        <li className="pt-2 mt-1 border-t border-zinc-700/50">
          <span className="text-red-500 font-bold">Q + W:</span> SPECIAL ABILITY
        </li>
        <li>
          <span className="text-red-500 font-bold">A + S:</span> FINISHER
        </li>
        <li className="pt-2 mt-1 border-t border-zinc-700/50 text-yellow-400">
          <span className="text-yellow-500 font-bold">P:</span> PAUSE GAME
        </li>
      </ul>
    </div>
  );
};

// ==========================================
// 2. SETTINGS MODAL
// ==========================================
interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  crtEnabled: boolean;
  onCrtToggle: (enabled: boolean) => void;
  // Replaced master volume with dedicated audio buses
  bgmVolume: number;
  sfxVolume: number;
  onBgmVolumeChange: (volume: number) => void;
  onSfxVolumeChange: (volume: number) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  crtEnabled,
  onCrtToggle,
  bgmVolume,
  sfxVolume,
  onBgmVolumeChange,
  onSfxVolumeChange
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. PAUSE THE GAME WHEN OPEN & LISTEN FOR ESCAPE KEY
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    if ((window as any).phaserGame) {
      if (isOpen) {
        (window as any).phaserGame.scene.pause('MainLevel'); 
      } else {
        (window as any).phaserGame.scene.resume('MainLevel');
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track fullscreen changes natively
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  if (!isOpen) return null;

  // Dispatch specific events to the Phaser Engine rather than hacking the global Web Audio node
  const handleBgmChange = (newVolume: number) => {
    onBgmVolumeChange(newVolume);
    if ((window as any).phaserGame) {
      (window as any).phaserGame.events.emit('set-bgm-volume', newVolume);
    }
  };

  const handleSfxChange = (newVolume: number) => {
    onSfxVolumeChange(newVolume);
    if ((window as any).phaserGame) {
      (window as any).phaserGame.events.emit('set-sfx-volume', newVolume);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono backdrop-blur-sm">
      <div className="bg-[#121212] border-2 border-[#b87333] p-8 w-96 shadow-[0_0_30px_rgba(184,115,51,0.4)] relative">
        
        <button 
          onClick={onClose}
          className="absolute top-3 right-4 text-zinc-500 hover:text-red-500 font-bold text-xl cursor-pointer"
          title="Close (ESC)"
        >
          X
        </button>

        <h2 className="text-[#39ff14] text-2xl mb-6 uppercase tracking-widest border-b-2 border-[#b87333] pb-2">
          KONFIGURACIJA
        </h2>

        <div className="space-y-8">
          
          {/* CRT Filter Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[#b87333] block uppercase text-sm font-bold">CRT FILTER</h3>
              <p className="text-zinc-500 text-xs">Scanline & Phosphor overlay</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={crtEnabled}
                onChange={(e) => onCrtToggle(e.target.checked)}
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#39ff14]"></div>
            </label>
          </div>

          {/* Fullscreen Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[#b87333] block uppercase text-sm font-bold">FULLSCREEN</h3>
              <p className="text-zinc-500 text-xs">Maximize display</p>
            </div>
            <button 
              onClick={toggleFullscreen}
              className="text-xs bg-zinc-800 border border-zinc-600 px-3 py-1 text-white hover:bg-zinc-700"
            >
              {isFullscreen ? 'EXIT' : 'ENTER'}
            </button>
          </div>

          {/* BGM Volume Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[#b87333] uppercase text-sm font-bold">MUZIKA (BGM)</label>
              <span className="text-[#39ff14] text-sm">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={bgmVolume}
              onChange={(e) => handleBgmChange(parseFloat(e.target.value))}
              className="w-full accent-[#b87333] h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* SFX Volume Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[#b87333] uppercase text-sm font-bold">EFEKTI (SFX)</label>
              <span className="text-[#39ff14] text-sm">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={sfxVolume}
              onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
              className="w-full accent-[#b87333] h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

        </div>

        <button 
          onClick={onClose}
          className="mt-10 w-full bg-[#b87333] hover:bg-[#39ff14] text-black font-bold py-3 px-4 transition-colors uppercase border border-orange-500"
        >
          POTVRDI I NAZAD (SAVE)
        </button>
      </div>
    </div>
  );
};