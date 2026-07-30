import React, { useEffect, useState, useRef } from 'react';

export const GameHUD: React.FC = () => {
  // Player Stats
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [smf, setSmf] = useState(0);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState('marko');
  const [playerFlash, setPlayerFlash] = useState(false);

  // Game Over States
  const [gameOverPhase, setGameOverPhase] = useState<'none' | 'countdown' | 'select'>('none');
  const [countdown, setCountdown] = useState(10);

  // Enemy Stats
  const [enemyName, setEnemyName] = useState<string | null>(null);
  const [enemyHealth, setEnemyHealth] = useState(0);
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(100);
  const [enemyFlash, setEnemyFlash] = useState(false);

  const playerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const enemyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleHUDUpdate = (e: any) => {
      const data = e.detail;
      
      if (data.health !== undefined) {
          setHealth(data.health);
          // Trigger Game Over Sequence
          if (data.health <= 0 && gameOverPhase === 'none') {
              setGameOverPhase('countdown');
              setCountdown(10);
          }
      }
      if (data.maxHealth !== undefined) setMaxHealth(data.maxHealth);
      if (data.smf !== undefined) setSmf(data.smf);
      if (data.score !== undefined) setScore(data.score);
      if (data.playerName !== undefined) setPlayerName(data.playerName);
      
      setEnemyName(data.enemyName);
      setEnemyHealth(data.enemyHealth || 0);
      setEnemyMaxHealth(data.enemyMaxHealth || 100);

      if (data.playerHitStamp && data.playerHitStamp !== (window as any)._lastPlayerHit) {
        (window as any)._lastPlayerHit = data.playerHitStamp;
        setPlayerFlash(true);
        if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);
        playerTimeoutRef.current = setTimeout(() => setPlayerFlash(false), 150);
      }

      if (data.enemyHitStamp && data.enemyHitStamp !== (window as any)._lastEnemyHit) {
        (window as any)._lastEnemyHit = data.enemyHitStamp;
        setEnemyFlash(true);
        if (enemyTimeoutRef.current) clearTimeout(enemyTimeoutRef.current);
        enemyTimeoutRef.current = setTimeout(() => setEnemyFlash(false), 150);
      }
    };

    window.addEventListener('update-phaser-hud', handleHUDUpdate);
    return () => window.removeEventListener('update-phaser-hud', handleHUDUpdate);
  }, [gameOverPhase]);

  // Countdown Timer Logic
  useEffect(() => {
      let timer: NodeJS.Timeout;
      if (gameOverPhase === 'countdown' && countdown > 0) {
          timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else if (gameOverPhase === 'countdown' && countdown === 0) {
          handleRestart(); // Auto-restart if time runs out
      }
      return () => clearTimeout(timer);
  }, [gameOverPhase, countdown]);

  const handleRestart = () => {
      setGameOverPhase('none');
      window.dispatchEvent(new Event('request-scene-restart'));
  };

  const handleContinueClick = () => {
      setGameOverPhase('select');
  };

  const handleCharacterSelect = (char: string) => {
      setGameOverPhase('none');
      // Tell Phaser to respawn the player with the chosen character
      window.dispatchEvent(new CustomEvent('request-continue', { detail: { character: char } }));
  };

  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const enemyHealthPct = Math.max(0, Math.min(100, (enemyHealth / enemyMaxHealth) * 100));

  return (
    <>
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none select-none">
        
        {/* LEFT SIDE: PLAYER STATS */}
        <div className="flex gap-4 items-start w-[35%]">
          <div className="relative border-[4px] border-zinc-400 bg-zinc-800 w-24 h-24 overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.8)] shrink-0">
            <img 
              src={`assets/images/portraits/${playerName}.png`} 
              alt={playerName} 
              className="w-full h-full object-cover object-top"
              style={{ imageRendering: 'pixelated' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className={`absolute inset-0 bg-red-600 mix-blend-overlay transition-opacity duration-75 ${playerFlash ? 'opacity-90' : 'opacity-0'}`} />
          </div>

          <div className="flex flex-col flex-grow gap-1 mt-1">
            <h2 className="text-white font-mono text-xl font-bold uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] m-0 leading-none">
              {playerName}
            </h2>
            <div className="h-6 w-full border-[3px] border-zinc-300 bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
              <div className="h-full bg-[#fde047] transition-all duration-200" style={{ width: `${healthPct}%` }} />
            </div>
            <div className="h-3 w-3/4 border-2 border-blue-400 bg-black p-[1px] mt-1 shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
              <div className="h-full bg-[#38bdf8] transition-all duration-300" style={{ width: `${smf}%` }} />
            </div>
          </div>
        </div>

        {/* CENTER: SCORE */}
        <div className="flex flex-col items-center mt-2 w-[20%]">
          <h3 className="text-[#fde047] font-mono text-sm font-bold m-0 tracking-[4px] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
            SCORE
          </h3>
          <div className="text-white font-mono text-4xl font-bold tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
            {score.toString().padStart(6, '0')}
          </div>
        </div>

        {/* RIGHT SIDE: ENEMY STATS */}
        <div className={`flex gap-4 items-start justify-end w-[35%] transition-opacity duration-300 ${enemyName ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex flex-col flex-grow gap-1 mt-1 items-end">
            <h2 className="text-white font-mono text-xl font-bold uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)] m-0 leading-none text-right">
              {enemyName || 'ENEMY'}
            </h2>
            <div className="h-6 w-full border-[3px] border-zinc-300 bg-black p-[2px] shadow-[4px_4px_0_rgba(0,0,0,0.8)] flex justify-end">
              <div className="h-full bg-[#ef4444] transition-all duration-100" style={{ width: `${enemyHealthPct}%` }} />
            </div>
          </div>
          <div className="relative border-[4px] border-zinc-400 bg-zinc-800 w-24 h-24 overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.8)] shrink-0">
            {enemyName && (
              <img 
                src={`assets/images/portraits/${enemyName}.png`} 
                alt={enemyName} 
                className="w-full h-full object-cover object-top"
                style={{ imageRendering: 'pixelated' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className={`absolute inset-0 bg-red-600 mix-blend-overlay transition-opacity duration-75 ${enemyFlash ? 'opacity-90' : 'opacity-0'}`} />
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* GAME OVER & CONTINUE SYSTEM               */}
      {/* ========================================= */}
      {gameOverPhase !== 'none' && (
        <div className="fixed inset-0 z- bg-black/85 backdrop-blur-sm flex justify-center items-center pointer-events-auto">
            
            {/* PHASE 1: COUNTDOWN */}
            {gameOverPhase === 'countdown' && (
                <div className="text-center border-[4px] border-double border-[#ff3333] p-[60px] bg-[#1a0a05] shadow-[0_0_50px_rgba(255,51,51,0.2)] flex flex-col items-center">
                    <h1 className="font-metal text-[clamp(60px,8vw,100px)] text-white drop-shadow-[6px_6px_0px_#ff3333] m-0 mb-[15px] tracking-[4px]">
                        GAME OVER
                    </h1>
                    <div className="font-mono text-[#ff3333] text-[20px] tracking-[4px] mb-[40px]">
                        [SIGNAL LOST // TIMELINE CORRUPTED]
                    </div>
                    
                    <button 
                        onClick={handleContinueClick} 
                        className="bg-[#ff3333] text-black border-none py-[20px] px-[60px] cursor-pointer shadow-[8px_8px_0px_#660000] text-[32px] font-mono font-bold hover:bg-white hover:shadow-[8px_8px_0px_#ff3333] transition-all animate-pulse mb-[20px]"
                    >
                        CONTINUE? {countdown}
                    </button>

                    <button 
                        onClick={handleRestart}
                        className="bg-transparent text-[#ff3333] border-2 border-[#ff3333] py-[10px] px-[30px] mt-[10px] cursor-pointer text-[16px] font-mono font-bold hover:bg-[#ff3333] hover:text-black transition-all"
                    >
                        RETURN TO START
                    </button>
                </div>
            )}

            {/* PHASE 2: CHARACTER SELECT CAROUSEL */}
            {gameOverPhase === 'select' && (
                <div className="text-center border-[4px] border-double border-[#ff3333] p-[60px] bg-[#1a0a05] shadow-[0_0_50px_rgba(255,51,51,0.2)]">
                    <h2 className="font-metal text-[48px] text-white drop-shadow-[4px_4px_0px_#ff3333] m-0 mb-[30px] tracking-[2px]">
                        SELECT OPERATIVE
                    </h2>
                    
                    <div className="flex gap-8 justify-center">
                        {['marko', 'darko', 'maja'].map((char) => (
                            <div 
                                key={char} 
                                onClick={() => handleCharacterSelect(char)}
                                className="group cursor-pointer flex flex-col items-center transition-transform hover:-translate-y-2"
                            >
                                <div className="border-[4px] border-zinc-500 bg-zinc-800 w-32 h-32 overflow-hidden shadow-[6px_6px_0_rgba(0,0,0,0.8)] group-hover:border-[#39ff14] group-hover:shadow-[6px_6px_0_rgba(57,255,20,0.4)] transition-all">
                                    <img 
                                        src={`assets/images/portraits/${char}.png`} 
                                        alt={char} 
                                        className="w-full h-full object-cover object-top"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                                <span className="font-mono text-white text-xl mt-4 font-bold uppercase group-hover:text-[#39ff14] transition-colors">
                                    {char}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </>
  );
};