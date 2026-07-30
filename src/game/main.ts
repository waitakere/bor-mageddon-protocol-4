import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainLevel } from './scenes/MainLevel';

/**
 * BOR-MAGEDDON 1993: Core Engine Configuration
 * Industrial Belt-Scroller System Configured.
 */
export const GameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    // Note: The 'parent' property is intentionally omitted here.
    // React's GameContainer.tsx will dynamically assign the parent div when it mounts.
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // Y gravity is 0 for the top-down/belt-scroller perspective
            debug: false             // Change to true if you need to see hitboxes
        }
    },
    scale: {
        mode: Phaser.Scale.FIT, // Ensures the 1080p game scales correctly on smaller monitors
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // REMOVED UIScene FROM HERE!
    scene: [BootScene, MainLevel], 
    pixelArt: true,       // Crucial for 16-bit Yugoslav sprites; prevents blurriness
    roundPixels: true,    // Prevents sub-pixel rendering tearing on moving sprites
    backgroundColor: '#050505' // Base industrial void behind the parallax layers
};