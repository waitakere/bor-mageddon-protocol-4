import React, { useState } from 'react';

interface AccessGateProps {
  children: React.ReactNode;
}

/**
 * AccessGate: Protects the SDB Archives
 * Wraps the main App to require a terminal password before playing.
 */
export const AccessGate: React.FC<AccessGateProps> = ({ children }) => {
  const [input, setInput] = useState('');
  const [isGranted, setIsGranted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The hidden terminal password
  const CORRECT_PASS = "SMF1993"; 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.toUpperCase() === CORRECT_PASS) {
      setErrorMsg(null);
      setIsGranted(true);
    } else {
      setErrorMsg("PRISTUP ODBIJEN: NEISPRAVNA ŠIFRA.");
      setInput(''); // Clear the input field so they can try again quickly
    }
  };

  // If authenticated, render the actual game/app!
  if (isGranted) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f0a] text-[#39FF14] font-mono p-4 relative overflow-hidden">
      
      {/* 1993 CRT Scanline & Phosphor Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-40 mix-blend-overlay opacity-40"
        style={{
          background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 118, 0.06))",
          backgroundSize: "100% 2px, 3px 100%"
        }}
      />

      <div className="max-w-md w-full border-2 border-zinc-800 p-8 bg-black shadow-[0_0_30px_rgba(57,255,20,0.15)] relative z-10">
        
        {/* Terminal Header */}
        <h1 className="text-2xl mb-1 uppercase tracking-widest border-b border-zinc-800 pb-2">
          SDB: Arhiva 3. Oktobar
        </h1>
        <p className="text-[10px] mb-8 opacity-70 tracking-widest text-zinc-400">
          STATUS: <span className="text-red-500 font-bold">STROGO POVERLJIVO</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2 opacity-80">
              UNESITE ŠIFRU ZA PRISTUP:
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setErrorMsg(null); // Hide error as soon as they start typing again
              }}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 outline-none focus:border-[#39FF14] text-[#39FF14] text-lg tracking-[0.3em] font-bold"
              autoFocus
            />
          </div>

          {/* In-UI Error Message (Replaces the ugly native alert()) */}
          <div className="h-6">
            {errorMsg && (
              <p className="text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                [!] {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#0d2a07] border border-[#1a4a11] hover:bg-[#39FF14] hover:text-black hover:shadow-[0_0_15px_#39FF14] py-3 transition-all uppercase text-sm font-bold tracking-widest"
          >
            Potvrdi Identitet
          </button>
        </form>
      </div>
    </div>
  );
};