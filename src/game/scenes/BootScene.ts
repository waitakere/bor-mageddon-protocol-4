import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.imageLoadType = 'HTMLImageElement';
        this.createLoadingBar();

        // 1. AUDIO
        this.load.audio('1993_ambient', './assets/audio/bor_streets_93.mp3');
        this.load.audioSprite('sfx_atlas', './assets/audio/sfx_atlas.json', [
            './assets/audio/sfx_atlas.mp3'
        ]);

        // 2. SPRITE ATLASES
        this.load.atlas('marko', './assets/sprites/marko.png', './assets/sprites/marko.json');
        this.load.atlas('darko', './assets/sprites/darko.png', './assets/sprites/darko.json');
        this.load.atlas('maja', './assets/sprites/maja.png', './assets/sprites/maja.json');
        this.load.atlas('enemies_1993', './assets/sprites/enemies_1993.png', './assets/sprites/enemies_1993.json');

        // 3. ENVIRONMENTS & PROPS
        this.load.image('part1_sky', './assets/images/environments/part1_sky.png');
        this.load.image('part1_mid', './assets/images/environments/part1_mid.png');
        this.load.image('part1_floor', './assets/images/environments/part1_floor.png');
        
        // VFX - Explosions
        this.load.image('explosion_01', './assets/images/environments/explosion_01.png');
        this.load.image('explosion_02', './assets/images/environments/explosion_02.png');
        this.load.image('explosion_03', './assets/images/environments/explosion_03.png');
        this.load.image('explosion_04', './assets/images/environments/explosion_04.png');

        // Health Items
        this.load.image('item-burek', './assets/images/environments/item-burek.png');
        this.load.image('item-coffee', './assets/images/environments/item-coffee.png');
        this.load.image('item-pork', './assets/images/environments/item-pork.png');
        this.load.image('item-beer', './assets/images/environments/item-beer.png');
        this.load.image('item-sandwich', './assets/images/environments/item-sandwich.png');
        this.load.image('item-rakija', './assets/images/environments/item-rakija.png'); 

        // Breakables
        this.load.image('barrel', './assets/images/environments/barrel.png');
        this.load.image('crate', './assets/images/environments/crate.png');
        this.load.image('kontejner', './assets/images/environments/kontejner.png');
        this.load.image('kiosk', './assets/images/environments/kiosk.png');

        // ==========================================
        // WEAPONS & COMBAT VFX
        // ==========================================
        this.load.image('axe', './assets/images/environments/axe.png');
        this.load.image('bat-2', './assets/images/environments/bat-2.png');
        this.load.image('bat-3', './assets/images/environments/bat-3.png');
        this.load.image('crowbar-1', './assets/images/environments/crowbar-1.png');
        this.load.image('M70-FINAL rev', './assets/images/environments/M70-FINAL rev.png');
        this.load.image('bullet', './assets/images/environments/bullet.png');
        this.load.image('blood_splat', './assets/images/environments/blood_splat.png');
        this.load.image('muzzle-flash-m70', './assets/images/environments/muzzle-flash-m70.png');
    }

    create() {
        window.dispatchEvent(new CustomEvent('phaser-ready'));
        this.scene.start('MainLevel');
    }

    private createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'UČITAVANJE ARHIVE...', {
            font: '20px monospace',
            color: '#39ff14' 
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2, '0%', {
            font: '18px monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value: number) => {
            percentText.setText(`${Math.floor(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0x39ff14, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }
}