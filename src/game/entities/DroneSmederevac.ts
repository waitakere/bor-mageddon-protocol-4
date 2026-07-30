import Phaser from 'phaser';

/**
 * DroneSmederevac - Level 3 floating stove-shaped turret.
 * Fires "Energy Rakija" projectiles (RakijaProjectile).
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class DroneSmederevac extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private health: number = 2;
  private speed: number = 120;
  private fireRate: number = 2000;
  private fireTimer: number = 0;
  private hoverOffset: number = 0;
  private hoverSpeed: number = 2;
  private projectiles: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Drone body
    this.sprite = scene.add.rectangle(0, 0, 36, 20, 0x555577);
    this.sprite.setStrokeStyle(2, 0x7777aa);
    this.add(this.sprite);

    // Rotor left
    const rotorL = scene.add.rectangle(-16, -8, 14, 4, 0x888888);
    this.add(rotorL);

    // Rotor right
    const rotorR = scene.add.rectangle(16, -8, 14, 4, 0x888888);
    this.add(rotorR);

    // Eye/sensor
    const eye = scene.add.circle(0, 2, 4, 0xff0000);
    this.add(eye);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(36, 20);
    body.setAllowGravity(false);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;

    // Belt depth-sort: Z = position.y
    this.setDepth(this.y);

    // Hover oscillation
    this.hoverOffset += this.hoverSpeed * dt;
    this.y += Math.sin(this.hoverOffset) * 0.5;

    // Move toward player X but stay elevated
    const dx = playerX - this.x;
    if (Math.abs(dx) > 20) {
      this.x += Math.sign(dx) * this.speed * dt;
    }

    // Fire projectiles
    this.fireTimer += delta;
    if (this.fireTimer >= this.fireRate) {
      this.fireTimer = 0;
      this.fireProjectile();
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active || proj.y > this.scene.scale.height) {
        proj.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private fireProjectile(): void {
    const proj = this.scene.add.rectangle(this.x, this.y + 15, 6, 12, 0xff4444);
    proj.setStrokeStyle(1, 0xff0000);
    this.scene.physics.add.existing(proj);
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(200);
    body.setAllowGravity(false);
    this.projectiles.push(proj);
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.sprite.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.sprite.fillColor = 0x555577;
    });
    return this.health <= 0;
  }

  getProjectiles(): Phaser.GameObjects.Rectangle[] {
    return this.projectiles;
  }

  getHealth(): number {
    return this.health;
  }

  destroy(fromScene?: boolean): void {
    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];
    super.destroy(fromScene);
  }
}
