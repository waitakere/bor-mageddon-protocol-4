import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
    public damage: number;
    public isThrownWeapon: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, key: string, direction: number, damage: number, isThrownWeapon: boolean = false) {
        super(scene, x, y, key);
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.damage = damage;
        this.isThrownWeapon = isThrownWeapon;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (isThrownWeapon) {
            // Spinning thrown weapon (axe, bat, m70)
            if (key === 'M70-FINAL rev') this.setScale(0.3);
            else this.setScale(0.8);
            
            this.setVelocityX(800 * direction);
            
            // 16-bit rotation feel and arc gravity
            body.setAngularVelocity(600); 
            body.setAccelerationY(600); 
        } else {
            // Standard Bullet
            this.setScale(1.5);
            this.setFlipX(direction < 0);
            this.setVelocityX(1500 * direction);
            body.setAllowGravity(false);
        }
    }

    /**
     * preUpdate runs automatically every frame for Phaser Sprites.
     * We use this to safely clean up projectiles that fly off the screen.
     */
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        // If the projectile flies out of bounds, delete it from memory
        const { width, height } = this.scene.cameras.main;
        const camScrollX = this.scene.cameras.main.scrollX;
        
        if (this.x < camScrollX - 100 || this.x > camScrollX + width + 100 || this.y > height + 100) {
            this.destroy();
        }
    }

    public hit() {
        // Trigger the global gore system in the main scene (carried over from your old code!)
        if (this.isThrownWeapon) {
            this.scene.events.emit('spawn-gore', {
                x: this.x,
                y: this.y,
                type: 'BUREAUCRATIC' 
            });
        }
        
        this.destroy();
    }
}