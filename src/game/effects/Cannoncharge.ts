import Phaser from 'phaser';

/**
 * CannonCharge — a wind-up glow that gathers at a weapon muzzle before firing.
 *
 * Deliberately asset-free: built from two Arc circles with ADD blending, so
 * it needs no texture, no spritesheet and no atlas entry. That keeps it
 * usable right now, before the 1944 VFX art exists.
 *
 * Because the firing entity may be moving (MechaTito bobs while hovering),
 * the owner is expected to call setMuzzle() every frame — the glow does not
 * parent itself to the sprite, so it survives animation changes and flips.
 *
 * Usage:
 *   this.charge = new CannonCharge(scene, x, y, 1200, {
 *       onComplete: () => this.releaseShot()
 *   });
 *   // then each frame while charging:
 *   this.charge.setMuzzle(muzzle.x, muzzle.y);
 *   // and on interrupt (took damage, died):
 *   this.charge.cancel();
 */

export interface CannonChargeOptions {
    /** Core colour. Defaults to a hot orange-red. */
    coreColor?: number;
    /** Outer halo colour. Defaults to a deeper red. */
    haloColor?: number;
    /** Peak core radius in px at full charge. */
    coreRadius?: number;
    /** Peak halo radius in px at full charge. */
    haloRadius?: number;
    /** Depth to render at. */
    depth?: number;
    /** Fired when the charge completes (not called if cancelled). */
    onComplete?: () => void;
    /** Ramping camera shake as the charge peaks. Default true. */
    shake?: boolean;
}

export class CannonCharge {
    private scene: Phaser.Scene;
    private halo: Phaser.GameObjects.Arc;
    private core: Phaser.GameObjects.Arc;
    private tweens: Phaser.Tweens.Tween[] = [];
    private timer: Phaser.Time.TimerEvent | null = null;
    private shakeTimer: Phaser.Time.TimerEvent | null = null;
    private finished: boolean = false;
    private onComplete?: () => void;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        duration: number = 1200,
        options: CannonChargeOptions = {}
    ) {
        this.scene = scene;
        this.onComplete = options.onComplete;

        const coreColor = options.coreColor ?? 0xffcc44;
        const haloColor = options.haloColor ?? 0xff3311;
        const coreRadius = options.coreRadius ?? 14;
        const haloRadius = options.haloRadius ?? 34;
        const depth = options.depth ?? 9998;
        const wantShake = options.shake ?? true;

        // Outer halo: wide, dim, grows steadily.
        this.halo = scene.add.circle(x, y, haloRadius, haloColor, 1);
        this.halo.setBlendMode(Phaser.BlendModes.ADD);
        this.halo.setDepth(depth);
        this.halo.setScale(0.15);
        this.halo.setAlpha(0.12);
        (this.halo as any).isVFX = true;

        // Inner core: small, bright, grows faster and flickers.
        this.core = scene.add.circle(x, y, coreRadius, coreColor, 1);
        this.core.setBlendMode(Phaser.BlendModes.ADD);
        this.core.setDepth(depth + 1);
        this.core.setScale(0.1);
        this.core.setAlpha(0.35);
        (this.core as any).isVFX = true;

        // Growth over the full charge window.
        this.tweens.push(scene.tweens.add({
            targets: this.halo,
            scale: 1.25,
            alpha: 0.55,
            duration,
            ease: 'Quad.easeIn'
        }));

        this.tweens.push(scene.tweens.add({
            targets: this.core,
            scale: 1.0,
            alpha: 1,
            duration,
            ease: 'Cubic.easeIn'
        }));

        // Flicker overlay — accelerating pulse reads as instability.
        this.tweens.push(scene.tweens.add({
            targets: this.core,
            scaleX: { from: 0.1, to: 1.15 },
            duration: 90,
            yoyo: true,
            repeat: Math.max(1, Math.floor(duration / 180)),
            ease: 'Sine.easeInOut'
        }));

        if (wantShake) {
            // Short shakes that get stronger as the charge nears release.
            const step = Math.max(120, Math.floor(duration / 6));
            let elapsed = 0;

            this.shakeTimer = scene.time.addEvent({
                delay: step,
                loop: true,
                callback: () => {
                    elapsed += step;
                    const t = Math.min(1, elapsed / duration);
                    scene.cameras.main.shake(step * 0.8, 0.0015 + 0.005 * t);
                }
            });
        }

        this.timer = scene.time.delayedCall(duration, () => this.complete());
    }

    /** Call every frame so the glow tracks a moving muzzle. */
    public setMuzzle(x: number, y: number): void {
        if (this.finished) return;
        this.halo.setPosition(x, y);
        this.core.setPosition(x, y);
    }

    /** True once the charge has completed or been cancelled. */
    public isFinished(): boolean {
        return this.finished;
    }

    /** Abort without firing — e.g. the shooter was hit or killed. */
    public cancel(): void {
        if (this.finished) return;
        this.finished = true;
        this.teardown(true);
    }

    private complete(): void {
        if (this.finished) return;
        this.finished = true;

        const cb = this.onComplete;
        this.teardown(false);
        cb?.();
    }

    /**
     * @param abrupt cancelled charges snap out; completed ones flare
     *               outward briefly so the release has a visual pop.
     */
    private teardown(abrupt: boolean): void {
        this.tweens.forEach(t => t.remove());
        this.tweens = [];

        this.timer?.remove();
        this.timer = null;

        this.shakeTimer?.remove();
        this.shakeTimer = null;

        if (abrupt) {
            this.halo.destroy();
            this.core.destroy();
            return;
        }

        this.scene.tweens.add({
            targets: [this.halo, this.core],
            scale: '+=0.6',
            alpha: 0,
            duration: 110,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.halo.destroy();
                this.core.destroy();
            }
        });
    }
}
