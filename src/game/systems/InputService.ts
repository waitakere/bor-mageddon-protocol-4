import Phaser from 'phaser';

export type Action = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'PUNCH' | 'KICK' | 'SHOOT' | 'JUMP' | 'SPECIAL' | 'FINISHER';

/**
 * InputService: Standardizes Keyboard and Gamepad inputs.
 * Maps inputs directly to the retro 1993 UI HUD.
 */
export class InputService {
    private scene: Phaser.Scene;
    private keyboardMap: Record<Action, Phaser.Input.Keyboard.Key>;
    private pad: Phaser.Input.Gamepad.Gamepad | null = null;
    
    // Gamepad state tracking for "JustPressed" logic
    private previousPadState: Record<Action, boolean>;
    
    // Double-tap tracking
    private lastTapTime: { LEFT: number, RIGHT: number } = { LEFT: 0, RIGHT: 0 };
    private readonly TAP_WINDOW: number = 250; 

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        const K = Phaser.Input.Keyboard.KeyCodes;

        // Mapped exactly to your React ControlsHUD
        this.keyboardMap = {
            UP: scene.input.keyboard.addKey(K.UP),
            DOWN: scene.input.keyboard.addKey(K.DOWN),
            LEFT: scene.input.keyboard.addKey(K.LEFT),
            RIGHT: scene.input.keyboard.addKey(K.RIGHT),
            PUNCH: scene.input.keyboard.addKey(K.A),
            KICK: scene.input.keyboard.addKey(K.S),
            SHOOT: scene.input.keyboard.addKey(K.D),
            JUMP: scene.input.keyboard.addKey(K.SPACE),
            SPECIAL: scene.input.keyboard.addKey(K.Q),
            FINISHER: scene.input.keyboard.addKey(K.E)
        };

        this.previousPadState = {
            UP: false, DOWN: false, LEFT: false, RIGHT: false,
            PUNCH: false, KICK: false, SHOOT: false, JUMP: false, SPECIAL: false, FINISHER: false
        };
    }

    public update() {
        // Detect gamepad
        if (this.scene.input.gamepad && this.scene.input.gamepad.total > 0) {
            this.pad = this.scene.input.gamepad.getPad(0);
        }

        // Update previous gamepad state for JustPressed logic
        const actions: Action[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'PUNCH', 'KICK', 'SHOOT', 'JUMP', 'SPECIAL', 'FINISHER'];
        actions.forEach(action => {
            this.previousPadState[action] = this.getPadState(action);
        });
    }

    /**
     * Returns true as long as the button is held down.
     */
    public isDown(action: Action): boolean {
        const key = this.keyboardMap[action];
        const padDown = this.getPadState(action);
        return key.isDown || padDown; 
    }

    /**
     * Returns true ONLY on the exact frame the button is pressed.
     */
    public isJustDown(action: Action): boolean {
        const key = this.keyboardMap[action];
        const padJustPressed = this.getPadState(action) && !this.previousPadState[action];
        return Phaser.Input.Keyboard.JustDown(key) || padJustPressed; 
    }

    /**
     * Detects double-taps for Running state
     */
    public isRunTriggered(direction: 'LEFT' | 'RIGHT'): boolean {
        if (this.isJustDown(direction)) {
            const now = this.scene.time.now;
            if (now - this.lastTapTime[direction] < this.TAP_WINDOW) {
                return true;
            }
            this.lastTapTime[direction] = now;
        }
        return false;
    }

    /**
     * Maps physical Gamepad buttons to game Actions
     */
    private getPadState(action: Action): boolean {
        if (!this.pad) return false;
        
        // Standard Xbox/PlayStation Controller Mapping
        switch(action) {
            case 'UP': return this.pad.up || this.pad.leftStick.y < -0.3; 
            case 'DOWN': return this.pad.down || this.pad.leftStick.y > 0.3; 
            case 'LEFT': return this.pad.left || this.pad.leftStick.x < -0.3; 
            case 'RIGHT': return this.pad.right || this.pad.leftStick.x > 0.3; 
            
            case 'JUMP': return this.pad.buttons[0]?.pressed;     // A / Cross
            case 'PUNCH': return this.pad.buttons[2]?.pressed;    // X / Square
            case 'KICK': return this.pad.buttons[1]?.pressed;     // B / Circle
            case 'SHOOT': return this.pad.buttons[3]?.pressed;    // Y / Triangle
            
            case 'SPECIAL': return this.pad.buttons[4]?.pressed;  // L1 / Left Bumper
            case 'FINISHER': return this.pad.buttons[5]?.pressed; // R1 / Right Bumper
            
            default: return false;
        }
    }
}