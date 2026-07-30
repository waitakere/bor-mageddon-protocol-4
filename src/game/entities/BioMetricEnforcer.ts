import Phaser from 'phaser';

/**
 * BioMetricEnforcer - Level 3 bulky robot.
 * Twin stun baton slams and electrical discharge effects.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class BioMetricEnforcer extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private batonL: Phaser.GameObjects.Rectangle;
  private batonR: Phaser.GameObjects.Rectangle;
  private health: number = 7;
  private speed: number = 65;
  private damage: number = 3;
  private slamCooldown: number = 0;
  private slamCooldownMax: number = 2800;
  private isSlamming: boolean = false;
  private dischargeCooldown: number = 0;
  private dischargeCooldownMax: number = 5000;
  private dischargeRings: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Bulky robot body
    this.sprite = scene.add.rectangle(0, 0, 50, 64, 0x555588);
    this.sprite.setStrokeStyle(3, 0x7777aa);
    this.add(this.sprite);

    // Visor head
    const head = scene.add.rectangle(0, -38, 40, 18, 0x333355);
    head.setStrokeStyle(2, 0x5555aa);
    this.add(head);

    // Visor glow
    const visor = scene.add.rectangle(0, -38, 30, 6, 0xff0000);
    this.add(visor);

    // Twin stun batons
    this.batonL = scene.add.rectangle(-32, 5, 8, 36, 0xcccc00);
    this.batonL.setStrokeStyle(1, 0xffff00);
    this.add(this.batonL);

    this.batonR = scene.add.rectangle(32, 5, 8, 36, 0xcccc00);
    this.batonR.setStrokeStyle(1, 0xffff00);
    this.add(this.batonR);

    // Shoulder armor
    const shoulderL = scene.add.rectangle(-30, -20, 16, 12, 0x666699);
    const shoulderR = scene.add.rectangle(30, -20, 16, 12, 0x666699);
    this.add(shoulderL);
    this.add(shoulderR);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 40);
    body.setOffset(-40, 28);
    body.setCollideWorldBounds(true);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    if (this.slamCooldown > 0) this.slamCooldown -= delta;
    if (this.dischargeCooldown > 0) this.dischargeCooldown -= delta;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.setScale(dx < 0 ? -1 : 1, 1);

    if (this.isSlamming) return;

    // Baton slam
    if (dist < 55 && this.slamCooldown <= 0) {
      this.performSlam();
    }
    // Electrical discharge
    else if (dist < 120 && this.dischargeCooldown <= 0) {
      this.electricalDischarge();
    }
    // Pursue
    else if (dist > 30) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    // Update discharge rings
    for (let i = this.dischargeRings.length - 1; i >= 0; i--) {
      const ring = this.dischargeRings[i];
      if (!ring.active) {
        this.dischargeRings.splice(i, 1);
        continue;
      }
      ring.setScale(ring.scaleX + 3 * dt);
      ring.setAlpha(ring.alpha - dt);
      if (ring.alpha <= 0) {
        ring.destroy();
        this.dischargeRings.splice(i, 1);
      }
    }
  }

  private performSlam(): void {
    this.isSlamming = true;
    this.slamCooldown = this.slamCooldownMax;

    // Slam animation
    this.scene.tweens.add({
      targets: [this.batonL, this.batonR],
      angle: 45,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.isSlamming = false;
      }
    });
  }

  private electricalDischarge(): void {
    this.dischargeCooldown = this.dischargeCooldownMax;

    const ring = this.scene.add.circle(this.x, this.y, 15, 0xffff00, 0);
    ring.setStrokeStyle(2, 0xffff00);
    ring.setAlpha(0.9);
    this.scene.physics.add.existing(ring);
    (ring.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.dischargeRings.push(ring);
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.sprite.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.sprite.fillColor = 0x555588;
    });
    return this.health <= 0;
  }

  getDischargeRings(): Phaser.GameObjects.Arc[] { return this.dischargeRings; }
  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  isMidSlam(): boolean { return this.isSlamming; }

  destroy(fromScene?: boolean): void {
    this.dischargeRings.forEach(r => r.destroy());
    this.dischargeRings = [];
    super.destroy(fromScene);
  }
}
