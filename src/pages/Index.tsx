import React, { useState } from 'react';
import AccessGate from '@/components/AccessGate';
import GameContainer from '@/components/GameContainer';
import { profileService } from '@/game/services/ProfileService';

const Index = () => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);

  const handleAccessGranted = () => {
    setAccessGranted(true);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {!accessGranted ? (
        <AccessGate onAccessGranted={handleAccessGranted} />
      ) : (
        <div className="w-full h-screen">
          <GameContainer
            crtEnabled={crtEnabled}
            onCrtToggle={setCrtEnabled}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
