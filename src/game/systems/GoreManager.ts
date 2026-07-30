import Phaser from 'phaser';

/**
 * GoreManager: Manages particle effects for combat feedback.
 * Handles organic blood splatters, industrial sparks, and footstep dust.
 */
export class GoreManager {
    private scene: Phaser.Scene;
    private bloodParticles: Phaser.GameObjects.Particles.ParticleEmitter;
    private debrisParticles: Phaser.GameObjects.Particles.ParticleEmitter;
    private dustParticles: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // FIX: Safely destroy existing textures to prevent WebGL immutable errors during React Fast Refresh
        if (this.scene.textures.exists('pixel_particle')) {
            this.scene.textures.remove('pixel_particle');
        }

        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 4, 4);
        graphics.generateTexture('pixel_particle', 4, 4);
        graphics.destroy(); // CRITICAL: Prevent memory leak of the graphics object

        // 2. Organic Blood Splatter (Red/Dark Red)
        this.bloodParticles = this.scene.add.particles(0, 0, 'pixel_particle', {
            color: [0x8b0000, 0xff0000, 0x5e0000],
            speed: { min: 100, max: 300 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            gravityY: 600,
            emitting: false, 
            blendMode: 'NORMAL'
        });
        this.bloodParticles.setDepth(9999); 

        // 3. Industrial Debris/Sparks (Yellow/Orange/Grey)
        this.debrisParticles = this.scene.add.particles(0, 0, 'pixel_particle', {
            color: [0xffa500, 0xffff00, 0x808080],
            speed: { min: 150, max: 400 },
            scale: { start: 1, end: 0 },
            lifespan: 300,
            gravityY: 400,
            emitting: false,
            blendMode: 'ADD' 
        });
        this.debrisParticles.setDepth(9999);

        // 4. Persistent Dust Emitter 
        this.dustParticles = this.scene.add.particles(0, 0, 'pixel_particle', {
            color: [0x444444, 0x666666],
            alpha: { start: 0.5, end: 0 },
            scale: { start: 2, end: 4 },
            speed: { min: 10, max: 30 },
            lifespan: 800,
            emitting: false
        });
        this.dustParticles.setDepth(1); 

        // 5. Global Event Listeners
        this.scene.events.on('spawn-gore', this.handleGoreEvent, this);
        this.scene.events.on('spawn-dust', this.spawnDustCloud, this);

        // Prevent memory leaks if the level restarts
        this.scene.events.on('shutdown', this.cleanup, this);
    }

    private handleGoreEvent(data: { x: number, y: number, type: string }) {
        if (data.type === 'CLASSIC' || data.type === 'HIT') {
            this.bloodParticles.emitParticleAt(data.x, data.y, Phaser.Math.Between(8, 15));
            this.scene.cameras.main.shake(100, 0.005);
        } else {
            this.debrisParticles.emitParticleAt(data.x, data.y, Phaser.Math.Between(10, 20));
        }
    }

    public spawnDustCloud(data: { x: number, y: number }) {
        this.dustParticles.emitParticleAt(data.x, data.y, 5);
    }

    private cleanup() {
        this.scene.events.off('spawn-gore', this.handleGoreEvent, this);
        this.scene.events.off('spawn-dust', this.spawnDustCloud, this);
    }
}