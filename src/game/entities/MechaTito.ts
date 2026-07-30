import Phaser from 'phaser';

/**
 * MechaTito - Level 2 Boss: 15ft steampunk robot.
 * 3-phase fight:
 *   Phase 1: Background summoning (spawns ZombiePartisans)
 *   Phase 2: Direct combat with "Brotherhood Lasers" (eye beams)
 *   Phase 3: Glitch Entity (teleporting corruption)
 * Uses Classic Gore and belt depth-sorting (Z = position.y).
 */
export type MechaTitoPhase = 1 | 2 | 3;

export class MechaTito extends Phaser.GameObjects.Container {
  private torso: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private eyeL: Phaser.GameObjects.Arc;
  private eyeR: Phaser.GameObjects.Arc;
  private health: number = 50;
  private maxHealth: number = 50;
  private speed: number = 35;
  private damage: number = 4;
  private phase: MechaTitoPhase = 1;
  private phaseTimer: number = 0;
  private attackCooldown: number = 0;
  private summonCooldown: number = 0;
  private laserBeams: Phaser.GameObjects.Rectangle[] = [];
  private teleportCooldown: number = 0;
  private glitchFlicker: number = 0;
  private onSummonPartisan: ((x: number, y: number) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Massive steampunk torso
    this.torso = scene.add.rectangle(0, 0, 90, 140, 0x6b4f3a);
    this.torso.setStrokeStyle(3, 0x8b6f5a);
    this.add(this.torso);

    // Boiler/chest detail
    const boiler = scene.add.circle(0, -10, 20, 0xcc6600);
    boiler.setStrokeStyle(2, 0xff8800);
    this.add(boiler);

    // Steam pipes
    const pipeL = scene.add.rectangle(-35, -30, 8, 50, 0x888888);
    this.add(pipeL);
    const pipeR = scene.add.rectangle(35, -30, 8, 50, 0x888888);
    this.add(pipeR);

    // Head
    this.head = scene.add.rectangle(0, -90, 50, 40, 0x8b7355);
    this.head.setStrokeStyle(2, 0xaa9370);
    this.add(this.head);

    // Marshal cap
    const cap = scene.add.rectangle(0, -116, 60, 14, 0x2a2a6a);
    cap.setStrokeStyle(1, 0x4a4a9a);
    this.add(cap);
    const star = scene.add.star(0, -116, 5, 4, 8, 0xff0000);
    this.add(star);

    // Eyes (brotherhood laser emitters)
    this.eyeL = scene.add.circle(-12, -90, 6, 0x00ff00);
    this.eyeR = scene.add.circle(12, -90, 6, 0x00ff00);
    this.add(this.eyeL);
    this.add(this.eyeR);

    // Arms
    const armL = scene.add.rectangle(-56, -20, 22, 80, 0x6b4f3a);
    armL.setStrokeStyle(2, 0x8b6f5a);
    this.add(armL);
    const armR = scene.add.rectangle(56, -20, 22, 80, 0x6b4f3a);
    armR.setStrokeStyle(2, 0x8b6f5a);
    this.add(armR);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 40);
    body.setOffset(-40, 90);
    body.setCollideWorldBounds(true);
  }

  setSummonCallback(cb: (x: number, y: number) => void): void {
    this.onSummonPartisan = cb;
  }

  update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    this.setDepth(this.y);

    this.phaseTimer += delta;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.summonCooldown = Math.max(0, this.summonCooldown - delta);
    this.teleportCooldown = Math.max(0, this.teleportCooldown - delta);

    // Phase transitions based on health
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent <= 0.33 && this.phase < 3) {
      this.phase = 3;
      this.speed = 60;
    } else if (healthPercent <= 0.66 && this.phase < 2) {
      this.phase = 2;
      this.speed = 45;
    }

    switch (this.phase) {
      case 1: this.updatePhase1(dt, playerX, playerY); break;
      case 2: this.updatePhase2(dt, playerX, playerY); break;
      case 3: this.updatePhase3(dt, playerX, playerY); break;
    }

    // Cleanup beams
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      if (!beam.active) {
        this.laserBeams.splice(i, 1);
      }
    }
  }

  /** Phase 1: Summon ZombiePartisans from background */
  private updatePhase1(dt: number, playerX: number, playerY: number): void {
    // Slow patrol
    const dx = playerX - this.x;
    if (Math.abs(dx) > 200) {
      this.x += Math.sign(dx) * this.speed * dt;
    }

    // Summon partisans
    if (this.summonCooldown <= 0 && this.onSummonPartisan) {
      const spawnX = this.x + (Math.random() > 0.5 ? 150 : -150);
      const spawnY = this.y + Math.random() * 40 - 20;
      this.onSummonPartisan(spawnX, spawnY);
      this.summonCooldown = 5000;
    }
  }

  /** Phase 2: Brotherhood Lasers (eye beams) */
  private updatePhase2(dt: number, playerX: number, playerY: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 100) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    if (this.attackCooldown <= 0) {
      this.fireBrotherhoodLaser(playerX, playerY);
      this.attackCooldown = 2500;
    }

    this.eyeL.fillColor = 0xff0000;
    this.eyeR.fillColor = 0xff0000;
  }

  /** Phase 3: Glitch Entity - teleporting corruption */
  private updatePhase3(dt: number, playerX: number, playerY: number): void {
    // Glitch flicker
    this.glitchFlicker += dt;
    this.alpha = Math.sin(this.glitchFlicker * 15) * 0.3 + 0.7;
    this.torso.fillColor = Math.random() > 0.5 ? 0xff00ff : 0x6b4f3a;

    // Teleport
    if (this.teleportCooldown <= 0) {
      this.x = playerX + (Math.random() > 0.5 ? 120 : -120);
      this.y = playerY + Math.random() * 40 - 20;
      this.teleportCooldown = 2000;
    }

    // Fire laser when close
    if (this.attackCooldown <= 0) {
      this.fireBrotherhoodLaser(playerX, playerY);
      this.attackCooldown = 1500;
    }
  }

  private fireBrotherhoodLaser(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - (this.y - 90);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const beam = this.scene.add.rectangle(
      this.x, this.y - 90, dist, 6, 0xff0000
    );
    beam.setOrigin(0, 0.5);
    beam.setRotation(angle);
    beam.setAlpha(0.8);
    this.scene.physics.add.existing(beam);

    this.laserBeams.push(beam);

    this.scene.time.delayedCall(300, () => {
      beam.destroy();
    });
  }

  takeDamage(amount: number = 1): boolean {
    this.health -= amount;
    this.head.fillColor = 0xff0000;
    this.scene.time.delayedCall(100, () => {
      this.head.fillColor = 0x8b7355;
    });
    return this.health <= 0;
  }

  getPhase(): MechaTitoPhase { return this.phase; }
  getLaserBeams(): Phaser.GameObjects.Rectangle[] { return this.laserBeams; }
  getDamage(): number { return this.damage; }
  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }

  destroy(fromScene?: boolean): void {
    this.laserBeams.forEach(b => b.destroy());
    this.laserBeams = [];
    super.destroy(fromScene);
  }
}
