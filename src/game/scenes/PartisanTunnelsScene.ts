import Phaser from 'phaser';

export class PartisanTunnelsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PartisanTunnelsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x050510);

    const text = this.add.text(width / 2, height / 2, 'PARTISAN TUNNELS\n(Coming Soon)', {
      fontFamily: 'Press Start 2P',
      fontSize: '20px',
      color: '#cc0000',
      align: 'center'
    });
    text.setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }
}
