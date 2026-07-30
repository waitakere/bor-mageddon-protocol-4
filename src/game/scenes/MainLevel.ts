import Phaser from 'phaser';
import { Marko } from '../entities/Marko';
import { Maja } from '../entities/Maja';
import { Darko } from '../entities/Darko';
import { Enemy } from '../entities/Enemy';
import { Dizel } from '../entities/Dizel';
import { Dizelcic } from '../entities/Dizelcic';
import { Miner } from '../entities/Miner';
import { SlobodanCEO } from '../entities/SlobodanCEO';
import { BreakableObject, BreakableType } from '../entities/BreakableObject';
import { Projectile } from '../entities/Projectile';


export class MainLevel extends Phaser.Scene {
   public player!: any;
   public enemies!: Phaser.Physics.Arcade.Group;
   public breakables!: Phaser.Physics.Arcade.Group;
   public items!: Phaser.Physics.Arcade.Group;
   public projectiles!: Phaser.Physics.Arcade.Group;
   private shadows!: Phaser.GameObjects.Graphics;
  
   private skyLayer!: Phaser.GameObjects.Image;
   private midLayer!: Phaser.GameObjects.Image;
   private floorLayer!: Phaser.GameObjects.TileSprite;
  
   private actionKeys!: any;


   private sectors = [
       { triggerX: 1000, totalEnemies: 4, maxActive: 2, isBossWave: false }, 
       { triggerX: 2000, totalEnemies: 6, maxActive: 3, isBossWave: false },
       { triggerX: 3000, totalEnemies: 8, maxActive: 3, isBossWave: false },
       { triggerX: 3800, totalEnemies: 4, maxActive: 3, isBossWave: true } 
   ];
  
   private currentSectorIndex!: number;
   private isLocked!: boolean;
   private spawnedThisWave!: number;
   public killedThisWave!: number;
   private bossSpawned!: boolean;
   public score!: number;


   public lastEngagedEnemy: any = null;
   public lastPlayerHitTime!: number;
   public lastEnemyHitTime!: number;


   private currentBgm: Phaser.Sound.BaseSound | null = null;
   private globalSfxVolume: number = 0.8;


   constructor() { super({ key: 'MainLevel' }); }


   init() {
       this.currentSectorIndex = 0;
       this.isLocked = false;
       this.spawnedThisWave = 0;
       this.score = 0;
       this.lastEngagedEnemy = null;
       this.createEnemyAnimations();
   }


   create(data: any) {
       window.addEventListener('request-scene-restart', this.handleRestart);
       window.addEventListener('request-continue', this.handleContinue as EventListener);
      
       this.game.events.on('set-bgm-volume', this.handleBgmVolume, this);
       this.game.events.on('set-sfx-volume', this.handleSfxVolume, this);


       this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
           window.removeEventListener('request-scene-restart', this.handleRestart);
           window.removeEventListener('request-continue', this.handleContinue as EventListener);
           this.game.events.off('set-bgm-volume', this.handleBgmVolume, this);
           this.game.events.off('set-sfx-volume', this.handleSfxVolume, this);
       });


       this.sound.stopAll();
       this.currentBgm = this.sound.add('1993_ambient', { loop: true, volume: 0.5 });
       this.currentBgm.play();


       this.actionKeys = this.input.keyboard!.addKeys({
           q: Phaser.Input.Keyboard.KeyCodes.Q,
           w: Phaser.Input.Keyboard.KeyCodes.W,
           a: Phaser.Input.Keyboard.KeyCodes.A,
           s: Phaser.Input.Keyboard.KeyCodes.S,
           space: Phaser.Input.Keyboard.KeyCodes.SPACE
       }) as any;


       this.physics.world.setBounds(0, 820, 6000, 260);
       const camW = this.cameras.main.width;


       this.skyLayer = this.add.image(0, 0, 'part1_sky').setOrigin(0, 0).setDisplaySize(4000, 1080).setScrollFactor(0.1).setDepth(-300);
       this.midLayer = this.add.image(0, 750, 'part1_mid').setOrigin(0, 1).setDisplaySize(4000, 650).setScrollFactor(0.5).setDepth(-200);
       this.floorLayer = this.add.tileSprite(0, 1080, camW, 330, 'part1_floor').setOrigin(0, 1).setScrollFactor(0).setDepth(-100);


       this.shadows = this.add.graphics().setAlpha(0.4).setDepth(-50);
      
       this.items = this.physics.add.group();
       this.enemies = this.physics.add.group();
       this.breakables = this.physics.add.group();
       this.projectiles = this.physics.add.group();


       let charKey = this.registry.get('selectedCharacter') || data?.selectedCharacter || window.localStorage.getItem('selectedCharacter') || 'marko';
       this.spawnPlayer(charKey, 200, 950);
      
       const startWeapon = this.physics.add.sprite(500, 950, 'M70-FINAL rev');
       startWeapon.setScale(1.0);
       (startWeapon as any).isWeaponPickup = true;
       (startWeapon as any).weaponType = 'M70-FINAL rev';
       this.items.add(startWeapon);


       this.enemies.add(new Dizel(this, 1000, 950));
       this.scatterBreakables();


       this.cameras.main.setBounds(0, 0, 6000, 1080);
       this.updateReactHUD();
       this.scene.pause();
       window.dispatchEvent(new CustomEvent('phaser-ready'));
   }


   private handleBgmVolume(vol: number) {
       if (this.currentBgm) {
           (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(vol);
       }
   }


   private handleSfxVolume(vol: number) {
       this.globalSfxVolume = vol;
   }


   private spawnPlayer(charKey: string, x: number, y: number) {
       if (this.player) this.player.destroy();
       switch(charKey.toLowerCase()) {
           case 'maja': this.player = new Maja(this, x, y); break;
           case 'darko': this.player = new Darko(this, x, y); break;
           default: this.player = new Marko(this, x, y); break;
       }
       this.player.setScale(1.7);
      
       this.physics.add.collider(this.player, this.enemies);
       this.physics.add.collider(this.player, this.breakables);
       this.physics.add.overlap(this.player, this.items, this.collectItem, undefined, this);
      
       this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
   }


   public spawnProjectile(ownerY: number, x: number, y: number, key: string, direction: number, damage: number, isThrown: boolean) {
       const proj = new Projectile(this, x, y, key, direction, damage, isThrown);
      
       (proj as any).sourceGroundY = ownerY;
       (proj as any).bulletDir = direction;
       proj.setDepth(9999);


       if (key === 'bullet') {
           proj.setScale(0.45);
           const body = proj.body as Phaser.Physics.Arcade.Body;
           if (body) body.setAllowGravity(false);
           this.time.delayedCall(1000, () => { if (proj && proj.active) proj.destroy(); });
       }
      
       this.projectiles.add(proj);
   }


   public spawnHitEffect(x: number, y: number) {
       const exps = ['explosion_01', 'explosion_02', 'explosion_03', 'explosion_04'];
       const key = Phaser.Utils.Array.GetRandom(exps);
       if (!this.textures.exists(key)) return;


       const explosion = this.add.sprite(x, y, key);
       explosion.setDepth(9999).setOrigin(0.5, 0.5);

       // Tag so the depth-sort loop in update() skips this sprite
       (explosion as any).isVFX = true;
      
       let baseScale = 1.0;
       if (key === 'explosion_01') baseScale = 2.5;
       else if (key === 'explosion_03') baseScale = 0.6;
       else baseScale = 1.2;


       explosion.setScale(baseScale);
       this.tweens.add({
           targets: explosion, scale: baseScale * 1.3, alpha: 0, duration: 250,
           ease: 'Quad.easeOut', onComplete: () => explosion.destroy()
       });
   }


   public spawnBlood(x: number, y: number) {
       if (!this.textures.exists('blood_splat')) return;
       const splat = this.add.sprite(x, y, 'blood_splat');
       splat.setDepth(9999).setScale(0.3);

       // Tag so the depth-sort loop in update() skips this sprite
       (splat as any).isVFX = true;

       this.tweens.add({ targets: splat, y: y + 20, alpha: 0, duration: 600, ease: 'Sine.easeIn', onComplete: () => splat.destroy() });
   }


   private handleContinue = (e: CustomEvent) => {
       const newChar = e.detail?.character || 'marko';
       const spawnX = this.player.x;
       const spawnY = this.player.y;
       this.spawnPlayer(newChar, spawnX, spawnY);
       this.triggerScreenGlitch(800);
       this.spawnHitEffect(spawnX, spawnY - 50);
       this.playSFX(['explosion_01', 'Break_1']);
       this.enemies.getChildren().forEach((enemy: any) => {
           if (!enemy.isDead) {
               if (enemy.takeDamage) enemy.takeDamage(15);
               if (!enemy.isDead && !enemy.isKnockedDown && enemy.takeKnockdown) enemy.takeKnockdown();
           }
       });
       this.updateReactHUD();
   };


   private scatterBreakables() {
       const props = [
           { x: 600, y: 880, type: 'barrel' }, { x: 1200, y: 1000, type: 'crate' },
           { x: 1800, y: 920, type: 'kontejner' }, { x: 2600, y: 980, type: 'kiosk' },
           { x: 3200, y: 1040, type: 'barrel' }, { x: 3700, y: 900, type: 'crate' },
           { x: 4100, y: 950, type: 'barrel' }, { x: 4400, y: 880, type: 'crate' },
           { x: 4800, y: 1000, type: 'crate' }
       ];
       props.forEach(p => { this.breakables.add(new BreakableObject(this, p.x, p.y, p.type as BreakableType)); });
   }


   private createEnemyAnimations() {
       const texture = this.textures.get('enemies_1993');
       if (!texture || texture.key === '__MISSING') return;
       const allFrames = texture.getFrameNames();


       const enemyPrefixes = [
           { id: 'mup', search: 'mup' }, { id: 'dizel', search: 'dizel' },
           { id: 'dizelcic', search: 'dizelcic' }, { id: 'miner', search: 'miner' },
           { id: 'slobodan', search: 'slobodan' }
       ];
       const animTypes = ['walk', 'run', 'attack', 'punch-1', 'punch-2', 'melee', 'damage', 'dying', 'knockdown-get-up', 'jump', 'jump-punch', 'special-attack'];


       enemyPrefixes.forEach(enemy => {
           animTypes.forEach(animType => {
               const animKey = `${enemy.id}-${animType}`;
               if (this.anims.exists(animKey)) return;
               const matchingFrames = allFrames.filter(f => f.includes(`${enemy.search}-${animType}/frame_`)).sort();
               if (matchingFrames.length > 0) {
                   this.anims.create({
                       key: animKey,
                       frames: matchingFrames.map(f => ({ key: 'enemies_1993', frame: f })),
                       frameRate: 10,
                       repeat: (animType === 'walk' || animType === 'run') ? -1 : 0
                   });
               }
           });
       });
   }


   public triggerScreenGlitch(duration: number = 400) {
       const cam = this.cameras.main;
       cam.shake(duration, 0.02);
       try {
           if (cam.postFX) {
               const fx = cam.postFX.addChromaticAberration(0.04, 0.04);
               this.tweens.add({ targets: fx, offsetX: 0, offsetY: 0, duration: duration, ease: 'Power2', onComplete: () => cam.postFX.remove(fx) });
           }
       } catch (e) { cam.flash(duration, 255, 0, 0, 0.3); }
   }


   private handleRestart = () => { this.scene.restart(); };


   update() {
       if (!this.player || this.player.isDead) return;
       this.handleWaveManager();
       this.floorLayer.tilePositionX = this.cameras.main.scrollX;


       // MANUAL BULLET COLLISION & VELOCITY SYSTEM
       this.projectiles.getChildren().forEach((p: any) => {
           if (!p.active) return;
          
           if (p.texture && p.texture.key === 'bullet') {
               if (p.body) {
                   p.body.setAllowGravity(false);
                   p.setVelocityX(2500 * (p.bulletDir || 1));
                   p.setVelocityY(0);
               }
           }


           this.enemies.getChildren().forEach((e: any) => {
               if (e.isDead || !e.active) return;
               const shooterGroundY = p.sourceGroundY || p.y + 180;
               if (Math.abs(shooterGroundY - e.y) <= 90 && Math.abs(p.x - e.x) <= 60) {
                   if (p.hit) p.hit(); else p.destroy();
                   this.spawnBlood(e.x, e.y - 50);
                   this.spawnHitEffect(e.x, e.y - 130);
                   if (e.takeDamage) e.takeDamage(p.damage || 60);


                   if (!e.isDead && e.anims && e.anims.currentAnim) {
                       const prefix = e.skinPrefix || e.characterName || e.anims.currentAnim.key.split('-')[0];
                       const dmgAnim = `${prefix}-damage`;
                       if (this.anims.exists(dmgAnim)) {
                           e.play(dmgAnim, true);
                           if (e.setVelocity) e.setVelocity(0, 0);
                       }
                   }
                   if (p.isThrownWeapon && e.takeKnockdown) e.takeKnockdown();
               }
           });
          
           this.breakables.getChildren().forEach((prop: any) => {
               if (prop.isDead || !prop.active) return;
               const shooterGroundY = p.sourceGroundY || p.y + 180;
               if (Math.abs(shooterGroundY - prop.y) <= 100 && Math.abs(p.x - prop.x) <= 60) {
                   if (p.hit) p.hit(); else p.destroy();
                   this.spawnHitEffect(prop.x, prop.y - 50);
                   if (prop.takeDamage) prop.takeDamage(p.damage || 60);
               }
           });
       });


       this.children.each((c: any) => { if (c.body && c.type === 'Sprite') { c.setAngle(0); c.rotation = 0; } });


       this.shadows.clear().fillStyle(0x000000, 0.5);
       this.shadows.fillEllipse(this.player.x, this.player.y, 70 * this.player.scale, 20);
       this.enemies.getChildren().forEach((e: any) => { if (!e.isDead) this.shadows.fillEllipse(e.x, e.y, e.width * 0.6, 20); });
       this.breakables.getChildren().forEach((b: any) => { if (!b.isDead) this.shadows.fillEllipse(b.x, b.y, b.displayWidth * 0.7, 15); });


       const cursors = this.input.keyboard!.createCursorKeys();
       const ak = this.actionKeys;
       const qJust = Phaser.Input.Keyboard.JustDown(ak.q);
       const wJust = Phaser.Input.Keyboard.JustDown(ak.w);
       const aJust = Phaser.Input.Keyboard.JustDown(ak.a);
       const sJust = Phaser.Input.Keyboard.JustDown(ak.s);


       const specialPressed = (ak.q.isDown && ak.w.isDown) && (qJust || wJust);
       const finisherPressed = (ak.a.isDown && ak.s.isDown) && (aJust || sJust);


       const keys = {
           up: cursors.up.isDown, down: cursors.down.isDown, left: cursors.left.isDown, right: cursors.right.isDown,
           space: Phaser.Input.Keyboard.JustDown(ak.space),
           special: specialPressed, finisher: finisherPressed,
           p1: qJust && !specialPressed, p2: wJust && !specialPressed,
           k1: aJust && !finisherPressed, k2: sJust && !finisherPressed
       };


       this.player.update(keys);
       this.enemies.getChildren().forEach((e: any) => { if (e.updateAI && !e.isDead) e.updateAI(this.player); });
      
       // ─── DEPTH SORTING ──────────────────────────────────────────
       // All game objects sorted by Y (lower = in front).
       // Player gets +1 so they always render ON TOP of enemies
       // at the same Y lane — never hidden behind a mob.
       // VFX sprites (isVFX) and weapon sprites keep their
       // manually-set depth (9999) so they render on top.
       // ─────────────────────────────────────────────────────────────
       this.children.each((c: any) => {
           if (c.y && c.type !== 'Image' && c.type !== 'Graphics' && c.type !== 'TileSprite' && !c.isWeaponSprite && !c.isVFX && !(c instanceof Projectile)) {
               if (c === this.player) {
                   c.setDepth(c.y + 1);
               } else {
                   c.setDepth(c.y);
               }
           }
       });
      
       if (this.lastEngagedEnemy && (!this.lastEngagedEnemy.active || this.lastEngagedEnemy.isDead)) {
           this.lastEngagedEnemy = null; this.updateReactHUD();
       }
   }


   public playSFX(marker: string | string[], localVolume: number = 0.8) {
       try {
           if (this.sound.context.state === 'suspended') this.sound.context.resume();
           const finalMarker = Array.isArray(marker) ? marker[Math.floor(Math.random() * marker.length)] : marker;
           const scaledVolume = localVolume * this.globalSfxVolume;


           if (this.cache.json.exists('sfx_atlas')) {
               const json = this.cache.json.get('sfx_atlas');
               if (json && json.spritemap && json.spritemap[finalMarker]) {
                   const sound = this.sound.addAudioSprite('sfx_atlas');
                   sound.play(finalMarker, { volume: scaledVolume });
                   return sound;
               }
           }
           if (this.cache.audio.exists(finalMarker)) {
               this.sound.play(finalMarker, { volume: scaledVolume });
               return;
           }
           return null;
       } catch (e) { return null; }
   }


   public dropItem(x: number, y: number) {
       if (Math.random() < 0.25) {
           const drop = this.physics.add.sprite(x, y - 40, 'M70-FINAL rev');
           drop.setOrigin(0.5, 0.5).setScale(1.0);
           (drop as any).isWeaponPickup = true;
           (drop as any).weaponType = 'M70-FINAL rev';
           this.items.add(drop);
           const body = drop.body as Phaser.Physics.Arcade.Body;
           if (body) { body.setSize(drop.displayWidth, 20); body.setOffset(0, drop.displayHeight / 2); }
           this.tweens.add({ targets: drop, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, ease: 'Linear' });
           this.tweens.add({ targets: drop, y: y, duration: 350, ease: 'Bounce.easeOut' });
           return;
       }


       const items = ['item-burek', 'item-coffee', 'item-pork', 'item-beer', 'item-sandwich', 'item-rakija'];
       const randomItem = items[Math.floor(Math.random() * items.length)];
       const drop = this.physics.add.sprite(x, y - 40, randomItem);
       drop.setOrigin(0.5, 1);
       this.items.add(drop);
      
       if (randomItem === 'item-pork') drop.setScale(3.5);
       else if (randomItem === 'item-rakija') drop.setScale(3.0);
       else if (randomItem === 'item-burek') drop.setScale(2.5);
       else if (randomItem === 'item-beer') drop.setScale(0.45);
       else if (randomItem === 'item-sandwich') drop.setScale(0.8);
       else if (randomItem === 'item-coffee') drop.setScale(2.5);
       else drop.setScale(1.5);


       const body = drop.body as Phaser.Physics.Arcade.Body;
       if (body) { body.setSize(drop.width, drop.height); body.setOffset(0, 0); }
       this.tweens.add({ targets: drop, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, ease: 'Linear' });
       this.tweens.add({ targets: drop, y: y, duration: 350, ease: 'Bounce.easeOut' });
   }


   private collectItem(player: any, item: any) {
       if (Math.abs(player.y - item.y) > 80) return;
      
       if (item.isWeaponPickup) {
           player.equipWeapon(item.weaponType);
           item.destroy();
           this.playSFX('pickup_weapon');
           return;
       }


       item.destroy();
       this.playSFX(['melee_1', 'Metal-Impact-Shield'], 0.8);
       if (player.playPickupAnim) player.playPickupAnim();
       this.player.health = Math.min(this.player.health + 30, this.player.maxHealth || 150);
       const healText = this.add.text(this.player.x, this.player.y - 80, '+HP', { font: '900 20px "Space Mono"', color: '#00ff00' }).setOrigin(0.5);
       this.tweens.add({ targets: healText, y: healText.y - 30, alpha: 0, duration: 1000, onComplete: () => healText.destroy() });
       this.updateReactHUD();
   }


   private handleWaveManager() {
       const cam = this.cameras.main;


       if (!this.isLocked && this.currentSectorIndex < this.sectors.length) {
           const nextSector = this.sectors[this.currentSectorIndex];
           if (this.player.x > nextSector.triggerX) {
               this.isLocked = true;
               cam.stopFollow();
               this.physics.world.setBounds(cam.worldView.left, 820, cam.width, 260);
               this.updateReactHUD();
           }
       }


       if (this.isLocked) {
           const currentSector = this.sectors[this.currentSectorIndex];
           const activeEnemies = this.enemies.getChildren().filter((e: any) => !e.isDead).length;


           if (currentSector.isBossWave) {
               if (activeEnemies < currentSector.maxActive && this.spawnedThisWave < currentSector.totalEnemies) {
                   const gangTypes = ['dizel', 'dizelcic', 'miner'];
                   this.spawnEnemyOffScreen(cam.worldView, gangTypes[Math.floor(Math.random() * gangTypes.length)]);
               }
               if (this.spawnedThisWave >= currentSector.totalEnemies && activeEnemies === 0 && !this.bossSpawned) {
                   this.spawnEnemyOffScreen(cam.worldView, 'slobodan');
                   this.bossSpawned = true;
               }
               if (this.bossSpawned && activeEnemies === 0) this.unlockCamera();
           } else {
               if (activeEnemies < currentSector.maxActive && this.spawnedThisWave < currentSector.totalEnemies) {
                   const gangTypes = ['dizel', 'dizelcic', 'miner'];
                   this.spawnEnemyOffScreen(cam.worldView, gangTypes[Math.floor(Math.random() * gangTypes.length)]);
               }
               if (this.spawnedThisWave >= currentSector.totalEnemies && activeEnemies === 0) this.unlockCamera();
           }
       }
   }


   private spawnEnemyOffScreen(view: Phaser.Geom.Rectangle, type: string) {
       const spawnOnLeft = Math.random() > 0.5;
       const spawnX = spawnOnLeft ? view.left - 80 : view.right + 80;
       const spawnY = Phaser.Math.Between(800, 1050);
      
       let enemy: any;
       switch (type) {
           case 'dizel': enemy = new Dizel(this, spawnX, spawnY); break;
           case 'dizelcic': enemy = new Dizelcic(this, spawnX, spawnY); break;
           case 'miner': enemy = new Miner(this, spawnX, spawnY); break;
           case 'slobodan': enemy = new SlobodanCEO(this, spawnX, spawnY); break;
           default: enemy = new Enemy(this, spawnX, spawnY, type); break;
       }
       this.enemies.add(enemy);
       this.spawnedThisWave++;
   }


   private unlockCamera() {
       this.isLocked = false;
       this.spawnedThisWave = 0;
       this.currentSectorIndex++;
      
       this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
       this.physics.world.setBounds(0, 820, 6000, 260);
       this.updateReactHUD();
      
       if (this.currentSectorIndex < this.sectors.length) {
           const goText = this.add.text(this.player.x + 100, this.player.y - 150, 'GO! ➡', {
               font: '900 64px "Space Mono"', color: '#39ff14', stroke: '#000', strokeThickness: 8
           }).setOrigin(0.5);
           this.tweens.add({
               targets: goText, x: goText.x + 60, scale: 1.2, duration: 500, yoyo: true, repeat: 3,
               onComplete: () => { this.tweens.add({ targets: goText, alpha: 0, duration: 500, onComplete: () => goText.destroy() }); }
           });
       }
   }


   public registerEnemyDeath() {
       this.score += 100;
       this.updateReactHUD();
   }


   public updateReactHUD() {
       let eMaxHealth = 100;
       if (this.lastEngagedEnemy) {
           eMaxHealth = this.lastEngagedEnemy.skinPrefix === 'slobodan' ? 500 : 100;
       }
       window.dispatchEvent(new CustomEvent('update-phaser-hud', {
           detail: {
               health: this.player?.health, maxHealth: this.player?.maxHealth,
               smf: this.player?.smfMeter, score: this.score,
               playerName: this.player?.characterName,
               enemyName: this.lastEngagedEnemy && !this.lastEngagedEnemy.isDead ? this.lastEngagedEnemy.skinPrefix : null,
               enemyHealth: this.lastEngagedEnemy ? this.lastEngagedEnemy.health : 0,
               enemyMaxHealth: eMaxHealth,
               playerHitStamp: this.lastPlayerHitTime,
               enemyHitStamp: this.lastEnemyHitTime
           }
       }));
   }
}