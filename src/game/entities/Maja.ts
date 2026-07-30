import Phaser from 'phaser';
import { CHARACTER_STATS } from '../config/CharacterStats';

export class Maja extends Phaser.Physics.Arcade.Sprite {

    public health: number = CHARACTER_STATS.maja_1993.maxHealth;
    public maxHealth: number = CHARACTER_STATS.maja_1993.maxHealth;
    public smfMeter: number = 0;
    public characterName: string = 'maja';
    public damageMultiplier: number = CHARACTER_STATS.maja_1993.hitDamage / 12;
    
    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;
    
    public equippedWeapon: string | null = null;
    public weaponDurability: number = 0;
    public weaponHitsTaken: number = 0;
    private weaponSprite: Phaser.GameObjects.Sprite | null = null;
    
    private weaponOffsets: Record<string, { x: number, y: number, angle: number }> = {
        'idle': { x: 35, y: -130, angle: 10 },
        'walk': { x: 40, y: -135, angle: 15 },
        'run': { x: 50, y: -130, angle: 25 },
        'jump': { x: 10, y: -220, angle: -10 },
        'shoot': { x: 30, y: -220, angle: 0 }
    };
    
    private currentVoice: any = null;
    private walkSpeed: number = CHARACTER_STATS.maja_1993.baseSpeed;
    private runSpeed: number = CHARACTER_STATS.maja_1993.runSpeed;
    private jumpVelocityX: number = 0;
    
    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    // --- COMBO STATE (3-hit: punch → punch → combo finisher) ---
    private lastPunchTime: number = 0;
    private comboCounter: number = 0;
    
    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8'];
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4'];
    private grunts = ['grunt_f_1', 'grunt_f_2', 'grunt_f_3', 'grunt_f_4'];
    private agonies = ['agony_f_1', 'agony_f_2'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('maja');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('maja-idle')) || allFrames;
        
        super(scene, x, y, 'maja', firstFrame);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        this.setScale(1.7);
        
        if (this.body) {
            this.body.setSize(60, 30);
            this.body.setOffset(this.width / 2 - 30, this.height - 30);
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false);
        }
        
        this.createAnimations();
    }

    private safeCall(methodName: string, ...args: any[]) {
        if (this.scene && typeof (this.scene as any)[methodName] === 'function') {
            return (this.scene as any)[methodName](...args);
        }
        return null;
    }

    private createAnimations() {
        const anims = this.scene.anims;
        if (anims.exists(`${this.characterName}-idle`)) return;
        
        const texture = this.scene.textures.get(this.characterName);
        if (!texture || texture.key === '__MISSING') return;
        
        const allFrames = texture.getFrameNames();
        
        const animTypes = [
            'idle', 'walk', 'run', 'jump', 'punch-1', 'punch-2', 'kick-1', 'kick-2',
            'melee', 'jump-punch', 'jump-kick', 'special-attack', 'finish-move',
            'throw', 'damage', 'knockdown-get-up', 'dying', 'pick-up',
            'shoot', 'shoot-recoil', 'shoot-up', 'shoot-with-rifle', 'walk-rifle'
        ];

        animTypes.forEach(animType => {
            const animKey = `${this.characterName}-${animType}`;
            if (anims.exists(animKey)) return;
            
            const searchStr = `${animKey}/frame_`;
            const matchingFrames = allFrames.filter(f => f.includes(searchStr)).sort();
            
            if (matchingFrames.length > 0) {
                let fps = 15;
                if (animType === 'idle') fps = 6;
                else if (animType === 'walk' || animType === 'walk-rifle') fps = 12;
                else if (animType === 'run') fps = 18;
                else if (animType === 'jump') fps = 8;
                
                const frameConfig = matchingFrames.map(f => {
                    return { key: this.characterName, frame: f };
                });
                
                if (animType === 'finish-move' && frameConfig.length > 0) {
                    const lastFrame = frameConfig[frameConfig.length - 1];
                    for (let i = 0; i < 8; i++) {
                        frameConfig.push(lastFrame);
                    }
                }
                
                anims.create({
                    key: animKey,
                    frames: frameConfig,
                    frameRate: fps,
                    repeat: (animType === 'idle' || animType === 'walk' || animType === 'run') ? -1 : 0
                });
            }
        });

        // ─── COMBO ANIMATION (PUNCH-PUNCH-PUNCH-KICK FINISHER) ─────
        // Frames 000:      ready stance
        // Frame  001:      first punch windup
        // Frame  002:      1ST PUNCH IMPACT (right arm) — held
        // Frame  003:      return / transition
        // Frame  004:      2ND PUNCH IMPACT (left arm) — held
        // Frame  005:      return / transition
        // Frame  006:      3RD PUNCH IMPACT (right arm, grin) — held
        // Frame  007:      return / transition to kick
        // Frame  008:      kick windup (knee lift)
        // Frame  009:      KICK IMPACT — held longest, camera shake
        // Frame  010:      kick follow-through
        // Frame  011:      recovery
        // ─────────────────────────────────────────────────────────────
        const comboKey = `${this.characterName}-punch-combo`;
        if (!anims.exists(comboKey)) {
            const comboFramesInAtlas = allFrames.filter(f => f.includes('punch-combo'));

            if (comboFramesInAtlas.length > 0) {
                const frameSequence: { num: string, duration?: number }[] = [
                    { num: '000' },                 // Ready stance
                    { num: '001' },                 // 1st punch windup
                    { num: '002', duration: 120 },  // 1ST PUNCH IMPACT (right) — hold
                    { num: '003' },                 // return
                    { num: '004', duration: 120 },  // 2ND PUNCH IMPACT (left) — hold
                    { num: '005' },                 // return
                    { num: '006', duration: 130 },  // 3RD PUNCH IMPACT (right, grin) — hold
                    { num: '007' },                 // transition to kick
                    { num: '008' },                 // kick windup (knee lift)
                    { num: '009', duration: 200 },  // KICK IMPACT — held longest
                    { num: '010' },                 // kick follow-through
                    { num: '011', duration: 120 },  // recovery
                ];

                const frames = frameSequence
                    .map(f => {
                        const frameName = `${this.characterName}-punch-combo/frame_${f.num}.png`;
                        if (!comboFramesInAtlas.includes(frameName)) return null;
                        return {
                            key: this.characterName,
                            frame: frameName,
                            duration: f.duration
                        };
                    })
                    .filter(f => f !== null) as Phaser.Types.Animations.AnimationFrameConfig[];

                if (frames.length > 0) {
                    anims.create({
                        key: comboKey,
                        frames: frames,
                        frameRate: 18,
                        repeat: 0
                    });
                }
            }
        }
    }

    public equipWeapon(weaponKey: string) {
        if (this.weaponSprite) this.weaponSprite.destroy();
        this.equippedWeapon = weaponKey;
        this.weaponHitsTaken = 0;
        
        if (weaponKey === 'M70-FINAL rev') {
            this.weaponDurability = 5;
            this.weaponSprite = null;
        } else {
            this.weaponDurability = 5;
            this.weaponSprite = this.scene.add.sprite(this.x, this.y, weaponKey);
            (this.weaponSprite as any).isWeaponSprite = true;
            this.weaponSprite.setScale(1.3);
            this.weaponSprite.setOrigin(0.5, 0.8);
        }
    }

    private dropAndFadeWeapon() {
        if (!this.equippedWeapon) return;
        
        const drop = this.scene.add.sprite(this.x, this.y - 250, this.equippedWeapon);
        if (this.equippedWeapon === 'M70-FINAL rev') drop.setScale(1.0);
        else drop.setScale(1.3);
        
        drop.setFlipX(this.flipX);
        
        this.scene.tweens.add({
            targets: drop,
            y: this.y - 20,
            x: this.x + (this.flipX ? -80 : 80),
            angle: this.flipX ? -90 : 90,
            duration: 500,
            ease: 'Bounce.easeOut'
        });
        
        this.scene.tweens.add({
            targets: drop,
            alpha: 0,
            duration: 500,
            delay: 1500,
            onComplete: () => drop.destroy()
        });
        
        this.equippedWeapon = null;
        if (this.weaponSprite) {
            this.weaponSprite.destroy();
            this.weaponSprite = null;
        }
    }

    private positionWeaponSprite() {
        if (!this.weaponSprite || !this.equippedWeapon) return;
        
        this.weaponSprite.visible = true;
        
        const currentAnimKey = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle';
        const currentFrameName = this.frame.name;
        const dirX = this.flipX ? -1 : 1;
        const jumpVisualOffset = this.height - this.displayOriginY;
        
        let targetX = this.x;
        let targetY = this.y + jumpVisualOffset;
        let targetAngle = 0;
        let targetDepth = this.depth + 1;
        
        if (['kick-2', 'special-attack', 'finish-move', 'jump-punch', 'jump-kick'].includes(currentAnimKey) || currentFrameName.includes('pick-up')) {
            this.weaponSprite.visible = false;
            return;
        }

        if (currentAnimKey === 'walk') {
            if (currentFrameName.includes('001') || currentFrameName.includes('002') || currentFrameName.includes('003')) {
                targetX += (20 * dirX); targetY -= 220; targetAngle = 25 * dirX;
            } else if (currentFrameName.includes('005') || currentFrameName.includes('006') || currentFrameName.includes('007')) {
                targetX += (-5 * dirX); targetY -= 220; targetAngle = -10 * dirX;
            } else {
                targetX += (10 * dirX); targetY -= 220; targetAngle = 5 * dirX;
            }
        } else {
            const offset = this.weaponOffsets[currentAnimKey] || this.weaponOffsets['idle'];
            targetX += (offset.x * dirX);
            targetY += offset.y;
            targetAngle = offset.angle * dirX;
            targetDepth = this.depth + 1;
        }
        
        this.weaponSprite.setPosition(targetX, targetY);
        this.weaponSprite.setAngle(targetAngle);
        this.weaponSprite.setFlipX(this.flipX);
        this.weaponSprite.setDepth(targetDepth);
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;
        
        const dirX = this.flipX ? -1 : 1;
        this.safeCall('spawnProjectile', this.y, this.x + (20 * dirX), this.y - 120, this.equippedWeapon, dirX, 50, true);
        
        this.equippedWeapon = null;
        if (this.weaponSprite) {
            this.weaponSprite.destroy();
            this.weaponSprite = null;
        }
    }

    private executeWeaponAttack() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        
        if (this.equippedWeapon === 'M70-FINAL rev') {
            if (this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) {
                this.play(`${this.characterName}-shoot-with-rifle`, true);
            } else if (this.scene.anims.exists(`${this.characterName}-shoot`)) {
                this.play(`${this.characterName}-shoot`, true);
            }
            
            const dirX = this.flipX ? -1 : 1;
            this.safeCall('playSFX', 'gun-shot-m70', 1.0);
            
            const spawnX = this.x + (180 * dirX);
            const flashX = this.x + (200 * dirX);
            const spawnY = this.y - 270;
            
            this.safeCall('spawnProjectile', this.y, spawnX, spawnY, 'bullet', dirX, 60, false);
            
            const flash = this.scene.add.sprite(flashX, spawnY, 'muzzle-flash-m70');
            flash.setDepth(9999);
            flash.setFlipX(this.flipX);
            flash.setScale(1.2);
            flash.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
            this.scene.cameras.main.shake(100, 0.01);
            
            this.weaponDurability--;
            if (this.weaponDurability <= 0) {
                this.scene.time.delayedCall(150, () => {
                    this.dropAndFadeWeapon();
                    this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
                });
            } else {
                this.scene.time.delayedCall(300, () => { this.isAttacking = false; });
            }
        } else {
            this.weaponDurability--;
            if (this.weaponDurability <= 0) {
                this.scene.time.delayedCall(100, () => this.dropAndFadeWeapon());
                this.play(`${this.characterName}-punch-2`, true);
                this.once('animationcomplete', () => { this.isAttacking = false; });
                return;
            }
            
            const animToPlay = this.scene.anims.exists(`${this.characterName}-melee`) ? `${this.characterName}-melee` : `${this.characterName}-punch-2`;
            this.play(animToPlay, true);
            
            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 60, 160, 100);
            this.scene.physics.add.existing(hitZone);
            
            let hasHit = false;
            const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
            
            this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => {
                const yTol = target.isBreakable ? 140 : 60;
                if (Math.abs(this.y - target.y) <= yTol) {
                    if (!hasHit) {
                        this.safeCall('playSFX', ['punch_4', 'punch_5']);
                        hasHit = true;
                    }
                    const hitX = (this.x + target.x) / 2;
                    this.safeCall('spawnBlood', hitX, target.y - 50);
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
                }
            });
            
            this.once('animationcomplete', () => {
                if (hitZone.active) hitZone.destroy();
                this.isAttacking = false;
            });
        }
    }

    private playVoice(marker: string | string[]) {
        if (this.currentVoice && this.currentVoice.isPlaying) this.currentVoice.stop();
        this.currentVoice = this.safeCall('playSFX', marker);
    }

    public playPickupAnim() {
        if (this.isDead || this.isJumping || this.isAttacking) return;
        this.isAttacking = true;
        this.setVelocity(0, 0);
        this.anims.stop();
        this.setFrame('maja-pick-up/frame_001.png');
        this.setTintFill(0x39ff14);
        this.scene.time.delayedCall(100, () => this.clearTint());
        this.scene.time.delayedCall(300, () => {
            this.isAttacking = false;
        });
    }

    public update(input: any) {
        if (this.isDead) return;
        
        this.setAngle(0);
        const currentAnimKeyForScale = this.anims.currentAnim?.key || '';
        const currentFrameName = this.frame.name;
        
        if (currentFrameName.includes('pick-up')) {
            this.setScale(1.9);
        } else {
            this.setScale(1.7);
        }

        // =======================================================
        // HARD Y-AXIS CLAMP — walkable street area.
        // MIN: top of street at building base (matches world bounds top)
        // MAX: bottom edge of screen so sprite doesn't get cut off.
        //      Since origin is (0.5, 1), this.y = feet position.
        // =======================================================
        const MIN_STREET_Y = 820;
        const MAX_STREET_Y = 1080;
        if (this.y < MIN_STREET_Y) {
            this.y = MIN_STREET_Y;
        }
        if (this.y > MAX_STREET_Y) {
            this.y = MAX_STREET_Y;
        }
        
        this.positionWeaponSprite();
        
        // --- JUMP LOGIC ---
        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping = true;
            
            if (input.left) this.jumpVelocityX = -this.runSpeed * 1.2;
            else if (input.right) this.jumpVelocityX = this.runSpeed * 1.2;
            else this.jumpVelocityX = 0;

            if (this.scene.anims.exists(`${this.characterName}-jump`)) {
                this.play(`${this.characterName}-jump`, true);
            }

            const startOriginY = this.displayOriginY;
            this.scene.tweens.add({
                targets: this,
                displayOriginY: startOriginY + 220,
                duration: 400,
                yoyo: true,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.isJumping = false;
                    this.displayOriginY = startOriginY;
                    if (!this.isAttacking && this.scene.anims.exists(`${this.characterName}-idle`)) {
                        this.play(`${this.characterName}-idle`, true);
                    }
                }
            });
        }

        const now = this.scene.time.now;
        if (input.left || input.right) {
            const dir = input.left ? 'left' : 'right';
            if (this.lastKey !== dir) {
                if (now - this.lastKeyTime < 250) this.isRunning = true;
                this.lastKey = dir; this.lastKeyTime = now;
            }
        } else { this.isRunning = false; this.lastKey = ''; }

        let requestedAction: string | null = null;
        if (input.special) requestedAction = 'special';
        else if (input.finisher) requestedAction = 'finisher';
        else if (input.p1) requestedAction = 'punch-1';
        else if (input.p2) requestedAction = 'punch-2';
        else if (input.k1) requestedAction = 'kick-1';
        else if (input.k2) requestedAction = 'kick-2';

        if (requestedAction) {
            if (this.isJumping && !this.isAttacking) {
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) {
                    this.executeJumpAttack(requestedAction);
                }
            } else if (!this.isJumping) {
                if (this.isAttacking && (requestedAction === 'special' || requestedAction === 'finisher')) {
                    this.isAttacking = false;
                    const oldZone = this.scene.children.getByName('basicAttackZone');
                    if (oldZone) oldZone.destroy();
                }
                
                if (!this.isAttacking) {
                    if (this.equippedWeapon && (requestedAction === 'punch-1' || requestedAction === 'punch-2')) {
                        this.executeWeaponAttack();
                    } else {
                        this.executeAction(requestedAction);
                    }
                } else {
                    this.queuedAction = requestedAction;
                }
            }
            return;
        }

        if (!this.isAttacking) {
            let vx = 0; let vy = 0;
            if (this.isJumping) {
                vx = this.jumpVelocityX;
            } else {
                const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
                vx = input.left ? -speed : (input.right ? speed : 0);
                vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            }
            
            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);
            
            if (!this.isJumping) {
                if (vx !== 0 || vy !== 0) {
                    if (this.isRunning) {
                        this.play(`${this.characterName}-run`, true);
                    } else {
                        // Maja always uses her regular walk — no walk-rifle variant
                        this.play(`${this.characterName}-walk`, true);
                    }
                } else {
                    if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) {
                        this.play(`${this.characterName}-shoot-with-rifle`, true);
                    } else {
                        this.play(`${this.characterName}-idle`, true);
                    }
                }
            }
        } else {
            if (this.isJumping) {
                this.setVelocity(this.jumpVelocityX, 0);
            }
        }
    }

    private executeJumpAttack(action: string) {
        this.isAttacking = true;
        const type = action.includes('punch') ? 'jump-punch' : 'jump-kick';
        const animToPlay = `${this.characterName}-${type}`;
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true);
        else if (this.scene.anims.exists(`${this.characterName}-kick-1`)) this.play(`${this.characterName}-kick-1`, true);
        
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 100, 140, 90);
        this.scene.physics.add.existing(hitZone);
        
        let hasHit = false;
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
        
        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => {
            const yTol = target.isBreakable ? 140 : 60;
            if (Math.abs(this.y - target.y) <= yTol) {
                if (!hasHit) {
                    this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    hasHit = true;
                }
                const damage = 15 * this.damageMultiplier;
                const hitX = (this.x + target.x) / 2;
                this.safeCall('spawnHitEffect', hitX, target.y - 80);
                
                if (target.takeDamage) target.takeDamage(damage);
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });
        
        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        if (action === 'special') { this.executeGroundSlam(); return; }
        if (action === 'finisher') { this.executeIndustrialDrill(); return; }

        // ─── 3-HIT COMBO: punch → punch → punch-combo finisher on 3rd ───
        // The player must land 2 quick punches (Q or W) within the combo
        // window (1500ms). The 3rd consecutive punch triggers the combo
        // finisher animation (punch-punch-kick) with triple-staggered SFX.
        // Kicks or any non-punch action resets the counter.
        // ──────────────────────────────────────────────────────────────────
        if (action === 'punch-1' || action === 'punch-2') {
            const now = this.scene.time.now;

            if (this.lastPunchTime === 0 || now - this.lastPunchTime > 1500) {
                this.comboCounter = 1;
            } else {
                this.comboCounter++;
            }
            this.lastPunchTime = now;

            if (this.comboCounter >= 3) {
                action = 'punch-combo';
                this.comboCounter = 0;
            }
        } else {
            this.comboCounter = 0;
        }

        this.isAttacking = true; this.setVelocity(0, 0);

        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) {
            this.play(animToPlay, true);
        } else {
            console.warn(`Animation ${animToPlay} missing! Falling back to punch-1`);
            this.play(`${this.characterName}-punch-1`, true);
            action = 'punch-1';
        }

        let zoneWidth = 140;
        let offsetX = 80;
        let damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier;

        if (action === 'punch-combo') {
            zoneWidth = 240;
            offsetX = 120;
            damage = 40 * this.damageMultiplier;

            const dirX = this.flipX ? -1 : 1;
            this.scene.tweens.add({
                targets: this,
                x: this.x + (60 * dirX),
                duration: 300,
                ease: 'Cubic.easeOut'
            });
        }

        const hitZone = this.scene.add.zone(
            this.x + (this.flipX ? -offsetX : offsetX),
            this.y - 40,
            zoneWidth,
            80
        );
        hitZone.setName('basicAttackZone');
        this.scene.physics.add.existing(hitZone);

        let hasHit = false;
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];

        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => {
            const yTol = target.isBreakable ? 140 : 60;
            if (Math.abs(this.y - target.y) <= yTol) {
                if (!hasHit) {
                    // ─── COMBO FINISHER: 3 punch SFXs + 1 kick SFX staggered ───
                    // Plus a VFX explosion and camera shake on the final kick
                    if (action === 'punch-combo') {
                        this.safeCall('playSFX', this.punchImpacts);
                        this.scene.time.delayedCall(80, () => this.safeCall('playSFX', this.punchImpacts));
                        this.scene.time.delayedCall(160, () => this.safeCall('playSFX', this.punchImpacts));
                        this.scene.time.delayedCall(240, () => {
                            this.safeCall('playSFX', this.kickImpacts);
                            this.scene.cameras.main.shake(200, 0.02);
                            // Extra VFX burst on the finishing kick
                            this.safeCall('spawnHitEffect', target.x, target.y - 130);
                            this.safeCall('spawnHitEffect', target.x + 15, target.y - 80);
                        });
                    } else {
                        this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    }
                    hasHit = true;
                }

                const hitX = (this.x + target.x) / 2;
                this.safeCall('spawnHitEffect', hitX, target.y - 50);
                if (target.takeDamage) target.takeDamage(damage);

                if (action === 'punch-combo' && target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                    const pushDir = target.x > this.x ? 1 : -1;
                    target.setVelocityX(200 * pushDir);
                }

                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });

        // Failsafe timer — extended for combo so the slower impact frames
        // have time to complete without being cut short
        const failsafeMs = action === 'punch-combo' ? 1200 : 400;
        this.scene.time.delayedCall(failsafeMs, () => {
            if (this.isAttacking && hitZone.active) {
                hitZone.destroy();
                this.isAttacking = false;
                this.queuedAction = null;
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.isAttacking = false; this.executeAction(next); }
            else { this.isAttacking = false; }
        });
    }

    private executeGroundSlam() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        
        const animKey = this.scene.anims.exists(`${this.characterName}-special-attack`) 
            ? `${this.characterName}-special-attack` 
            : `${this.characterName}-punch-1`;
            
        this.play(animKey, true);
        
        let triggered = false;
        
        const onUpdate = (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
            if (anim.key !== animKey) return;
            
            if (frame.index >= 5 && !triggered) {
                triggered = true;
                
                this.scene.cameras.main.shake(300, 0.02);
                
                this.safeCall('playSFX', ['explosion_02', 'Break_1']);
                
                const ring = this.scene.add.circle(this.x, this.y, 20, 0x00ffff, 0.6);
                this.scene.physics.add.existing(ring);
                
                this.scene.tweens.add({
                    targets: ring,
                    radius: 200,
                    alpha: 0,
                    duration: 400,
                    ease: 'Quad.easeOut',
                    onComplete: () => ring.destroy()
                });
                
                const slamZone = this.scene.add.circle(this.x, this.y, 180);
                this.scene.physics.add.existing(slamZone);
                
                const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
                
                this.scene.physics.overlap(slamZone, targets, (sz, target: any) => {
                    const yTolTarget = target.isBreakable ? 160 : 80;
                    
                    if (Math.abs(this.y - target.y) <= yTolTarget) {
                        const pushDir = target.x > this.x ? 1 : -1;
                        
                        if (target.takeDamage) {
                            target.takeDamage(50 * this.damageMultiplier);
                            
                            if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                                target.setVelocityX(550 * pushDir);
                                
                                if (target.takeKnockdown && !target.isDead) {
                                    target.takeKnockdown();
                                } else {
                                    target.setVelocityY(-150);
                                }
                            }
                        }
                        this.safeCall('spawnHitEffect', target.x, target.y - 50);
                    }
                });
                
                this.scene.time.delayedCall(100, () => { if (slamZone.active) slamZone.destroy(); });
            }
        };
        
        this.on('animationupdate', onUpdate);
        
        this.once('animationcomplete', () => {
            this.isAttacking = false;
            this.off('animationupdate', onUpdate);
        });
    }

    private executeIndustrialDrill() {
        this.isAttacking = true;
        
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`) ? `${this.characterName}-finish-move` : `${this.characterName}-run`;
        
        if (this.scene.anims.exists(anim)) this.play(anim, true);
        
        this.safeCall('triggerScreenGlitch', 600);
        
        const direction = this.flipX ? -1 : 1;
        this.setVelocityX(500 * direction);
        
        const drillZone = this.scene.add.zone(this.x, this.y, 100, 80);
        this.scene.physics.add.existing(drillZone);
        
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
        
        const drillUpdate = () => {
            if (!drillZone.active) return;
            drillZone.setPosition(this.x + (60 * direction), this.y - 40);
            
            this.scene.physics.overlap(drillZone, targets, (dz, target: any) => {
                const yTol = target.isBreakable ? 140 : 60;
                if (Math.abs(this.y - target.y) <= yTol) {
                    this.safeCall('spawnHitEffect', target.x, target.y - 50);
                    if (target.takeDamage) target.takeDamage(5);
                }
            });
        };
        
        this.scene.events.on('update', drillUpdate);
        
        this.once('animationcomplete', () => {
            this.setVelocityX(0);
            if (drillZone.active) drillZone.destroy();
            this.scene.events.off('update', drillUpdate);
            this.isAttacking = false;
        });
    }

    public takeDamage(amount: number) {
        this.health -= amount; this.queuedAction = null;
        this.safeCall('spawnHitEffect', this.x, this.y - 40);
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now();
        
        if (this.equippedWeapon) {
            this.weaponHitsTaken++;
            if (this.weaponHitsTaken >= 4) {
                this.dropAndFadeWeapon();
            }
        }
        
        if (this.health <= 0) {
            this.safeCall('playSFX', this.agonies);
            this.die();
        } else {
            this.safeCall('playSFX', this.grunts);
            const dmgAnim = `${this.characterName}-damage`;
            
            if (this.scene.anims.exists(dmgAnim)) { this.isAttacking = true; this.play(dmgAnim, true); this.once('animationcomplete', () => { this.isAttacking = false; }); }
            else { this.setTint(0xff0000); this.scene.time.delayedCall(200, () => this.clearTint()); }
        }
        this.safeCall('updateReactHUD');
    }

    public takeKnockdown(amount: number = 15) {
        this.health -= amount;
        this.queuedAction = null;
        this.safeCall('spawnHitEffect', this.x, this.y - 40);
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now();
        
        if (this.equippedWeapon) {
            this.dropAndFadeWeapon();
        }
        
        if (this.health <= 0) {
            this.safeCall('playSFX', this.agonies);
            this.die();
        } else {
            this.safeCall('playSFX', this.grunts);
            const anim = `${this.characterName}-knockdown-get-up`;
            
            if (this.scene.anims.exists(anim)) {
                this.isAttacking = true;
                this.play(anim, true);
                this.once('animationcomplete', () => { this.isAttacking = false; });
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(200, () => this.clearTint());
            }
        }
        this.safeCall('updateReactHUD');
    }

    private die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        const dieAnim = `${this.characterName}-dying`;
        
        if (this.scene.anims.exists(dieAnim)) {
            this.play(dieAnim, true);
        } else {
            this.setTint(0xff0000);
        }
        
        if (this.weaponSprite) this.weaponSprite.destroy();
    }
}