import Phaser from 'phaser';

/**
 * BIABoss - Level 3 Final Boss: Propaganda Quadcopter.
 * Bio-container brain with hologram face.
 * Underslung LRAD acoustic cannons fire expanding ring projectiles.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class BIABoss extends Phaser.GameObjects.Container {
  private body_frame: Phaser.GameObjects.Rectangle;
  private brainJar: Phaser.GameObjects.Ellipse;
  private health: number = 60;
  private maxHealth: number = 60;
  private speed: number = 90;
  private damage: number = 3;
  private lradCooldown: number = 0;
  private lradCooldownMax: number = 3000;
  private hoverOffset: number = 0;
  private sonicRings: Phaser.GameObjects.Arc[] = [];
  private hologramFlicker: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Quadcopter frame
    this.body_frame = scene.add.rectangle(0, 0, 100, 40, 0x333355);
    this.body_frame.setStrokeStyle(3, 0x5555aa);
    this.add(this.body_frame);

    // Rotors
    for (const ox of [-40, -20, 20, 40]) {
      const rotor = scene.add.rectangle(ox, -18, 18, 4, 0x888888);
      this.add(rotor);
    }

    // Bio-container brain jar
    this.brainJar = scene.add.ellipse(0, 5, 30, 24, 0x44ff88, 0.6);
    this.brainJar.setStrokeStyle(2, 0x00ff44);
    this.add(this.brainJar);

    // Hologram face (Vučić)
    const face = scene.add.rectangle(0, -40, 36, 40, 0x4488ff, 0.4);
    face.setStrokeStyle(1, 0x66aaff);
    this.add(face);

    // Hologram eyes
    const hEyeL = scene.add.circle(-8, -44, 3, 0xffffff, 0.7);
    const hEyeR = scene.add.circle(8, -44, 3, 0xffffff, 0.7);
    this.add(hEyeL);
    this.add(hEyeR);

    // LRAD cannons (underslung)
    const lradL = scene.add.rectangle(-30, 20, 14, 10, 0x666666);
    lradL.setStrokeStyle(1, 0x999999);
    this.add(lradL);
    const lradR = scene.add.rectangle(30, 20, 14, 10, 0x666666);
    lradR.setStrokeStyle(1, 0x999999);
    this.add(lradR);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(100, 40);
    body.setOffset(-50, -20);
    body.setAllowGravity(false);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    // Hover oscillation
    this.hoverOffset += 2.5 * dt;
    this.y += Math.sin(this.hoverOffset) * 0.6;

    // Hologram flicker
    this.hologramFlicker += dt;
    if (Math.sin(this.hologramFlicker * 8) > 0.8) {
      this.alpha = 0.7;
    } else {
      this.alpha = 1;
    }

    // Track player
    const dx = playerX - this.x;
    if (Math.abs(dx) > 30) {
      this.x += Math.sign(dx) * this.speed * dt;
    }

    // LRAD sonic attack
    this.lradCooldown = Math.max(0, this.lradCooldown - delta);
    if (this.lradCooldown <= 0) {
      this.fireLRAD();
      this.lradCooldown = this.lradCooldownMax;
    }

    // Update sonic rings (expand and fade)
    for (let i = this.sonicRings.length - 1; i >= 0; i--) {
      const ring = this.sonicRings[i];
      if (!ring.active) {
        this.sonicRings.splice(i, 1);
        continue;
      }
      ring.setScale(ring.scaleX + 2 * dt);
      ring.setAlpha(ring.alpha - 0.5 * dt);
      if (ring.alpha <= 0) {
        ring.destroy();
        this.sonicRings.splice(i, 1);
      }
    }
  }

  private fireLRAD(): void {
    const ring = this.scene.add.circle(this.x, this.y + 20, 20, 0x00ffff, 0);
    ring.setStrokeStyle(3, 0x00ffff);
    ring.setAlpha(0.8);
    this.scene.physics.add.existing(ring);
    (ring.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.sonicRings.push(ring);
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.body_frame.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.body_frame.fillColor = 0x333355;
    });
    return this.health <= 0;
  }

  getSonicRings(): Phaser.GameObjects.Arc[] { return this.sonicRings; }
  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }

  destroy(fromScene?: boolean): void {
    this.sonicRings.forEach(r => r.destroy());
    this.sonicRings = [];
    super.destroy(fromScene);
  }
}
