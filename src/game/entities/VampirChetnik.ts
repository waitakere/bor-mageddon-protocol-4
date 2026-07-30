import Phaser from 'phaser';

/**
 * VampirChetnik - Level 2 high-mobility unit.
 * Leaping dive-kicks and claw attacks.
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export class VampirChetnik extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Rectangle;
  private health: number = 4;
  private speed: number = 160;
  private damage: number = 2;
  private isLeaping: boolean = false;
  private leapCooldown: number = 0;
  private leapCooldownMax: number = 2500;
  private clawCooldown: number = 0;
  private clawCooldownMax: number = 1000;
  private isClawing: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Gaunt body
    this.sprite = scene.add.rectangle(0, 0, 32, 56, 0x2a0a0a);
    this.sprite.setStrokeStyle(2, 0x550000);
    this.add(this.sprite);

    // Head with beard
    const head = scene.add.circle(0, -34, 12, 0x998877);
    head.setStrokeStyle(2, 0x665544);
    this.add(head);

    // Fangs
    const fangL = scene.add.rectangle(-4, -24, 3, 6, 0xffffff);
    const fangR = scene.add.rectangle(4, -24, 3, 6, 0xffffff);
    this.add(fangL);
    this.add(fangR);

    // Eyes (red glow)
    const eyeL = scene.add.circle(-6, -36, 3, 0xff0000);
    const eyeR = scene.add.circle(6, -36, 3, 0xff0000);
    this.add(eyeL);
    this.add(eyeR);

    // Claws
    const clawL = scene.add.rectangle(-22, 4, 10, 4, 0xcccccc);
    const clawR = scene.add.rectangle(22, 4, 10, 4, 0xcccccc);
    this.add(clawL);
    this.add(clawR);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 40);
    body.setOffset(-40, 20);
    body.setCollideWorldBounds(true);
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    if (this.leapCooldown > 0) this.leapCooldown -= delta;
    if (this.clawCooldown > 0) this.clawCooldown -= delta;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.setScale(dx < 0 ? -1 : 1, 1);

    if (this.isLeaping) return;

    // Leap dive-kick at range
    if (dist > 100 && dist < 250 && this.leapCooldown <= 0) {
      this.performLeap(playerX, playerY);
    }
    // Claw attack at close range
    else if (dist < 50 && this.clawCooldown <= 0) {
      this.performClaw();
    }
    // Pursue
    else if (dist > 30) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  private performLeap(targetX: number, targetY: number): void {
    this.isLeaping = true;
    this.leapCooldown = this.leapCooldownMax;

    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isLeaping = false;
      }
    });
  }

  private performClaw(): void {
    this.isClawing = true;
    this.sprite.fillColor = 0x880000;
    this.clawCooldown = this.clawCooldownMax;

    this.scene.time.delayedCall(200, () => {
      this.isClawing = false;
      this.sprite.fillColor = 0x2a0a0a;
    });
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.sprite.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.sprite.fillColor = 0x2a0a0a;
    });
    return this.health <= 0;
  }

  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  isAttacking(): boolean { return this.isClawing || this.isLeaping; }
}
