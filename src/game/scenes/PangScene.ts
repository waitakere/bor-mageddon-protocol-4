import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy, BanknoteType } from '../entities/Enemy';
import { EnemyManager } from '../entities/EnemyManager';
import { GoreManager } from '../systems/GoreManager';
import { scoreService } from '../services/ScoreService';
import { eventBus, GameEvents } from '../EventBus';

export class PangScene extends Phaser.Scene {
  private player!: Player;
  private enemyManager!: EnemyManager;
  private goreManager!: GoreManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private beams: Phaser.GameObjects.Rectangle[] = [];
  private parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  private isPaused: boolean = false;
  private level: number = 1;
  private waveNumber: number = 1;

  // HUD elements
  private scoreText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PangScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Reset score
    scoreService.resetScore();

    // Create parallax background
    this.createParallaxBackground();

    // Initialize managers
    this.goreManager = new GoreManager(this);
    this.enemyManager = new EnemyManager(this);

    // Create player
    this.player = new Player(this, width / 2, height - 100);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.shoot();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.togglePause();
    });

    // Create HUD
    this.createHUD();

    // Spawn initial wave
    this.enemyManager.spawnWave(2);

    // Camera fade in
    this.cameras.main.fadeIn(500);
  }

  private createParallaxBackground(): void {
    const { width, height } = this.cameras.main;

    // Sky layer (slowest)
    const sky = this.add.tileSprite(0, 0, width, height, 'bg_sky');
    sky.setOrigin(0, 0);
    sky.setDepth(-30);
    this.parallaxLayers.push(sky);

    // Mid layer (buildings)
    const mid = this.add.tileSprite(0, 0, width, height, 'bg_mid');
    mid.setOrigin(0, 0);
    mid.setDepth(-20);
    this.parallaxLayers.push(mid);

    // Floor layer (fastest)
    const floor = this.add.tileSprite(0, height - 60, width, 100, 'bg_floor');
    floor.setOrigin(0, 0);
    floor.setDepth(-10);
    this.parallaxLayers.push(floor);
  }

  private createHUD(): void {
    // Score display
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
      fontFamily: 'Press Start 2P',
      fontSize: '14px',
      color: '#fbbf24',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 0,
        fill: true
      }
    });
    this.scoreText.setDepth(1000);
    this.scoreText.setScrollFactor(0);

    // Health display
    this.healthText = this.add.text(20, 50, '❤❤❤', {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#cc0000'
    });
    this.healthText.setDepth(1000);
    this.healthText.setScrollFactor(0);

    // Level display
    const { width } = this.cameras.main;
    this.levelText = this.add.text(width - 20, 20, `LEVEL ${this.level}`, {
      fontFamily: 'Press Start 2P',
      fontSize: '14px',
      color: '#888888',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 0,
        fill: true
      }
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setDepth(1000);
    this.levelText.setScrollFactor(0);
  }

  private updateHUD(): void {
    const score = scoreService.getCurrentScore();
    const health = this.player.getHealth();

    this.scoreText.setText(`SCORE: ${scoreService.formatScore(score)}`);
    this.healthText.setText('❤'.repeat(health) + '♡'.repeat(3 - health));

    // Emit to React HUD via EventBus
    eventBus.emit(GameEvents.SCORE_UPDATE, score);
    eventBus.emit(GameEvents.HEALTH_UPDATE, health, this.player.getMaxHealth());
    eventBus.emit(GameEvents.LEVEL_UPDATE, this.level);
    eventBus.emit(GameEvents.WAVE_UPDATE, this.waveNumber);
  }

  private shoot(): void {
    if (this.isPaused) return;

    const beam = this.player.shoot();
    if (beam) {
      this.beams.push(beam);
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.pause();
      
      const { width, height } = this.cameras.main;
      const pauseOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
      pauseOverlay.setName('pauseOverlay');
      pauseOverlay.setDepth(999);

      const pauseText = this.add.text(width / 2, height / 2, 'PAUSED', {
        fontFamily: 'Press Start 2P',
        fontSize: '32px',
        color: '#cc0000'
      });
      pauseText.setOrigin(0.5);
      pauseText.setName('pauseText');
      pauseText.setDepth(1000);
    } else {
      this.physics.resume();
      this.children.getByName('pauseOverlay')?.destroy();
      this.children.getByName('pauseText')?.destroy();
    }
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;

    // Update player
    this.player.update(this.cursors);

    // Belt depth-sort: Z = position.y for player
    this.player.setDepth(this.player.y);

    // Update parallax (based on player position)
    const playerVelX = (this.player.body as Phaser.Physics.Arcade.Body).velocity.x;
    if (this.parallaxLayers[0]) this.parallaxLayers[0].tilePositionX += playerVelX * 0.001;
    if (this.parallaxLayers[1]) this.parallaxLayers[1].tilePositionX += playerVelX * 0.005;
    if (this.parallaxLayers[2]) this.parallaxLayers[2].tilePositionX += playerVelX * 0.01;

    // Update enemy manager
    this.enemyManager.update(delta);

    // Update gore
    this.goreManager.update(delta);

    // Update beams and check collisions
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      
      if (!beam.active) {
        this.beams.splice(i, 1);
        continue;
      }

      // Check if off screen
      if (beam.y < -50) {
        beam.destroy();
        this.beams.splice(i, 1);
        continue;
      }

      // Check collision with enemies (AABB collision)
      for (const enemy of this.enemyManager.getEnemies()) {
        // Belt depth-sort: Z = position.y for enemies
        enemy.setDepth(enemy.y);
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          beam.getBounds(),
          enemy.getBounds()
        )) {
          // Hit!
          const config = enemy.getConfig();
          scoreService.addScore(config.scoreValue);

          // Spawn gore effect
          if (config.type === 'STAR') {
            this.goreManager.spawnBloodSplatter(enemy.x, enemy.y, 1.5);
          } else {
            this.goreManager.spawnDinarExplosion(enemy.x, enemy.y);
          }

          // Split enemy
          this.enemyManager.handleHit(enemy);

          // Destroy beam
          beam.destroy();
          this.beams.splice(i, 1);
          break;
        }
      }
    }

    // Check player-enemy collision
    for (const enemy of this.enemyManager.getEnemies()) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        this.player.getBounds(),
        enemy.getBounds()
      )) {
        const isDead = this.player.takeDamage();
        this.goreManager.spawnBloodSplatter(this.player.x, this.player.y, 0.5);
        
        if (isDead) {
          this.gameOver();
          return;
        }
      }
    }

    // Check for wave completion
    if (this.enemyManager.getEnemyCount() === 0) {
      this.nextWave();
    }

    // Update HUD
    this.updateHUD();
  }

  private nextWave(): void {
    this.waveNumber++;
    
    if (this.waveNumber > 3) {
      this.waveNumber = 1;
      this.level++;
      this.levelText.setText(`LEVEL ${this.level}`);
      this.enemyManager.increaseDifficulty();
    }

    // Show wave text
    const { width, height } = this.cameras.main;
    const waveText = this.add.text(width / 2, height / 2, `WAVE ${this.waveNumber}`, {
      fontFamily: 'Press Start 2P',
      fontSize: '24px',
      color: '#fbbf24'
    });
    waveText.setOrigin(0.5);
    waveText.setDepth(500);

    this.tweens.add({
      targets: waveText,
      alpha: 0,
      scale: 2,
      duration: 1000,
      onComplete: () => {
        waveText.destroy();
        this.enemyManager.spawnWave(Math.min(2 + this.level, 5));
      }
    });
  }

  private gameOver(): void {
    const { width, height } = this.cameras.main;

    this.physics.pause();
    eventBus.emit(GameEvents.GAME_OVER, scoreService.getCurrentScore());

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(998);

    const gameOverText = this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
      fontFamily: 'Press Start 2P',
      fontSize: '32px',
      color: '#cc0000'
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(999);

    const finalScore = this.add.text(width / 2, height / 2 + 20, 
      `FINAL SCORE: ${scoreService.formatScore(scoreService.getCurrentScore())}`, {
      fontFamily: 'Press Start 2P',
      fontSize: '14px',
      color: '#fbbf24'
    });
    finalScore.setOrigin(0.5);
    finalScore.setDepth(999);

    const restartText = this.add.text(width / 2, height / 2 + 80, 'PRESS SPACE TO RESTART', {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#888888'
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(999);

    this.tweens.add({
      targets: restartText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }

  shutdown(): void {
    this.goreManager.destroy();
    this.enemyManager.destroy();
  }
}
