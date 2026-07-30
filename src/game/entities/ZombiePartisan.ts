import Phaser from 'phaser';

/**
 * ZombiePartisan - Level 2 standard melee grunt.
 * Rusted bayonet strike attack.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class ZombiePartisan extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private bayonet: Phaser.GameObjects.Rectangle;
  private health: number = 3;
  private speed: number = 70;
  private damage: number = 1;
  private isStabbing: boolean = false;
  private stabCooldown: number = 0;
  private stabCooldownMax: number = 1800;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Tattered uniform body
    this.sprite = scene.add.rectangle(0, 0, 30, 50, 0x3a4a2a);
    this.sprite.setStrokeStyle(2, 0x2a3a1a);
    this.add(this.sprite);

    // Head (decomposed)
    const head = scene.add.circle(0, -30, 11, 0x7a8a5a);
    head.setStrokeStyle(2, 0x5a6a3a);
    this.add(head);

    // Titovka cap
    const cap = scene.add.rectangle(0, -42, 24, 8, 0x4a4a2a);
    this.add(cap);
    const capStar = scene.add.star(0, -42, 5, 2, 5, 0xff0000);
    this.add(capStar);

    // Bayonet
    this.bayonet = scene.add.rectangle(20, 5, 4, 28, 0x888888);
    this.bayonet.setStrokeStyle(1, 0xaaaaaa);
    this.add(this.bayonet);

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

    if (this.stabCooldown > 0) this.stabCooldown -= delta;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.setScale(dx < 0 ? -1 : 1, 1);

    if (this.isStabbing) return;

    if (dist < 45 && this.stabCooldown <= 0) {
      this.performStab();
    } else if (dist > 20) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  private performStab(): void {
    this.isStabbing = true;
    this.stabCooldown = this.stabCooldownMax;

    this.scene.tweens.add({
      targets: this.bayonet,
      x: 35,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        this.isStabbing = false;
      }
    });
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.sprite.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.sprite.fillColor = 0x3a4a2a;
    });
    return this.health <= 0;
  }

  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  isMidAttack(): boolean { return this.isStabbing; }
}
