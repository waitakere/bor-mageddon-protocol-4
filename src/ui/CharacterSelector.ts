import * as THREE from 'three';

// Define the global window interface to satisfy TypeScript
declare global {
    interface Window {
        phaserGame: Phaser.Game;
    }
}

interface CharacterCard {
    id: string;
    label: string;
    title: string;
    desc: string;
    gradient: string[];
    accent: string;
}

/**
 * CharacterSelector: The 1993 Terminal 3D Carousel.
 * Runs independently of Phaser and cleans itself up upon deployment.
 */
export class CharacterSelector {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private cardMeshes: THREE.Mesh[] = [];
    private animationId: number = 0;

    private container!: HTMLDivElement;
    private overlay!: HTMLDivElement;
    
    private currentAngle: number = 0;
    private targetAngle: number = 0;
    private isDragging: boolean = false;
    private dragStartX: number = 0;

    private selectedId: string = 'marko';
    private angleStep: number;

    private readonly RADIUS = 4;

    private readonly theme = {
        bg: 0x0f0b0a,      // Smog
        fog: 0x1a0a05,     // Rusty red fog
        particle: 0xffaa44, // Embers
        ambient: 0x442222,
        side: 0x222222,
        back: 0x111111
    };

    private readonly characters: CharacterCard[] = [
        {
            id: 'marko',
            label: 'ID: 8492-M',
            title: 'MARKO',
            desc: 'Former RTB Bor Miner. Armed with a Zastava M70 and heavy work boots. Slower, but absorbs massive damage. Driven by sheer rage.',
            gradient: ['#2a1010', '#110505'],
            accent: '#ff3333',
        },
        {
            id: 'maja',
            label: 'ID: UNKNOWN',
            title: 'MAJA',
            desc: 'Underground smuggler. Wields dual pistols and moves with extreme agility. Fragile, but deadly at mid-range.',
            gradient: ['#102a15', '#05110a'],
            accent: '#33ff33',
        },
        {
            id: 'darko',
            label: 'ID: 1104-D',
            title: 'DARKO',
            desc: 'The Dizel enforcer. High melee damage, utilizes a bat. Fast movement speed but relies entirely on close-quarters brutality.',
            gradient: ['#101a2a', '#050a11'],
            accent: '#3388ff',
        }
    ];

    constructor() {
        this.angleStep = (Math.PI * 2) / this.characters.length;
        this.injectUI();
        this.initThreeJS();
        this.animate = this.animate.bind(this);
        this.animate();
    }

    private injectUI() {
        // Create the main container for the DOM elements
        this.container = document.createElement('div');
        this.container.id = 'selector-ui-container';
        
        // CSS specific to the 1993 VCR terminal look
        const style = document.createElement('style');
        style.innerHTML = `
            #selector-ui-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999; pointer-events: none; font-family: 'Courier New', Courier, monospace; }
            .hint-text { position: absolute; bottom: 40px; width: 100%; text-align: center; color: rgba(255, 51, 51, 0.5); font-size: 14px; letter-spacing: 2px; text-shadow: 0 0 5px rgba(255,51,51,0.5); pointer-events: none; }
            #expanded-card { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10, 5, 5, 0.95); display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; pointer-events: auto; }
            #expanded-card.active { display: flex; opacity: 1; }
            .card-content { width: 600px; border: 2px solid #ff3333; background: #110a0a; padding: 40px; box-shadow: 0 0 30px rgba(255, 0, 0, 0.2); position: relative; }
            .card-title { font-size: 32px; color: #fff; text-shadow: 2px 2px 0px #ff0000; margin-bottom: 20px; font-weight: bold; }
            .card-desc { font-size: 18px; color: #ccc; margin-bottom: 30px; line-height: 1.5; }
            .select-btn { padding: 15px 30px; background: #ff3333; color: #000; font-weight: bold; border: none; cursor: pointer; box-shadow: 4px 4px 0px #880000; font-size: 16px; width: 100%; }
            .select-btn:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #880000; }
            .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: 1px solid #ff3333; color: #ff3333; cursor: pointer; width: 30px; height: 30px; font-weight: bold; }
        `;
        document.head.appendChild(style);

        this.container.innerHTML = `
            <div class="hint-text">[DRAG TO ROTATE] - [CLICK CARD TO ACCESS ARCHIVE]</div>
            <div id="expanded-card">
                <div class="card-content">
                    <button class="close-btn">X</button>
                    <div class="card-title">NAME</div>
                    <div class="card-desc">DESC</div>
                    <button class="select-btn">INITIATE DEPLOYMENT</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);
        this.overlay = document.getElementById('expanded-card') as HTMLDivElement;

        // Overlay Event Listeners
        this.overlay.querySelector('.close-btn')?.addEventListener('click', () => {
            this.overlay.classList.remove('active');
            setTimeout(() => { this.overlay.style.display = 'none'; }, 200);
        });

        // DEPLOYMENT BUTTON (Connects to Phaser)
        this.overlay.querySelector('.select-btn')?.addEventListener('click', () => {
            this.deployCharacter();
        });
    }

    private initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(this.theme.fog, 0.08);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 0, 7);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '900';
        document.body.appendChild(this.renderer.domElement);

        // Lights
        this.scene.add(new THREE.AmbientLight(this.theme.ambient, 1.5));
        const pointLight = new THREE.PointLight(0xff4422, 1.5, 20);
        pointLight.position.set(0, 5, 2);
        this.scene.add(pointLight);

        // Build Cards
        this.characters.forEach((char, i) => {
            const geo = new THREE.BoxGeometry(3.5, 5.0, 0.1);
            const tex = this.createCardTexture(char);
            const mats = [
                new THREE.MeshStandardMaterial({ color: this.theme.side }),
                new THREE.MeshStandardMaterial({ color: this.theme.side }),
                new THREE.MeshStandardMaterial({ color: this.theme.side }),
                new THREE.MeshStandardMaterial({ color: this.theme.side }),
                new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
                new THREE.MeshStandardMaterial({ color: this.theme.back })
            ];
            const mesh = new THREE.Mesh(geo, mats);
            mesh.userData = { index: i, id: char.id };
            this.scene.add(mesh);
            this.cardMeshes.push(mesh);
        });

        // Add Ash Particles
        this.addAshParticles();

        // Mouse/Touch Controls
        this.setupInteractions();
    }

    private createCardTexture(card: CharacterCard): THREE.Texture {
        const c = document.createElement('canvas');
        const w = 512, h = 700;
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;

        // Grungy Gradient Background
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, card.gradient[0]);
        grad.addColorStop(1, card.gradient[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Static Noise
        for (let i = 0; i < 8000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }

        ctx.fillStyle = card.accent;
        ctx.font = 'bold 24px monospace';
        ctx.fillText(card.label, 40, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 70px monospace';
        ctx.fillText(card.title, 40, 600);

        // Barcode elements
        ctx.fillStyle = card.accent;
        ctx.fillRect(40, 630, 200, 10);
        ctx.fillRect(250, 630, 20, 10);
        ctx.fillRect(280, 630, 50, 10);

        ctx.strokeStyle = card.accent;
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, w, h);

        return new THREE.CanvasTexture(c);
    }

    private addAshParticles() {
        const P_COUNT = 600;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(P_COUNT * 3);
        for (let i = 0; i < P_COUNT; i++) {
            pPos[i * 3]     = (Math.random() - 0.5) * 30;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
            size: 0.1, color: this.theme.particle, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8
        });
        const ash = new THREE.Points(pGeo, pMat);
        ash.name = "ash";
        this.scene.add(ash);
    }

    private setupInteractions() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const dom = this.renderer.domElement;

        dom.addEventListener('mousedown', e => {
            this.isDragging = true; 
            this.dragStartX = e.clientX; 
            document.body.style.cursor = 'grabbing';
        });

        dom.addEventListener('mousemove', e => {
            if (this.isDragging) {
                this.targetAngle += (e.clientX - this.dragStartX) * 0.01;
                this.dragStartX = e.clientX;
            }
        });

        window.addEventListener('mouseup', e => {
            if (!this.isDragging) return;
            this.isDragging = false;
            document.body.style.cursor = 'default';

            // Snap to nearest card
            const steps = Math.round(this.targetAngle / this.angleStep);
            this.targetAngle = steps * this.angleStep;
        });

        // Click to select card
        dom.addEventListener('click', e => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, this.camera);
            const hits = raycaster.intersectObjects(this.cardMeshes);
            if (hits.length > 0) {
                const card = this.characters[hits[0].object.userData.index];
                this.selectedId = card.id;
                this.showExpandedCard(card);
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private showExpandedCard(card: CharacterCard): void {
        const titleEl = this.overlay.querySelector('.card-title') as HTMLDivElement;
        const descEl = this.overlay.querySelector('.card-desc') as HTMLDivElement;
        titleEl.textContent = card.title;
        descEl.textContent = card.desc;
        this.overlay.style.display = 'flex';
        requestAnimationFrame(() => this.overlay.classList.add('active'));
    }

    private deployCharacter(): void {
        this.overlay.classList.remove('active');
        this.overlay.style.display = 'none';

        // Bridge to Phaser MenuScene
        if (window.phaserGame) {
            const menu = window.phaserGame.scene.getScene('MenuScene');
            if (menu) {
                menu.events.emit('character-selected', this.selectedId);
            }
        }

        this.destroy();
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate);

        // Ease toward target
        this.currentAngle += (this.targetAngle - this.currentAngle) * 0.08;

        // Position cards in carousel
        this.cardMeshes.forEach((mesh, i) => {
            const angle = this.currentAngle + i * this.angleStep;
            mesh.position.x = Math.sin(angle) * this.RADIUS;
            mesh.position.z = Math.cos(angle) * this.RADIUS - this.RADIUS;
            mesh.rotation.y = -angle;
            mesh.position.y = 0;
        });

        // Rotate ash
        const ash = this.scene.getObjectByName('ash');
        if (ash) ash.rotation.y += 0.001;

        this.renderer.render(this.scene, this.camera);
    }

    destroy(): void {
        cancelAnimationFrame(this.animationId);
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.container?.remove();
    }
}
