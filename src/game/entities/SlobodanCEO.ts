import Phaser from 'phaser';

export class SlobodanCEO extends Phaser.Physics.Arcade.Sprite {
    public health: number = 500;
    private maxHealth: number = 500;
    public isDead: boolean = false;
    public isHurt: boolean = false; 
    public isKnockedDown: boolean = false;
    public isInvulnerable: boolean = false;
    private isAttacking: boolean = false;
    public skinPrefix: string = 'slobodan'; 
    
    public headHitbox!: Phaser.GameObjects.Zone;
    public torsoHitbox!: Phaser.GameObjects.Zone;
    private currentDamageZone: 'head' | 'torso' = 'torso';

    private isPhaseTwo: boolean = false;
    private jumpTimer: number = 0;

    private grunts = ['grunt_m_1', 'grunt_m_2', 'grunt_m_3', 'grunt_m_4'];
    private agonies = ['agony_m_1', 'agony_m_2', 'agony_m_3', 'agony_m_4'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('enemies_1993');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('slobodan-walk/frame_000')) || allFrames;

        super(scene, x, y, 'enemies_1993', firstFrame);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2.1); 
        this.setOrigin(0.5, 1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        
        body.setSize(120, 220);
        body.setOffset(this.width/2 - 60, this.height - 220);
        body.setAllowGravity(false);

        this.createBossHitboxes();
        
        if (scene.anims.exists('slobodan-walk')) {
            this.play('slobodan-walk', true);
        }
    }

    private createBossHitboxes() {
        this.headHitbox = this.scene.add.zone(this.x, this.y - 200, 80, 60);
        this.torsoHitbox = this.scene.add.zone(this.x, this.y - 100, 140, 120);

        this.scene.physics.add.existing(this.headHitbox);
        this.scene.physics.add.existing(this.torsoHitbox);
    }

    public updateAI(player: any) {
        if (this.isDead || this.isHurt || this.isKnockedDown || this.isAttacking || player.isDead) return;

        this.headHitbox.setPosition(this.x, this.y - 200);
        this.torsoHitbox.setPosition(this.x, this.y - 100);

        if (this.health < (this.maxHealth * 0.5) && !this.isPhaseTwo) {
            this.triggerPhaseTwo();
            return;
        }

        this.handleBossCombat(player);
    }

    private handleBossCombat(player: any) {
        const speed = this.isPhaseTwo ? 220 : 140; 
        
        const distX = player.x - this.x;
        const distY = player.y - this.y;

        this.setFlipX(distX < 0);

        if (Math.abs(distX) < 200 && Math.abs(distY) < 40 && !this.isAttacking) {
            if (Phaser.Math.Between(0, 100) > 40) {
                this.executeRegularSwipe(player);
            } else {
                this.executeAuditHammer(player);
            }
        } 
        else if (this.scene.time.now > this.jumpTimer && !this.isAttacking) {
            this.jumpTimer = this.scene.time.now + (this.isPhaseTwo ? 4000 : 5500);
        }
        else if (!this.isAttacking) {
            const dirX = distX > 0 ? 1 : -1;
            const dirY = distY > 0 ? 1 : -1;

            let vx = dirX * speed;
            let vy = Math.abs(distY) > 10 ? dirY * (speed * 0.6) : 0;

            this.setVelocity(vx, vy);

            const anim = this.scene.anims.exists('slobodan-run') && this.isPhaseTwo ? 'slobodan-run' : 'slobodan-walk';
            if (this.anims.currentAnim?.key !== anim && this.scene.anims.exists(anim)) {
                this.play(anim, true);
            }
        }
    }

    private executeRegularSwipe(player: any) {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        
        if (this.scene.anims.exists('slobodan-punch-1')) {
            this.play('slobodan-punch-1', true);
        }

        this.scene.time.delayedCall(300, () => {
            if (this.isDead || this.isHurt || this.isKnockedDown) return;

            const distX = Math.abs(player.x - this.x);
            const distY = Math.abs(player.y - this.y);

            if (distX < 220 && distY < 40) {
                (this.scene as any).lastEngagedEnemy = this; 
                player.takeDamage(22); 
                (this.scene as any).spawnHitEffect(player.x, player.y - 80);
                (this.scene as any).playSFX(['punch_1', 'punch_2']);
                this.scene.cameras.main.shake(150, 0.007);
            }
        });

        this.scene.time.delayedCall(800, () => {
            this.isAttacking = false;
            if (this.scene.anims.exists('slobodan-walk')) this.play('slobodan-walk', true);
        });
    }

    private executeAuditHammer(player: any) {
        this.isAttacking = true;
        this.setVelocity(0, 0); 
        
        if (this.scene.anims.exists('slobodan-punch-2')) {
            this.play('slobodan-punch-2', true); 
        }

        this.scene.time.delayedCall(500, () => {
            if (this.isDead || this.isHurt || this.isKnockedDown) return;
            this.triggerShockwaveImpact(player);
        });

        this.scene.time.delayedCall(1000, () => {
            this.isAttacking = false;
            if (this.scene.anims.exists('slobodan-walk')) this.play('slobodan-walk', true);
        });
    }

    private triggerShockwaveImpact(player: any) {
        this.scene.cameras.main.shake(600, 0.025);

        const distX = Math.abs(player.x - this.x);
        const distY = Math.abs(player.y - this.y);

        if (distX < 250 && distY < 80) {
            (this.scene as any).lastEngagedEnemy = this; 
            player.takeDamage(45); 
            (this.scene as any).playSFX(['punch_3', 'punch_4']);
            (this.scene as any).spawnHitEffect(player.x, player.y);
        }
    }
    
    public setDamageZone(zone: 'head' | 'torso') {
        this.currentDamageZone = zone;
    }

    public takeDamage(amount: number) {
        if (this.isDead || this.isInvulnerable) return;
        this.isHurt = true; 
        this.isAttacking = false;
        this.setVelocity(0, 0);

        const multiplier = this.currentDamageZone === 'head' ? 3 : 1;
        this.health -= (amount * multiplier); 
        this.currentDamageZone = 'torso';

        (this.scene as any).lastEngagedEnemy = this;
        (this.scene as any).lastEnemyHitTime = Date.now();
        (this.scene as any).updateReactHUD();

        (this.scene as any).spawnHitEffect(this.x, this.y - 150);

        if (this.health <= 0) {
            this.die(); 
        } else {
            (this.scene as any).playSFX(this.grunts);
            if (this.scene.anims.exists('slobodan-damage')) {
                this.play('slobodan-damage', true);
            } else {
                this.setTint(0xffffff);
                this.scene.time.delayedCall(100, () => this.clearTint());
            }

            this.scene.time.delayedCall(400, () => {
                if (!this.isDead && !this.isKnockedDown) {
                    this.isHurt = false;
                    const anim = this.scene.anims.exists('slobodan-run') && this.isPhaseTwo ? 'slobodan-run' : 'slobodan-walk';
                    if (this.scene.anims.exists(anim)) this.play(anim, true);
                }
            });
        }
    }

    private triggerPhaseTwo() {
        this.isPhaseTwo = true;
        this.isKnockedDown = true;
        this.isInvulnerable = true;
        this.isHurt = true;
        
        (this.scene as any).playSFX(this.agonies);

        if (this.scene.anims.exists('slobodan-knockdown-get-up')) {
             this.play('slobodan-knockdown-get-up', true);
        } else {
             this.scene.time.delayedCall(1000, () => { this.emit('animationcomplete'); });
        }

        this.once('animationcomplete', () => {
            this.isKnockedDown = false;
            this.isInvulnerable = false;
            this.isHurt = false;
            this.setTint(0xff5555); 
            if (this.scene.anims.exists('slobodan-run')) this.play('slobodan-run', true);
        });
    }

    protected die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
        this.headHitbox.destroy();
        this.torsoHitbox.destroy();
        
        (this.scene as any).playSFX(this.agonies);
        (this.scene as any).registerEnemyDeath();

        if (this.scene.anims.exists('slobodan-dying')) {
            this.play('slobodan-dying', true);
        }

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            y: this.y + 60,
            duration: 3500,
            delay: 2000,
            onComplete: () => {
                this.scene.events.emit('boss-defeated');
                this.destroy();
            }
        });
    }
}