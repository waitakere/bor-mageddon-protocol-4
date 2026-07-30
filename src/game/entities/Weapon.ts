import Phaser from 'phaser';

export interface WeaponConfig {
    name: string;
    maxAmmo: number;
    fireRate: number;        // ms between shots
    projectileSpeed: number;
    muzzleFlashOffset: { x: number; y: number }; // Where the flash spawns relative to the player
    damage: number;
}

export const WEAPON_PRESETS: Record<string, WeaponConfig> = {
    m70_assault_rifle: {
        name: 'M70',
        maxAmmo: 5,           // Per your PRD: 5 uses before empty
        fireRate: 250,        // Fast burst
        projectileSpeed: 1200, // High velocity
        muzzleFlashOffset: { x: 110, y: -125 }, // Aligned with the tip of the rifle in Marko's sprite
        damage: 45,
    },
    zastava_shotgun: {
        name: 'Pump-Action',
        maxAmmo: 3,
        fireRate: 800,
        projectileSpeed: 800,
        muzzleFlashOffset: { x: 100, y: -110 },
        damage: 80, // High damage, slow fire rate
    },
};

/**
 * Logic handler for firearms.
 * This class DOES NOT render a sprite itself. It tracks ammo, cooldowns, 
 * and emits events to spawn bullets and muzzle flashes based on the Player's position.
 */
export class Weapon {
    private scene: Phaser.Scene;
    private config: WeaponConfig;
    private currentAmmo: number;
    private canFire: boolean = true;
    private muzzleFlash: Phaser.GameObjects.Sprite | null = null;

    constructor(scene: Phaser.Scene, configKey: string = 'm70_assault_rifle') {
        this.scene = scene;
        
        // Fallback to M70 if an invalid key is provided
        this.config = WEAPON_PRESETS[configKey] || WEAPON_PRESETS['m70_assault_rifle'];
        this.currentAmmo = this.config.maxAmmo;
    }

    /**
     * Attempts to fire the weapon.
     * Returns true if successful, false if empty or on cooldown.
     */
    public fire(x: number, y: number, facingRight: boolean, isPangMode: boolean = false): boolean {
        if (!this.canFire || this.currentAmmo <= 0) {
            return false;
        }

        this.currentAmmo--;
        this.canFire = false;

        const dirMult = facingRight ? 1 : -1;
        
        // Calculate where the muzzle flash and bullet should spawn
        let spawnX = x;
        let spawnY = y;

        if (isPangMode) {
            // Shooting straight up
            spawnX = x + (10 * dirMult); 
            spawnY = y - 180; 
        } else {
            // Standard horizontal shooting
            spawnX = x + (this.config.muzzleFlashOffset.x * dirMult);
            spawnY = y + this.config.muzzleFlashOffset.y;
        }

        this.spawnMuzzleFlash(spawnX, spawnY, facingRight, isPangMode);

        // Tell MainLevel.ts to physically create the bullet
        // FIXED: Direction is now a pure number to match Projectile.ts requirements
        this.scene.events.emit('spawn-projectile', {
            x: spawnX,
            y: spawnY,
            direction: dirMult, 
            type: 'BULLET'
        });

        // Kinetic Feedback
        this.scene.cameras.main.shake(120, 0.01);

        // Enforce Fire Rate Cooldown
        this.scene.time.delayedCall(this.config.fireRate, () => {
            this.canFire = true;
        });

        return true;
    }

    /**
     * Creates a brief, bright visual effect at the barrel tip.
     */
    private spawnMuzzleFlash(x: number, y: number, facingRight: boolean, isPangMode: boolean): void {
        if (this.muzzleFlash) {
            this.muzzleFlash.destroy();
        }

        // Assuming you have 'muzzle_flash' loaded in BootScene
        this.muzzleFlash = this.scene.add.sprite(x, y, 'muzzle_flash');
        
        if (this.muzzleFlash.texture.key !== '__MISSING') {
            this.muzzleFlash.setFlipX(!facingRight);
            if (isPangMode) this.muzzleFlash.setAngle(-90);
            
            // Sync depth with the player
            this.muzzleFlash.setDepth(y + 1);
            
            // Play animation if it exists, otherwise just fade it out
            if (this.scene.anims.exists('flash_anim')) {
                this.muzzleFlash.play('flash_anim');
                this.muzzleFlash.on('animationcomplete', () => {
                    this.muzzleFlash?.destroy();
                    this.muzzleFlash = null;
                });
            } else {
                // Fallback fade out if animation isn't registered
                this.scene.tweens.add({
                    targets: this.muzzleFlash,
                    alpha: 0,
                    duration: 80,
                    onComplete: () => {
                        this.muzzleFlash?.destroy();
                        this.muzzleFlash = null;
                    }
                });
            }
        }
    }

    public isEmpty(): boolean {
        return this.currentAmmo <= 0;
    }

    public getAmmo(): number {
        return this.currentAmmo;
    }

    public getMaxAmmo(): number {
        return this.config.maxAmmo;
    }

    public getName(): string {
        return this.config.name;
    }

    public destroy(): void {
        this.muzzleFlash?.destroy();
    }
}