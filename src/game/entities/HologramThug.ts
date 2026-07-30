import Phaser from 'phaser';

/**
 * HologramThug - Level 3 enemy with invulnerability logic.
 * Flickers transparency and becomes physically unhittable on a timer.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class HologramThug extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private health: number = 3;
  private speed: number = 110;
  private damage: number = 2;
  private isInvulnerable: boolean = false;
  private invulnTimer: number = 0;
  private invulnDuration: number = 2000;
  private vulnerableDuration: number = 3000;
  private phaseTimer: number = 0;
  private attackCooldown: number = 0;
  private attackCooldownMax: number = 1200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Holographic body
    this.sprite = scene.add.rectangle(0, 0, 32, 50, 0x4488ff, 0.6);
    this.sprite.setStrokeStyle(2, 0x66aaff);
    this.add(this.sprite);

    // Head
    const head = scene.add.circle(0, -30, 11, 0x66aaff, 0.6);
    head.setStrokeStyle(2, 0x88ccff);
    this.add(head);

    // Scan lines
    for (let i = -20; i <= 20; i += 10) {
      const line = scene.add.rectangle(0, i, 32, 1, 0xffffff, 0.2);
      this.add(line);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 40);
    body.setOffset(-40, 15);
    body.setCollideWorldBounds(true);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    // Phase timer for invulnerability cycle
    this.phaseTimer += delta;
    this.invulnTimer += delta;

    if (this.isInvulnerable) {
      // Flicker effect
      this.alpha = Math.sin(this.phaseTimer * 0.02) * 0.3 + 0.3;
      if (this.invulnTimer >= this.invulnDuration) {
        this.isInvulnerable = false;
        this.invulnTimer = 0;
        this.alpha = 0.8;
      }
    } else {
      this.alpha = 0.8;
      if (this.invulnTimer >= this.vulnerableDuration) {
        this.isInvulnerable = true;
        this.invulnTimer = 0;
      }
    }

    // Chase player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.setScale(dx < 0 ? -1 : 1, 1);

    if (dist > 30) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  takeDamage(amount: number = 1): boolean {
    if (this.isInvulnerable) return false;

    this.health -= amount;
    this.sprite.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.sprite.fillColor = 0x4488ff;
    });
    return this.health <= 0;
  }

  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  getIsInvulnerable(): boolean { return this.isInvulnerable; }
}
