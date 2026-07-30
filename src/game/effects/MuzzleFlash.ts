import Phaser from 'phaser';

/**
 * MuzzleFlash: A transient visual effect for firearms.
 * Spritesheet: muzzle-flash-m70.png.
 */
export class MuzzleFlash extends Phaser.GameObjects.Sprite {
    constructor(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        flipX: boolean, 
        dynamicDepth: number, 
        isPangMode: boolean = false
    ) {
        super(scene, x, y, 'muzzle-flash-m70');

        scene.add.existing(this);
        
        this.setFlipX(flipX);
        
        // Sync depth directly with the weapon/player so it respects the fake 3D environment
        this.setDepth(dynamicDepth + 1); 
        
        this.setScale(1.2);
        
        // ADD blend mode makes the orange/yellow pixels act like a light source!
        this.setBlendMode(Phaser.BlendModes.ADD); 

        // Point the flash upwards if we are in the Pang vertical shooting mode
        if (isPangMode) {
            this.setAngle(-90);
        }

        // Failsafe: Check if the animation exists before playing it
        if (this.scene.anims.exists('m70_flash_anim')) {
            this.play('m70_flash_anim');
            this.on('animationcomplete', () => {
                this.destroy();
            });
        } else {
            // If the CSV hasn't loaded the animation yet, safely fade it out instead of crashing
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                duration: 80,
                onComplete: () => this.destroy()
            });
        }
    }
}