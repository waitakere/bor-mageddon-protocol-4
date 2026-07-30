import Phaser from 'phaser';

export class MUP extends Phaser.Physics.Arcade.Sprite {
    public health: number = 100;
    public isDead: boolean = false;
    public isAttacking: boolean = false;
    public isHurt: boolean = false; // Stun-lock flag
    public skinPrefix: string = 'mup'; // For HUD portrait
    
    private speed: number = 80;
    private attackRange: number = 70;
    private attackCooldown: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemies_1993', 'mup-idle/frame_000.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setOrigin(0.5, 1);
        this.setScale(1.7);
        
        if (this.body) {
            this.body.setSize(50, 30);
            this.body.setOffset(this.width/2 - 25, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isAttacking || player.isDead) return;
        this.setAngle(0);

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (dist > this.attackRange) {
            this.scene.physics.moveToObject(this, player, this.speed);
            this.setFlipX(player.x < this.x);
            if (this.scene.anims.exists('mup-walk')) {
                this.play('mup-walk', true);
            }
        } else {
            this.setVelocity(0, 0);
            if (!this.attackCooldown) {
                this.executeAttack(player);
            } else {
                if (this.scene.anims.exists('mup-idle')) this.play('mup-idle', true);
            }
        }
    }

    private executeAttack(player: any) {
        this.isAttacking = true;
        this.setFlipX(player.x < this.x);

        const attackAnim = 'mup-punch-1';
        (this.scene as any).playSFX(['melee_1', 'melee_2']);

        const hitCheck = () => {
            this.isAttacking = false;
            this.triggerCooldown();
            if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.attackRange + 20) {
                if (player.takeDamage) {
                    (this.scene as any).lastEngagedEnemy = this; // Lock to HUD
                    player.takeDamage(10);
                    (this.scene as any).playSFX(['punch_2', 'kick_1']);
                }
            }
        };

        if (this.scene.anims.exists(attackAnim)) {
            this.play(attackAnim, true);
            this.once('animationcomplete', hitCheck);
        } else {
            this.scene.time.delayedCall(400, hitCheck);
        }
    }

    private triggerCooldown() {
        this.attackCooldown = true;
        this.scene.time.delayedCall(1200, () => { this.attackCooldown = false; });
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        
        this.health -= amount;
        this.isAttacking = false; 
        this.isHurt = true; // Trigger stun-lock
        this.setVelocity(0, 0);

        // --- HUD FLASH TRIGGER ---
        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 50);
        (this.scene as any).playSFX(['agony_m_1', 'agony_m_2', 'agony_m_3']);

        if (this.health <= 0) {
            this.isDead = true;
            this.isHurt = false;
            (this.scene as any).registerEnemyDeath();
            (this.scene as any).dropItem(this.x, this.y);

            (this.scene as any).playSFX(['Break_1', 'Break_2']);

            if (this.scene.anims.exists('mup-dying')) {
                this.play('mup-dying', true);
                this.once('animationcomplete', () => {
                    this.scene.tweens.add({ targets: this, alpha: 0, y: this.y + 20, duration: 800, onComplete: () => this.destroy() });
                });
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(300, () => this.destroy());
            }
        } else {
            if (this.scene.anims.exists('mup-damage')) {
                this.play('mup-damage', true);
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(150, () => this.clearTint());
            }
            
            // Release stun-lock after 400ms
            this.scene.time.delayedCall(400, () => {
                if (!this.isDead) this.isHurt = false;
            });
        }
    }
}