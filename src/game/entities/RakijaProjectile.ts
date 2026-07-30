import Phaser from 'phaser';

/**
 * RakijaProjectile - "Energy Rakija" projectile fired by DroneSmederevac.
 * Special Mechanic: Players can hit this projectile mid-air to deflect it back.
 */
export class RakijaProjectile extends Phaser.GameObjects.Container {
  private bottle: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Arc;
  private speed: number = 220;
  private dirX: number;
  private dirY: number;
  private isDeflected: boolean = false;
  private damage: number = 2;
  private lifetime: number = 0;
  private maxLifetime: number = 5000;

  constructor(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number) {
    super(scene, x, y);

    // Bottle shape
    this.bottle = scene.add.rectangle(0, 0, 10, 16, 0xaa6600);
    this.bottle.setStrokeStyle(1, 0xcc8800);
    this.add(this.bottle);

    // Energy glow
    this.glow = scene.add.circle(0, 0, 10, 0xff8800, 0.3);
    this.add(this.glow);

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.dirX = dx / dist;
    this.dirY = dy / dist;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 16);
    body.setOffset(-8, -8);
    body.setVelocity(this.dirX * this.speed, this.dirY * this.speed);
    body.setAllowGravity(false);
  }

  update(delta: number): void {
    this.lifetime += delta;
    this.setDepth(this.y);

    // Pulsing glow
    this.glow.setAlpha(0.2 + Math.sin(this.lifetime * 0.01) * 0.15);

    // Auto-destroy after lifetime
    if (this.lifetime >= this.maxLifetime) {
      this.destroy();
    }

    // Off-screen cleanup
    if (this.x < -50 || this.x > this.scene.scale.width + 50 ||
        this.y < -50 || this.y > this.scene.scale.height + 50) {
      this.destroy();
    }
  }

  /**
   * Deflect the projectile back toward the source.
   */
  deflect(sourceX: number, sourceY: number): void {
    if (this.isDeflected) return;
    this.isDeflected = true;

    const dx = sourceX - this.x;
    const dy = sourceY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.dirX = dx / dist;
    this.dirY = dy / dist;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.dirX * this.speed * 1.5, this.dirY * this.speed * 1.5);

    // Visual feedback for deflection
    this.bottle.fillColor = 0x00ff00;
    this.glow.fillColor = 0x00ff88;
    this.glow.setAlpha(0.6);
  }

  getIsDeflected(): boolean { return this.isDeflected; }
  getDamage(): number { return this.damage; }
}
