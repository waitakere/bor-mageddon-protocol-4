import Phaser from 'phaser';
import { CHARACTER_STATS } from '../config/CharacterStats';

export class Darko extends Phaser.Physics.Arcade.Sprite {

    public health: number = CHARACTER_STATS.darko_1993.maxHealth;
    public maxHealth: number = CHARACTER_STATS.darko_1993.maxHealth;
    public smfMeter: number = 0;
    public characterName: string = 'darko';
    public damageMultiplier: number = CHARACTER_STATS.darko_1993.hitDamage / 12;

    public isAttacking: boolean = false;
    public isDead: boolean = false;
    public isJumping: boolean = false;

    public jumpVisualOffset: number = 0;
    private jumpGroundY: number = 0;

    public equippedWeapon: string | null = null;
    public weaponDurability: number = 0;
    public weaponHitsTaken: number = 0;
    private weaponSprite: Phaser.GameObjects.Sprite | null = null;

    private weaponOffsets: Record<string, { x: number, y: number, angle: number }> = {
        'idle':  { x: 30,  y: -110, angle: -15 },
        'walk':  { x: 35,  y: -115, angle:  -5 },
        'run':   { x: 45,  y: -110, angle:  15 },
        'jump':  { x: 25,  y: -120, angle: -30 },
        'shoot': { x: 60,  y: -105, angle:   0 }
    };

    private currentVoice: any = null;
    private walkSpeed: number = CHARACTER_STATS.darko_1993.baseSpeed;
    private runSpeed: number  = CHARACTER_STATS.darko_1993.runSpeed;
    private jumpVelocityX: number = 0;

    private lastKey: string = '';
    private lastKeyTime: number = 0;
    private isRunning: boolean = false;
    private queuedAction: string | null = null;

    // --- COMBO STATE (3-hit: punch → punch → combo finisher) ---
    private lastPunchTime: number = 0;
    private comboCounter: number = 0;

    private lastWeaponDepth: number = -1;
    private pickupTintTimer: Phaser.Time.TimerEvent | null = null;

    private punchImpacts = ['punch_1','punch_2','punch_3','punch_4','punch_5','punch_6','punch_7','punch_8'];
    private kickImpacts  = ['kick_1','kick_2','kick_3','kick_4'];
    private grunts       = ['grunt_m_1','grunt_m_2','grunt_m_3','grunt_m_4'];
    private agonies      = ['agony_m_1','agony_m_2','agony_m_3','agony_m_4'];
    private specialAudio = ['darko_special_1','darko_special_2','darko-special-smf'];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const texture = scene.textures.get('darko');
        const allFrames = texture ? texture.getFrameNames() : [];
        const firstFrame = allFrames.find(f => f.includes('darko-idle')) || allFrames;

        super(scene, x, y, 'darko', firstFrame);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setOrigin(0.5, 1);
        this.setScale(1.7);

        if (this.body) {
            this.body.setSize(50, 30);
            this.body.setOffset(this.width / 2 - 25, this.height - 30);
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

            const matchingFrames = allFrames
                .filter(f => f.includes(`${animKey}/frame_`))
                .sort();
            if (matchingFrames.length === 0) return;

            let fps = 15;
            if      (animType === 'idle')                              fps = 6;
            else if (animType === 'walk' || animType === 'walk-rifle') fps = 10;
            else if (animType === 'run')                               fps = 14;
            else if (animType === 'jump')                              fps = 8;
            else if (animType === 'melee')                             fps = 18;
            else if (animType === 'kick-1' || animType === 'kick-2')   fps = 16;
            else if (animType === 'pick-up')                           fps = 12;

            let frameConfig: Phaser.Types.Animations.AnimationFrameConfig[] = matchingFrames.map(f => ({ key: this.characterName, frame: f }));

            if (animType === 'shoot-with-rifle' && frameConfig.length === 1) {
                frameConfig.push(frameConfig, frameConfig, frameConfig);
            }

            anims.create({
                key: animKey,
                frames: frameConfig,
                frameRate: fps,
                repeat: ['idle','walk','run','walk-rifle'].includes(animType) ? -1 : 0
            });
        });

        // ─── COMBO ANIMATION (WITH PRONOUNCED UPPERCUT FINISH) ──────
        const comboKey = `${this.characterName}-punch-combo`;
        if (!anims.exists(comboKey)) {
            const comboFramesInAtlas = allFrames.filter(f => f.includes('punch-combo'));
           
            if (comboFramesInAtlas.length > 0) {
                const frameSequence: { num: string, duration?: number }[] = [
                    { num: '000' },
                    { num: '001' },
                    { num: '002' },
                    { num: '003' },
                    { num: '004' },
                    { num: '005' },
                    { num: '006' },
                    { num: '007', duration: 100 },
                    { num: '008', duration: 120 },
                    { num: '009', duration: 200 },  // IMPACT PEAK
                    { num: '010', duration: 180 },  // Follow-through
                    { num: '011', duration: 120 },
                ];
               
                const frames = frameSequence
                    .map(f => {
                        const frameName = `${this.characterName}-punch-combo/frame_${f.num}.png`;
                        if (!comboFramesInAtlas.includes(frameName)) return null;
                        return { key: this.characterName, frame: frameName, duration: f.duration };
                    })
                    .filter(f => f !== null) as Phaser.Types.Animations.AnimationFrameConfig[];

                if (frames.length > 0) {
                    anims.create({ key: comboKey, frames: frames, frameRate: 18, repeat: 0 });
                }
            }
        }
    }

    public equipWeapon(weaponKey: string) {
        if (this.weaponSprite) this.weaponSprite.destroy();
        this.equippedWeapon  = weaponKey;
        this.weaponHitsTaken = 0;
        this.lastWeaponDepth = -1;

        if (weaponKey === 'M70-FINAL rev') {
            this.weaponDurability = 5;
            this.weaponSprite     = null;
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

        const drop = this.scene.add.sprite(this.x, this.y - 150, this.equippedWeapon);
        drop.setScale(this.equippedWeapon === 'M70-FINAL rev' ? 1.0 : 1.3);
        drop.setFlipX(this.flipX);

        this.scene.tweens.add({ targets: drop, x: this.x + (this.flipX ? -80 : 80), duration: 600, ease: 'Linear' });
        this.scene.tweens.add({ targets: drop, y: this.y, angle: 0, duration: 600, ease: 'Bounce.easeOut' });
        this.scene.tweens.add({
            targets: drop, alpha: 0, duration: 150, delay: 1500, yoyo: true, repeat: 4,
            onComplete: () => {
                this.scene.tweens.add({ targets: drop, alpha: 0, duration: 300, onComplete: () => drop.destroy() });
            }
        });

        this.equippedWeapon = null;
        if (this.weaponSprite) { this.weaponSprite.destroy(); this.weaponSprite = null; }
    }

    private positionWeaponSprite() {
        if (!this.weaponSprite || !this.equippedWeapon) return;

        const currentAnimKey   = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle';
        const currentFrameName = this.frame.name;
        const dirX = this.flipX ? -1 : 1;

        if (
            ['special-attack','finish-move','jump-punch','jump-kick','knockdown-get-up', 'pick-up', 'punch-combo'].includes(currentAnimKey) ||
            currentFrameName.includes('pick-up') ||
            this.equippedWeapon === 'M70-FINAL rev'
        ) {
            this.weaponSprite.visible = false;
            return;
        }

        let targetX = this.x;
        let targetY = this.y;
        let targetAngle = 0;

        if (currentAnimKey === 'melee') {
            if      (['018','019','020'].some(n => currentFrameName.includes(n))) { targetX += (-30*dirX); targetY -= 120; targetAngle = -30*dirX; }
            else if (['004','005','006'].some(n => currentFrameName.includes(n))) { targetX += (-10*dirX); targetY -= 170; targetAngle =  30*dirX; }
            else if (['021','022','023'].some(n => currentFrameName.includes(n))) { targetX += ( 85*dirX); targetY -= 105; targetAngle =  85*dirX; }
            else if (['028','029','030'].some(n => currentFrameName.includes(n))) { targetX += ( 65*dirX); targetY -=  75; targetAngle = 135*dirX; }
            else                                                                  { targetX += ( 40*dirX); targetY -= 135; targetAngle =  55*dirX; }
        } else if (currentAnimKey === 'throw') {
            if      (['000','001','002','003','004'].some(n => currentFrameName.includes(n)))                                         { targetX += (-10*dirX); targetY -= 170; targetAngle = -30*dirX; }
            else if (['005','006','007','008','009','010','011','012','013','014','015'].some(n => currentFrameName.includes(n))) { targetX += (-30*dirX); targetY -= 180; targetAngle = -60*dirX; }
            else if (['016','017','018','019'].some(n => currentFrameName.includes(n)))                                           { targetX += ( 20*dirX); targetY -= 170; targetAngle =  45*dirX; }
            else                                                                                                                  { targetX += ( 70*dirX); targetY -= 150; targetAngle =  90*dirX; }
        } else {
            const offset = this.weaponOffsets[currentAnimKey] || this.weaponOffsets['idle'];
            targetX += (offset.x * dirX);
            targetY += offset.y;
            targetAngle = offset.angle * dirX;
        }

        this.weaponSprite.setPosition(targetX, targetY);
        this.weaponSprite.setAngle(targetAngle);
        this.weaponSprite.setFlipX(this.flipX);

        const desiredDepth = this.depth + 1;
        if (this.lastWeaponDepth !== desiredDepth) {
            this.weaponSprite.setDepth(desiredDepth);
            this.lastWeaponDepth = desiredDepth;
        }

        this.weaponSprite.visible = true;
    }

    private throwWeapon() {
        if (!this.equippedWeapon) return;
        const dirX = this.flipX ? -1 : 1;
        this.safeCall('spawnProjectile', this.y, this.x + (20*dirX), this.y - 120, this.equippedWeapon, dirX, 50, true);
        this.equippedWeapon = null;
        if (this.weaponSprite) { this.weaponSprite.destroy(); this.weaponSprite = null; }
    }

    public playPickupAnim() {
        if (this.isDead || this.isJumping || this.isAttacking) return;
        this.isAttacking = true;
        this.setVelocity(0, 0);
        this.anims.stop();

        const animKey = `${this.characterName}-pick-up`;
       
        if (this.scene.anims.exists(animKey)) {
            this.play(animKey, true);
        } else {
            this.setFrame(`${this.characterName}-pick-up/frame_002.png`);
        }

        if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
        this.clearTint();
        this.setTint(0x39ff14);
       
        this.pickupTintTimer = this.scene.time.delayedCall(120, () => {
            this.clearTint();
            this.pickupTintTimer = null;
        });

        this.once('animationcomplete', () => {
            this.isAttacking = false;
        });
    }

    public update(input: any) {
        if (this.isDead) return;

        this.setAngle(0);
        this.setScale(1.7);
        this.setOrigin(0.5, 1);

        // =======================================================
        // HARD Y-AXIS CLAMP — walkable street area.
        // MIN: top of street at building base (matches world bounds top)
        // MAX: bottom edge of screen (1080) so sprite doesn't get cut off.
        // =======================================================
        const MIN_STREET_Y = 820; 
        const MAX_STREET_Y = 1080;
        if (this.y < MIN_STREET_Y) this.y = MIN_STREET_Y;
        if (this.y > MAX_STREET_Y) this.y = MAX_STREET_Y;

        if (this.jumpVisualOffset > 0 && this.frame) {
            let nativeY = this.frame.realHeight;
            if (this.frame.trimmed) nativeY -= this.frame.trimY;
            this.displayOriginY = nativeY + this.jumpVisualOffset;
        }

        this.positionWeaponSprite();

        // ── Jump ────────────────────────────────────────────────────
        if (input.space && !this.isJumping && !this.isAttacking) {
            this.isJumping   = true;
            this.jumpGroundY = this.y;

            if      (input.left)  this.jumpVelocityX = -this.runSpeed * 1.2;
            else if (input.right) this.jumpVelocityX =  this.runSpeed * 1.2;
            else                  this.jumpVelocityX =  0;

            if (this.scene.anims.exists(`${this.characterName}-jump`)) {
                this.play(`${this.characterName}-jump`, true);
            }

            if (this.body) (this.body as Phaser.Physics.Arcade.Body).collideWorldBounds = false;

            this.scene.tweens.add({
                targets: this,
                y: this.jumpGroundY - 220,
                duration: 400,
                yoyo: true,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    this.isJumping        = false;
                    this.jumpVisualOffset = 0;
                    this.y                = this.jumpGroundY;
                    if (this.body) (this.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true;
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
                this.lastKey     = dir;
                this.lastKeyTime = now;
            }
        } else {
            this.isRunning = false;
            this.lastKey   = '';
        }

        let requestedAction: string | null = null;
        if      (input.special)  requestedAction = 'special';
        else if (input.finisher) requestedAction = 'finisher';
        else if (input.p1)       requestedAction = 'punch-1';
        else if (input.p2)       requestedAction = 'punch-2';
        else if (input.k1)       requestedAction = 'kick-1';
        else if (input.k2)       requestedAction = 'kick-2';

        if (requestedAction) {
            if (this.isJumping && !this.isAttacking) {
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) {
                    this.executeJumpAttack(requestedAction);
                }
            } else if (!this.isJumping) {
                if (!this.isAttacking) {
                    if (this.equippedWeapon && (requestedAction === 'punch-1' || requestedAction === 'punch-2')) {
                        this.executeWeaponAttack();
                    } else {
                        this.executeAction(requestedAction);
                    }
                } else {
                    if (requestedAction !== 'special' && requestedAction !== 'finisher') {
                        this.queuedAction = requestedAction;
                    }
                }
            }
            return;
        }

        if (!this.isAttacking) {
            let vx = 0, vy = 0;

            if (this.isJumping) {
                vx = this.jumpVelocityX;
            } else {
                const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
                vx = input.left ? -speed : (input.right ? speed : 0);
                vy = input.up   ? -speed * 0.6 : (input.down ? speed * 0.6 : 0);
            }

            this.setVelocity(vx, vy);
            if (vx !== 0) this.setFlipX(vx < 0);

            if (!this.isJumping) {
                if (vx !== 0 || vy !== 0) {
                    if (this.isRunning) {
                        this.play(`${this.characterName}-run`, true);
                    } else if (this.equippedWeapon === 'M70-FINAL rev') {
                        const rifleWalk = `${this.characterName}-walk-rifle`;
                        this.play(this.scene.anims.exists(rifleWalk) ? rifleWalk : `${this.characterName}-walk`, true);
                    } else {
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
            if (this.isJumping) this.setVelocity(this.jumpVelocityX, 0);
        }
    }

    private executeWeaponAttack() {
        this.isAttacking = true;
        this.setVelocity(0, 0);

        if (this.equippedWeapon === 'M70-FINAL rev') {
            const shootAnim = this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)
                ? `${this.characterName}-shoot-with-rifle`
                : `${this.characterName}-shoot`;
            if (this.scene.anims.exists(shootAnim)) this.play(shootAnim, true);

            const dirX = this.flipX ? -1 : 1;
            this.safeCall('playSFX', 'gun-shot-m70', 1.0);

            // ─── RIFLE MUZZLE & BULLET SPAWN POSITION ───────────────
            // TUNING: v5 — X=145, Y=340
            const muzzleOffsetX = 145;
            const muzzleOffsetY = 340;
            const spawnX = this.x + (muzzleOffsetX * dirX);
            const flashX = this.x + ((muzzleOffsetX + 15) * dirX);
            const spawnY = this.y - muzzleOffsetY;

            this.safeCall('spawnProjectile', this.y, spawnX, spawnY, 'bullet', dirX, 60, false);

            const flash = this.scene.add.sprite(flashX, spawnY, 'muzzle-flash-m70');
            flash.setDepth(9999).setFlipX(this.flipX).setScale(1.2).setBlendMode(Phaser.BlendModes.ADD);
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

            const animToPlay = this.scene.anims.exists(`${this.characterName}-melee`)
                ? `${this.characterName}-melee`
                : `${this.characterName}-punch-2`;
            this.play(animToPlay, true);

            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -90 : 90), this.y - 60, 180, 120);
            this.scene.physics.add.existing(hitZone);
            let hasHit = false;

            this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
                if (Math.abs(this.y - target.y) <= (target.isBreakable ? 160 : 130)) {
                    if (!hasHit) { this.safeCall('playSFX', ['punch_4','punch_5']); hasHit = true; }
                    this.safeCall('spawnHitEffect', target.x, target.y - 130);
                    if (target.takeDamage) target.takeDamage(25 * this.damageMultiplier);
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
                }
            });

            this.once('animationcomplete', () => {
                if (hitZone.active) hitZone.destroy();
                this.isAttacking = false;
            });
        }
    }

    private executeJumpAttack(action: string) {
        this.isAttacking = true;
        const type     = action.includes('punch') ? 'jump-punch' : 'jump-kick';
        const animKey  = `${this.characterName}-${type}`;
        const fallback = `${this.characterName}-kick-1`;
        if      (this.scene.anims.exists(animKey))  this.play(animKey,  true);
        else if (this.scene.anims.exists(fallback))  this.play(fallback, true);

        const baseY = this.isJumping ? this.jumpGroundY : this.y;

        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), baseY - 60, 160, 120);
        this.scene.physics.add.existing(hitZone);
        let hasHit = false;

        this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
            if (Math.abs(baseY - target.y) <= (target.isBreakable ? 160 : 130)) {
                if (!hasHit) { this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); hasHit = true; }
                this.safeCall('spawnHitEffect', target.x, target.y - 130);
                if (target.takeDamage) target.takeDamage(15 * this.damageMultiplier);
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            this.isAttacking = false;
        });
    }

    private executeAction(action: string) {
        if (action === 'special') { this.executeDarkoSpecial(); return; }
        if (action === 'finisher') { this.executeDarkoFinisher(); return; }

        // ─── 3-HIT COMBO: punch → punch → punch-combo finisher on 3rd ───
        // Works identically for Q (punch-1) and W (punch-2).
        // The player must land 2 quick punches within 1500ms.
        // The 3rd consecutive punch triggers the combo finisher.
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

        this.isAttacking = true;
        this.setVelocity(0, 0);

        const animToPlay = `${this.characterName}-${action}`;
        if (this.scene.anims.exists(animToPlay)) {
            this.play(animToPlay, true);
        } else {
            console.warn(`Animation ${animToPlay} missing! Falling back to punch-1`);
            this.play(`${this.characterName}-punch-1`, true);
            action = 'punch-1';
        }

        let zoneWidth = 180;
        let offsetX   = 90; 
        let damage    = (action.includes('2') ? 15 : 10) * this.damageMultiplier;

        if (action === 'kick-2') {
            zoneWidth = 220;
            offsetX = 110;
        } else if (action === 'punch-combo') {
            zoneWidth = 240;
            offsetX = 120;
            damage = 40 * this.damageMultiplier;
            const dirX = this.flipX ? -1 : 1;
            this.scene.tweens.add({ targets: this, x: this.x + (60 * dirX), duration: 300, ease: 'Cubic.easeOut' });
        }

        const hitZone = this.scene.add.zone(
            this.x + (this.flipX ? -offsetX : offsetX), this.y - 60, zoneWidth, 120
        );
        hitZone.setName('basicAttackZone');
        this.scene.physics.add.existing(hitZone);
        let hasHit = false;

        this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
            if (Math.abs(this.y - target.y) <= (target.isBreakable ? 160 : 130)) {
                if (!hasHit) {
                    if (action === 'punch-combo') {
                        this.safeCall('playSFX', this.punchImpacts);
                        this.scene.time.delayedCall(60, () => this.safeCall('playSFX', this.punchImpacts));
                        this.scene.time.delayedCall(120, () => this.safeCall('playSFX', this.punchImpacts));
                        this.scene.cameras.main.shake(150, 0.015);
                    } else {
                        this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts);
                    }
                    hasHit = true;
                }
                this.safeCall('spawnHitEffect', target.x, target.y - 130);
                if (target.takeDamage) target.takeDamage(damage);
                if (action === 'punch-combo' && target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                    target.setVelocityX(200 * (target.x > this.x ? 1 : -1));
                }
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false;
            }
        });

        // ─── FAILSAFE TIMER ─────────────────────────────────────────
        // If animationcomplete doesn't fire, this unlocks the player.
        // IMPORTANT: process queued action instead of discarding it,
        // so the combo counter stays alive across chained punches.
        // ─────────────────────────────────────────────────────────────
        const failsafeMs = action === 'punch-combo' ? 1200 : 400;
        this.scene.time.delayedCall(failsafeMs, () => {
            if (this.isAttacking && hitZone.active) {
                hitZone.destroy();
                if (this.queuedAction) {
                    const next = this.queuedAction;
                    this.queuedAction = null;
                    this.isAttacking = false;
                    this.executeAction(next);
                } else {
                    this.isAttacking = false;
                }
            }
        });

        this.once('animationcomplete', () => {
            if (hitZone.active) hitZone.destroy();
            if (this.queuedAction) {
                const next = this.queuedAction;
                this.queuedAction = null;
                this.isAttacking  = false;
                this.executeAction(next);
            } else {
                this.isAttacking = false;
            }
        });
    }

    private executeDarkoSpecial() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        const anim = this.scene.anims.exists(`${this.characterName}-special-attack`)
            ? `${this.characterName}-special-attack` : `${this.characterName}-punch-1`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);

        this.scene.time.delayedCall(200, () => {
            this.safeCall('playSFX', ['punch_4', 'punch_5']);
            this.safeCall('triggerScreenGlitch', 400);
            this.scene.cameras.main.shake(300, 0.015);

            const spinZone = this.scene.add.circle(this.x, this.y - 60, 180);
            this.scene.physics.add.existing(spinZone);
            const alreadyHit = new Set<any>();

            this.scene.physics.add.overlap(spinZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_sz, target: any) => {
                if (alreadyHit.has(target)) return;
                if (Math.abs(this.y - target.y) <= (target.isBreakable ? 160 : 130)) {
                    alreadyHit.add(target);
                    const pushDir = target.x > this.x ? 1 : -1;

                    this.safeCall('spawnHitEffect', target.x, target.y - 130);
                    this.safeCall('playSFX', this.punchImpacts);

                    if (target.takeDamage) {
                        target.takeDamage(40 * this.damageMultiplier);
                        if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                            target.setVelocityX(400 * pushDir);
                        }
                    }

                    // Force enemy damage animation if they survived
                    if (!target.isDead && target.anims) {
                        const prefix = target.skinPrefix || target.characterName || 'enemy';
                        const dmgAnim = `${prefix}-damage`;
                        if (this.scene.anims.exists(dmgAnim)) {
                            target.play(dmgAnim, true);
                        }
                    }
                }
            });

            this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); });
        });

        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    private executeDarkoFinisher() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`)
            ? `${this.characterName}-finish-move` : `${this.characterName}-punch-1`;
        if (this.scene.anims.exists(anim)) this.play(anim, true);

        this.scene.time.delayedCall(300, () => {
            this.safeCall('playSFX', this.specialAudio, 1.0);
            this.safeCall('triggerScreenGlitch', 800);
            this.scene.cameras.main.shake(500, 0.03);

            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -150 : 150), this.y - 60, 260, 160);
            this.scene.physics.add.existing(hitZone);
            const alreadyHit = new Set<any>();

            this.scene.physics.add.overlap(hitZone, [(this.scene as any).enemies, (this.scene as any).breakables], (_hz, target: any) => {
                if (alreadyHit.has(target)) return;
                if (Math.abs(this.y - target.y) <= (target.isBreakable ? 140 : 130)) {
                    alreadyHit.add(target);

                    this.safeCall('spawnHitEffect', target.x, target.y - 130);
                    this.safeCall('playSFX', this.punchImpacts);

                    if (target.takeDamage) target.takeDamage(80 * this.damageMultiplier);

                    // Force enemy damage animation if they survived
                    if (!target.isDead && target.anims) {
                        const prefix = target.skinPrefix || target.characterName || 'enemy';
                        const dmgAnim = `${prefix}-damage`;
                        if (this.scene.anims.exists(dmgAnim)) {
                            target.play(dmgAnim, true);
                        }
                    }
                }
            });

            this.scene.time.delayedCall(100, () => { if (hitZone.active) hitZone.destroy(); });
        });

        this.once('animationcomplete', () => { this.isAttacking = false; });
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.queuedAction = null;
        this.safeCall('spawnHitEffect', this.x, this.y - 150);
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) {
            this.weaponHitsTaken++;
            if (this.weaponHitsTaken >= 4) this.dropAndFadeWeapon();
        }

        if (this.health <= 0) {
            this.safeCall('playSFX', this.agonies);
            this.die();
        } else {
            this.safeCall('playSFX', this.grunts);
            if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
            this.clearTint();

            const dmgAnim = `${this.characterName}-damage`;
            if (this.scene.anims.exists(dmgAnim)) {
                this.isAttacking = true;
                this.setTint(0xff0000);
                this.play(dmgAnim, true);
                this.scene.time.delayedCall(150, () => this.clearTint());
                this.once('animationcomplete', () => { this.isAttacking = false; });
            } else {
                this.setTint(0xff0000);
                this.scene.time.delayedCall(200, () => this.clearTint());
            }
        }
        this.safeCall('updateReactHUD');
    }

    public takeKnockdown(amount: number = 15) {
        this.health -= amount;
        this.queuedAction = null;
        this.safeCall('spawnHitEffect', this.x, this.y - 150);
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now();

        if (this.equippedWeapon) this.dropAndFadeWeapon();

        if (this.health <= 0) {
            this.safeCall('playSFX', this.agonies);
            this.die();
        } else {
            this.safeCall('playSFX', this.grunts);
            if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
            this.clearTint();

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
        if (this.pickupTintTimer) { this.pickupTintTimer.remove(); this.pickupTintTimer = null; }
        this.clearTint();

        const dieAnim = `${this.characterName}-dying`;
        if (this.scene.anims.exists(dieAnim)) this.play(dieAnim, true);
        else this.setTint(0xff0000);

        if (this.weaponSprite) this.weaponSprite.destroy();
    }
}