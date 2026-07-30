import Phaser from 'phaser';

/**
 * GestapoGhoul - Level 2 skeletal ranged unit.
 * Fires Luger P08 projectiles at the player.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class GestapoGhoul extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private health: number = 3;
  private speed: number = 55;
  private damage: number = 2;
  private fireRate: number = 2200;
  private fireTimer: number = 0;
  private preferredRange: number = 200;
  private projectiles: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Skeletal body in tattered uniform
    this.sprite = scene.add.rectangle(0, 0, 28, 52, 0x2a2a2a);
    this.sprite.setStrokeStyle(2, 0x444444);
    this.add(this.sprite);

    // Skull head
    const skull = scene.add.circle(0, -32, 10, 0xddddcc);
    skull.setStrokeStyle(2, 0x999988);
    this.add(skull);

    // Officer cap
    const cap = scene.add.rectangle(0, -44, 22, 8, 0x1a1a1a);
    this.add(cap);
    const visor = scene.add.rectangle(0, -39, 24, 3, 0x111111);
    this.add(visor);

    // Hollow eyes
    const eyeL = scene.add.circle(-4, -33, 2, 0x00ff00);
    const eyeR = scene.add.circle(4, -33, 2, 0x00ff00);
    this.add(eyeL);
    this.add(eyeR);

    // Luger pistol
    const gun = scene.add.rectangle(18, 0, 14, 5, 0x333333);
    gun.setStrokeStyle(1, 0x555555);
    this.add(gun);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 40);
    body.setOffset(-40, 16);
    body.setCollideWorldBounds(true);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.setScale(dx < 0 ? -1 : 1, 1);

    // Maintain preferred range
    if (dist > this.preferredRange + 30) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    } else if (dist < this.preferredRange - 30) {
      this.x -= (dx / dist) * this.speed * 0.6 * dt;
      this.y -= (dy / dist) * this.speed * 0.6 * dt;
    }

    // Fire Luger P08
    this.fireTimer += delta;
    if (this.fireTimer >= this.fireRate && dist < 350) {
      this.fireTimer = 0;
      this.fireLuger(playerX, playerY);
    }

    // Cleanup projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active || proj.x < -50 || proj.x > this.scene.scale.width + 50 ||
          proj.y < -50 || proj.y > this.scene.scale.height + 50) {
        proj.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private fireLuger(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const proj = this.scene.add.rectangle(this.x + (dx > 0 ? 18 : -18), this.y, 8, 4, 0xffcc00);
    proj.setStrokeStyle(1, 0xff8800);
    this.scene.physics.add.existing(proj);

    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / dist) * 300, (dy / dist) * 300);
    body.setAllowGravity(false);

    this.projectiles.push(proj);
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.sprite.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.sprite.fillColor = 0x2a2a2a;
    });
    return this.health <= 0;
  }

  getProjectiles(): Phaser.GameObjects.Rectangle[] { return this.projectiles; }
  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }

  destroy(fromScene?: boolean): void {
    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];
    super.destroy(fromScene);
  }
}
