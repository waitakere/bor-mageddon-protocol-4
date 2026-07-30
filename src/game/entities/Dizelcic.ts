import Phaser from 'phaser';

export class Dizelcic extends Phaser.Physics.Arcade.Sprite {
    public health: number = 80; 
    public maxHealth: number = 80;
    public isDead: boolean = false;
    public isHurt: boolean = false;
    public isKnockedDown: boolean = false;
    public hasBeenKnockedDown: boolean = false;
    public isInvulnerable: boolean = false;
    public skinPrefix: string = 'dizelcic'; 
    
    private isSpraying: boolean = false;
    private sprayCooldown: boolean = false;

    private speed: number = 110;
    private attackRange: number = 150;

    private grunts = ['grunt_m_1', 'grunt_m_2', 'grunt_m_3', 'grunt_m_4'];
    private agonies = ['agony_m_1', 'agony_m_2', 'agony_m_3', 'agony_m_4'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // FIXED: Now correctly extracts a single frame string to prevent a crash
        const texture = scene.textures.get('enemies_1993');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('dizelcic-walk/frame_000')) || allFrames;

        super(scene, x, y, 'enemies_1993', firstFrame);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.7);
        this.setOrigin(0.5, 1);
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(50, 40);
        body.setOffset(103, 216); 
        
        body.setCollideWorldBounds(true);
        body.setAllowGravity(false);

        if (scene.anims.exists('dizelcic-walk')) {
            this.play('dizelcic-walk', true);
        }
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isKnockedDown || this.isSpraying || player.isDead) {
            this.setVelocity(0, 0);
            return;
        }

        const distX = Math.abs(player.x - this.x);
        const distY = Math.abs(player.y - this.y);

        this.setFlipX(player.x < this.x);

        if (distX <= this.attackRange && distY <= 20 && !this.sprayCooldown) {
            this.executeAerosolAttack(player);
        } else {
            const dirX = player.x > this.x ? 1 : -1;
            const dirY = player.y > this.y ? 1 : -1;

            let vx = dirX * this.speed;
            let vy = distY > 15 ? dirY * (this.speed * 0.8) : 0;

            this.setVelocity(vx, vy);
            
            if (this.anims.currentAnim?.key !== 'dizelcic-walk' && this.scene.anims.exists('dizelcic-walk')) {
                this.play('dizelcic-walk', true);
            }
        }
    }

    private executeAerosolAttack(player: any) {
        this.isSpraying = true;
        this.setVelocity(0, 0);
        
        if (this.scene.anims.exists('dizelcic-punch-1')) {
            this.play('dizelcic-punch-1', true); 
        }

        this.scene.time.delayedCall(200, () => {
            if (!this.isDead && !this.isHurt && !this.isKnockedDown) {
                this.spawnMistCloud(player);
            }
        });

        this.once('animationcomplete', (anim: any) => {
            if (anim.key === 'dizelcic-punch-1') {
                this.isSpraying = false;
                this.sprayCooldown = true;
                this.scene.time.delayedCall(2000, () => (this.sprayCooldown = false));
                if (this.scene.anims.exists('dizelcic-walk')) this.play('dizelcic-walk', true);
            }
        });
    }

    private spawnMistCloud(player: any) {
        const xDir = this.flipX ? -1 : 1;
        const impactZone = this.scene.add.zone(this.x + (70 * xDir), this.y - 80, 80, 80);
        this.scene.physics.add.existing(impactZone);

        (this.scene as any).spawnHitEffect(impactZone.x, impactZone.y);

        this.scene.physics.add.overlap(impactZone, player, () => {
            if (!player.isInvulnerable) {
                (this.scene as any).lastEngagedEnemy = this; 
                player.takeDamage(10); 
            }
        });

        this.scene.time.delayedCall(400, () => impactZone.destroy());
    }

    public takeDamage(amount: number) {
        if (this.isDead || this.isInvulnerable) return;
        
        this.health -= amount;
        this.isSpraying = false;
        this.isHurt = true; 

        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => this.clearTint());

        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 70);

        if (this.health <= 0) {
            this.die();
        } else if (this.health <= this.maxHealth * 0.5 && !this.hasBeenKnockedDown) {
            this.takeKnockdown();
        } else {
            (this.scene as any).playSFX(this.grunts);
            if (this.scene.anims.exists('dizelcic-damage')) {
                this.play('dizelcic-damage', true);
            }
            this.x += this.flipX ? 15 : -15; 

            this.scene.time.delayedCall(400, () => {
                if (!this.isDead && !this.isKnockedDown) {
                    this.isHurt = false;
                    if (this.scene.anims.exists('dizelcic-walk')) this.play('dizelcic-walk', true);
                }
            });
        }
    }

    public takeKnockdown() {
        if (this.isDead || this.isKnockedDown) return;

        this.isKnockedDown = true;
        this.isInvulnerable = true; 
        this.hasBeenKnockedDown = true;
        
        this.x += this.flipX ? 40 : -40; 
        (this.scene as any).playSFX(this.agonies);
        
        if (this.scene.anims.exists('dizelcic-knockdown-get-up')) {
             this.play('dizelcic-knockdown-get-up', true);
        } else {
             this.scene.time.delayedCall(1000, () => { this.emit('animationcomplete'); });
        }

        this.once('animationcomplete', () => {
            if (this.health <= 0) return;
            this.isKnockedDown = false;
            this.isInvulnerable = false;
            this.isHurt = false;
            if (this.scene.anims.exists('dizelcic-walk')) this.play('dizelcic-walk', true);
        });
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        (this.scene as any).playSFX(this.agonies);
        (this.scene as any).registerEnemyDeath();

        if (this.scene.anims.exists('dizelcic-dying')) {
            this.play('dizelcic-dying', true);
        }

        this.x += this.flipX ? 30 : -30;

        if (Phaser.Math.Between(1, 100) <= 25) {
            (this.scene as any).dropItem(this.x, this.y);
        }

        this.scene.tweens.add({ targets: this, alpha: 0, y: this.y + 20, duration: 800, delay: 500, onComplete: () => this.destroy() });
    }
}