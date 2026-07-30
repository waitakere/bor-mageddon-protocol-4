import Phaser from 'phaser';

/**
 * TheAlgorithm - Level 3 swarm of nano-pixels.
 * Requires AoE attacks to damage effectively; standard melee only damages 1 pixel.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class TheAlgorithm extends Phaser.GameObjects.Container {
  private pixels: Phaser.GameObjects.Rectangle[] = [];
  private pixelCount: number = 20;
  private health: number = 20; // 1 HP per pixel
  private speed: number = 90;
  private damage: number = 1;
  private swarmRadius: number = 40;
  private swarmTimer: number = 0;
  private isAoEVulnerable: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create swarm of nano-pixels
    for (let i = 0; i < this.pixelCount; i++) {
      const px = (Math.random() - 0.5) * this.swarmRadius * 2;
      const py = (Math.random() - 0.5) * this.swarmRadius * 2;
      const pixel = scene.add.rectangle(px, py, 6, 6, 0x00ff88);
      pixel.setStrokeStyle(1, 0x00ffaa);
      this.add(pixel);
      this.pixels.push(pixel);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 40);
    body.setOffset(-40, -20);
    body.setCollideWorldBounds(true);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    this.swarmTimer += dt;

    // Animate swarm pixels
    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i];
      if (!pixel.active) continue;
      const angle = this.swarmTimer * 3 + (i / this.pixels.length) * Math.PI * 2;
      const r = this.swarmRadius * (0.5 + 0.5 * Math.sin(this.swarmTimer + i));
      pixel.x = Math.cos(angle) * r;
      pixel.y = Math.sin(angle) * r;
    }

    // Chase player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 20) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  /**
   * Standard melee hit: only destroys 1 pixel.
   * Returns true if swarm is fully destroyed.
   */
  takeDamage(amount: number = 1): boolean {
    const toRemove = Math.min(amount, this.pixels.length);
    for (let i = 0; i < toRemove; i++) {
      const pixel = this.pixels.pop();
      if (pixel) {
        pixel.destroy();
        this.health--;
      }
    }
    return this.health <= 0 || this.pixels.length === 0;
  }

  /**
   * AoE hit: destroys multiple pixels at once.
   */
  takeAoEDamage(amount: number = 5): boolean {
    return this.takeDamage(amount);
  }

  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  getPixelCount(): number { return this.pixels.length; }
  getIsAoEVulnerable(): boolean { return this.isAoEVulnerable; }
}
