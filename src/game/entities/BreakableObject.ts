import Phaser from 'phaser';

export type BreakableType = 'crate' | 'barrel' | 'kiosk' | 'kontejner';

export class BreakableObject extends Phaser.Physics.Arcade.Sprite {
    public health: number;
    public isDead: boolean = false;
    public isBreakable: boolean = true; // NEW: Flag to help players recognize props

    constructor(scene: Phaser.Scene, x: number, y: number, type: BreakableType) {
        super(scene, x, y, type); 
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        
        switch(type) {
            case 'barrel': this.setScale(2.5); break; 
            case 'crate': this.setScale(0.8); break;  
            case 'kiosk': this.setScale(2.3); break;  
            case 'kontejner': this.setScale(1.5); break;
        }
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true); 
        (body as any).pushable = false; 
        
        // Expanded the physics body to cover the bottom 50% of the prop for easier hitting
        body.setSize(this.width * 0.8, this.height * 0.5);
        body.setOffset(this.width * 0.1, this.height * 0.5);

        // Lowered from 60 to 40 so you don't have to punch it 5 times
        this.health = (type === 'kiosk' || type === 'kontejner') ? 40 : 20; 
    }

    public takeDamage(amount: number) {
        if (this.health <= 0 || this.isDead) return;

        this.health -= amount;

        this.scene.tweens.add({
            targets: this,
            x: this.x + Phaser.Math.Between(-4, 4),
            duration: 50,
            yoyo: true,
            repeat: 1
        });

        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => {
            this.clearTint();
        });

        (this.scene as any).playSFX(['Metal-Impact-Pick', 'Metal-Impact-Shield']);

        if (this.health <= 0) {
            this.shatter();
        }
    }

    private shatter() {
        this.isDead = true;
        
        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).enable = false;
        }
        
        (this.scene as any).playSFX(['Break_1', 'Break_2', 'Break_3']);

        if (this.texture.key === 'kiosk' || this.texture.key === 'kontejner') {
            this.scene.cameras.main.shake(150, 0.005); 
        }

        (this.scene as any).spawnHitEffect(this.x, this.y - (this.displayHeight / 2));
        (this.scene as any).dropItem(this.x, this.y);
        
        this.setTintFill(0xff0000);
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.destroy();
            }
        });
    }
}