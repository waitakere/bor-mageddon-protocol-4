import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnemyManager } from '../systems/EnemyManager';
import { AudioManager } from '../systems/AudioManager';
import { GoreManager } from '../systems/GoreManager';
import { CollisionManager } from '../systems/CollisionManager';

/**
 * MainLevel: Orchestrates the 1993 Bor Industrial sequence.
 * Supports Marko, Darko, and Maja with universal weapon and sound logic.
 */
export class MainLevel extends Phaser.Scene {
  // Environment layers for Parallax effect
  private sky!: Phaser.GameObjects.Image;
  private midground!: Phaser.GameObjects.TileSprite;
  private floor!: Phaser.GameObjects.TileSprite;

  // System Managers
  public audio!: AudioManager;
  public gore!: GoreManager;
  private collisionManager!: CollisionManager;
  private enemyManager!: EnemyManager;

  // Combat Entities
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;

  constructor() {
    super({ key: 'MainLevel' }); // [cite: 2648]
  }

  create() {
    // 1. Systems Initialization [cite: 2649]
    this.audio = new AudioManager(this);
    this.gore = new GoreManager(this);
    this.collisionManager = new CollisionManager(this);

    // 2. Parallax Setup (Sky, Mid, Floor) [cite: 152, 2651]
    // Sky is fixed, Midground moves slower than the floor for depth
    this.sky = this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0);
    this.midground = this.add.tileSprite(0, 430, 1920, 400, 'mid')
      .setOrigin(0).setScrollFactor(0.4);
    this.floor = this.add.tileSprite(0, 830, 1920, 250, 'floor')
      .setOrigin(0).setScrollFactor(1);

    // 3. World Constraints (The 250px "Road Belt") [cite: 2653]
    // Limits movement on the Y-axis to simulate the belt-scroller perspective
    this.physics.world.setBounds(0, 830, 5000, 250);
    this.cameras.main.setBounds(0, 0, 5000, 1080);

    // 4. Player Initialization 
    // Pulls selected character (Marko, Darko, Maja) from the registry
    const selectedChar = this.registry.get('selectedCharacter') || 'marko';
    this.player = new Player(this, 200, 950, selectedChar, this.audio);

    // 5. Combat & Collisions [cite: 2655, 2656]
    this.enemies = this.physics.add.group();
    this.collisionManager.setupMeleeCollisions(this.player, this.enemies);

    // 6. Wave Management & BGM [cite: 2657, 2658]
    this.enemyManager = new EnemyManager(this, this.enemies, this.gore, this.audio);
    this.enemyManager.startLevel1();
    
    // Follow the player with a slight camera delay for "juice"
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.sound.play('bgm_industrial_1993', { loop: true, volume: 0.4 });

    // 7. Launch UI HUD [cite: 2659]
    this.scene.launch('UIScene');
  }

  update() {
    // Standard logic loop updates [cite: 2660, 2661]
    this.player.update();
    this.enemyManager.update(this.player);

    // Handle Parallax Loop
    this.midground.tilePositionX = this.cameras.main.scrollX * 0.4;
    this.floor.tilePositionX = this.cameras.main.scrollX;

    // 8. Dynamic Depth Sorting (The "Belt" System) [cite: 125, 2662]
    // Ensures characters with higher Y-coords are drawn on top
    this.player.setDepth(this.player.y);
    this.enemies.getChildren().forEach(enemy => {
      (enemy as Phaser.Physics.Arcade.Sprite).setDepth(enemy.y);
    });
  }
}
