import Phaser from 'phaser';

export class Miner extends Phaser.Physics.Arcade.Sprite {
    public health: number = 250; 
    public maxHealth: number = 250;
    public isDead: boolean = false;
    public isHurt: boolean = false; 
    public isKnockedDown: boolean = false;
    public hasBeenKnockedDown: boolean = false;
    public isInvulnerable: boolean = false;
    public skinPrefix: string = 'MINER'; 
    
    private isAttacking: boolean = false;
    private attackCooldown: boolean = false;

    private speed: number = 50; 
    private attackRange: number = 90; 

    private grunts = ['grunt_m_1', 'grunt_m_2', 'grunt_m_3', 'grunt_m_4'];
    private agonies = ['agony_m_1', 'agony_m_2', 'agony_m_3', 'agony_m_4'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('enemies_1993');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('miner-walk/frame_000')) || allFrames;
        
        super(scene, x, y, 'enemies_1993', firstFrame);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.7);
        this.setOrigin(0.5, 1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        
        // FIX: Expanded hitbox significantly to match his visual bulk and make him easier to hit
        body.setSize(160, 220);
        body.setOffset(this.width / 2 - 80, this.height - 220); 
        
        body.setCollideWorldBounds(true);
        body.setAllowGravity(false); 

        if (scene.anims.exists('miner-walk')) {
            this.play('miner-walk', true);
        }
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isKnockedDown || this.isAttacking || player.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        const distX = Math.abs(player.x - this.x);
        const distY = Math.abs(player.y - this.y);

        if (distX > 10) {
            this.setFlipX(player.x < this.x);
        }

        if (distX <= this.attackRange && distY <= 30 && !this.attackCooldown) {
            this.executeHeavyMelee(player);
        } else {
            const dirX = player.x > this.x ? 1 : -1;
            const dirY = player.y > this.y ? 1 : -1;

            let vx = dirX * this.speed;
            let vy = distY > 10 ? dirY * (this.speed * 0.7) : 0;

            this.setVelocity(vx, vy);
            
            if (this.anims.currentAnim?.key !== 'miner-walk' && this.scene.anims.exists('miner-walk')) {
                this.play('miner-walk', true);
            }
        }
    }

    private executeHeavyMelee(player: any) {
        this.isAttacking = true;
        this.setVelocity(0, 0);

        if (this.scene.anims.exists('miner-melee')) {
            this.play('miner-melee', true); 
        }
        
        this.scene.time.delayedCall(400, () => {
            if (this.isDead || this.isHurt || this.isKnockedDown) return;

            const distX = Math.abs(player.x - this.x);
            const distY = Math.abs(player.y - this.y);

            if (distX <= this.attackRange + 15 && distY <= 35) {
                (this.scene as any).lastEngagedEnemy = this; 
                player.takeDamage(35); 
                (this.scene as any).playSFX(['punch_2', 'kick_4']);
                this.scene.cameras.main.shake(200, 0.015);
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isAttacking = false;
            this.attackCooldown = true;
            this.scene.time.delayedCall(3000, () => (this.attackCooldown = false));
            if (this.scene.anims.exists('miner-walk')) this.play('miner-walk', true);
        });
    }

    public takeDamage(amount: number) {
        if (this.isDead || this.isInvulnerable) return;
        
        this.health -= amount;
        
        if (amount >= 20) {
            this.isAttacking = false;
            this.isHurt = true;
        }

        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => this.clearTint());

        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 120); // Raised hit effect visually

        if (this.health <= 0) {
            this.die();
        } else if (this.health <= this.maxHealth * 0.5 && !this.hasBeenKnockedDown) {
            this.takeKnockdown();
        } else {
            (this.scene as any).playSFX(this.grunts);
            if (amount >= 20 && this.scene.anims.exists('miner-damage')) {
                this.play('miner-damage', true);
                this.scene.time.delayedCall(400, () => {
                    if (!this.isDead && !this.isKnockedDown) {
                        this.isHurt = false;
                        if (this.scene.anims.exists('miner-walk')) this.play('miner-walk', true);
                    }
                });
            }
        }
    }

    public takeKnockdown() {
        if (this.isDead || this.isKnockedDown) return;

        this.isKnockedDown = true;
        this.isInvulnerable = true; 
        this.hasBeenKnockedDown = true;
        this.isHurt = true;
        
        (this.scene as any).playSFX(this.agonies);
        
        if (this.scene.anims.exists('miner-knockdown-get-up')) {
             this.play('miner-knockdown-get-up', true);
        } else {
             this.scene.time.delayedCall(1200, () => { this.emit('animationcomplete'); });
        }

        // FIX: Bulletproof delayedCall ensures the state machine never deadlocks 
        // if the animation frame gets interrupted or dropped.
        this.scene.time.delayedCall(2000, () => {
            if (this.health <= 0) return;
            this.isKnockedDown = false;
            this.isInvulnerable = false;
            this.isHurt = false;
            if (this.scene.anims.exists('miner-walk')) this.play('miner-walk', true);
        });

        this.once('animationcomplete', () => {
            if (this.health <= 0) return;
            this.isKnockedDown = false;
            this.isInvulnerable = false;
            this.isHurt = false;
            if (this.scene.anims.exists('miner-walk')) this.play('miner-walk', true);
        });
    }

    protected die() {
        this.isDead = true;
        // Lock invincibility on death to prevent overlapping attacks running damage logic
        this.isInvulnerable = true; 
        this.isHurt = false;
        
        this.setVelocity(0, 0);
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        (this.scene as any).playSFX(this.agonies);
        (this.scene as any).registerEnemyDeath();

        if (this.scene.anims.exists('miner-dying')) {
            this.play('miner-dying', true);
        }

        this.once('animationcomplete', () => {
            this.scene.tweens.add({
                targets: this,
                alpha: 0,           
                y: this.y + 50,      
                duration: 2500,     
                onComplete: () => {
                    if (Phaser.Math.Between(1, 100) <= 80) {
                        (this.scene as any).dropItem(this.x, this.y - 50);
                    }
                    this.destroy(); 
                }
            });
        });
    }
}