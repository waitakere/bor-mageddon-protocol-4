import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainLevel } from './scenes/MainLevel';

export const GameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container', // This tells Phaser to inject the game into your React div
    width: 1920,
    height: 1080,
    physics: {
        default: 'arcade',
        arcade: {
            // We use 0 gravity because belt-scrollers use fake 3D depth, not real falling!
            gravity: { y: 0, x: 0 }, 
            // PRO TIP: Change this to 'true' if you want to see the invisible hitboxes!
            debug: false 
        }
    },
    // The order matters here! BootScene loads the assets, then launches MainLevel
    scene: [BootScene, MainLevel],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true, // Prevents your 1993 sprites from looking blurry!
};
