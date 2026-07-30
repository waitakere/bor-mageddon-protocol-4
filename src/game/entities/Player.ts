import Phaser from 'phaser';
import { CHARACTER_STATS } from '../config/CharacterStats';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public characterName: string;
    
    // Core Stats (Pulled dynamically to avoid hardcoding)
    public health: number;
    public maxHealth: number;
    public smfMeter: number = 0;
    public speed: number;

    // State Flags
    public isAttacking: boolean = false;
    public isJumping: boolean = false;
    public isInvulnerable: boolean = false;
    public facingRight: boolean = true;

    // Weapon State
    public ammo: number = 5; 
    public hasGun: boolean = true;

    constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
        super(scene, x, y, `${name}_idle`);
        this.characterName = name;

        // Load stats dynamically from your central config
        const stats = CHARACTER_STATS[name as keyof typeof CHARACTER_STATS] || CHARACTER_STATS.default;
        this.maxHealth = stats.maxHealth;
        this.health = stats.maxHealth;
        this.speed = stats.baseSpeed;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(80, 40); 
        body.setOffset(88, 210);
        this.setOrigin(0.5, 1);
        
        body.setAllowGravity(false); 
        body.setCollideWorldBounds(true);

        // Initial HUD Broadcast
        this.broadcastHUDUpdate();
    }

    update() {
        if (this.health <= 0) return;
        
        this.handleMovement();
        this.handleCombatInput();
        
        if (this.isInvulnerable) {
            this.alpha = Math.sin(this.scene.time.now * 0.02) * 0.5 + 0.5;
        } else {
            this.alpha = 1;
        }
    }

    // ... [Keep your exact handleMovement, handleCombatInput, executeJump, executeRangedAttack, executeWeaponThrow, and executeMelee methods here] ...

    // --- VIRTUAL METHODS FOR SUBCLASSES ---
    protected executeSpecial() { /* Overridden by subclasses */ }
    protected executeFinisher() { /* Overridden by subclasses */ }

    // --- DAMAGE LOGIC & REACT BRIDGE ---
    public takeDamage(amount: number) {
        if (this.isInvulnerable || this.health <= 0) return;

        this.health = Math.max(0, this.health - amount);
        this.isInvulnerable = true;
        this.isAttacking = false; 

        this.play(`${this.characterName}_damage_&_hurt`, true);
        
        // Broadcast damage to React HUD
        this.broadcastHUDUpdate(Date.now());

        if (this.health <= 0) {
            this.die();
            return;
        }

        this.scene.time.delayedCall(400, () => { 
            if (this.health > 0) {
                const idleAnim = this.hasGun ? 'shoot_idle' : 'idle';
                this.play(`${this.characterName}_${idleAnim}`, true);
            }
        });

        this.scene.time.delayedCall(1500, () => { 
            this.isInvulnerable = false; 
        });
    }

    private die() {
        this.play(`${this.characterName}_death`, true);
        // The HUD update already sends health: 0, which triggers the Game Over screen
    }

    public get isDead(): boolean {
        return this.health <= 0;
    }

    /**
     * Bridges Phaser physics variables directly to your React GameHUD
     */
    private broadcastHUDUpdate(hitTimestamp?: number) {
        window.dispatchEvent(new CustomEvent('update-phaser-hud', {
            detail: {
                health: this.health,
                maxHealth: this.maxHealth,
                smf: this.smfMeter,
                score: this.scene.registry.get('score') || 0,
                playerName: this.characterName,
                playerHitStamp: hitTimestamp
            }
        }));
    }
}