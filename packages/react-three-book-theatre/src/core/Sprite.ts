/**
 * Autonomous 2D sprite character drawn onto a canvas.
 *
 * Three states:
 *   idle   — stands still for a random duration, then walks or performs an action.
 *   walk   — moves toward a random 2D target.  Speed scales with depth.
 *   action — a single jump, then returns to idle.
 *
 * The anchor point (this.x / this.y) is the character's foot position.
 * Drawing always goes upward from there.
 *
 * ## State control
 *
 * The sprite runs an autonomous state machine.  Use `triggerIdle()`,
 * `triggerWalk()`, and `triggerAction()` to force state transitions from
 * outside.  Read `sprite.state` to observe the current state.
 */

import { depthScale, renderedSize } from './perspective';
import { Positionable } from './Positionable';
import type { SpritePlacement } from './Positionable';

export type { SpritePlacement };

export type SpriteState = 'idle' | 'walk' | 'action';

export interface SpriteOptions {
  x?: number;
  y?: number;
  /** CSS colour string (e.g. '#e85050'). Defaults to the next palette colour. */
  color?: string;
  /** Placement band: 'ground' (default) or 'sky'. */
  placement?: SpritePlacement;
  /** Maximum scene distance in metres (default 10). */
  pageDistance?: number;
  /** Initial distance in metres (default pageDistance / 2). Ignored when y is set. */
  distance?: number;
  /** Intrinsic size in canvas pixels at d = 1 m (default 100). */
  intrinsicSize?: number;
  idleImage?:   HTMLImageElement | null;
  walkImage?:   HTMLImageElement | null;
  actionImage?: HTMLImageElement | null;

  // ── State machine tuning ──────────────────────────────────────────────────

  /** Minimum idle duration in seconds (default 0.6). */
  idleTimeoutMin?: number;
  /** Maximum idle duration in seconds (default 3.0). */
  idleTimeoutMax?: number;
  /** Probability [0–1] of walking (vs. performing an action) after idle (default 0.72). */
  walkProbability?: number;
  /** Action (jump) duration in seconds (default 0.75). */
  actionDuration?: number;
  /** Base walk speed in canvas pixels per second (default 75). */
  walkSpeed?: number;
  /** Enable autonomous movement (walk/action state machine). Default true. */
  animated?: boolean;
  /** Enable depth-based size scaling. Default true. */
  depthScaling?: boolean;
  /** Patrol radius in metres. 0 = no movement. Default Infinity (unlimited). */
  patrolRadius?: number;
}

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = [
  '#e85050', '#50a0e8', '#50e870',
  '#e8c850', '#c050e8', '#50e8d4',
  '#e87850', '#78e850', '#5078e8',
];
let _paletteIdx = 0;
function nextColor(): string { return PALETTE[_paletteIdx++ % PALETTE.length]; }

// ── Sprite ────────────────────────────────────────────────────────────────────

export class Sprite extends Positionable {
  color: string;
  /** When false, the autonomous state machine is frozen (no walk/action). */
  animated: boolean;
  /** Current animation state (read-only externally — use trigger*() to change). */
  get state(): SpriteState { return this._state; }
  private _state: SpriteState = 'idle';

  /** Which direction the sprite is facing. Can be set externally. */
  facingRight = true;

  /** Patrol radius in metres. 0 = no movement, Infinity = unlimited. */
  get patrolRadius(): number { return this._patrolRadius; }
  set patrolRadius(v: number) {
    this._patrolRadius = v;
    if (this._state === 'walk') this._enterWalk();
  }
  private _patrolRadius = Infinity;

  idleImage:   HTMLImageElement | null = null;
  walkImage:   HTMLImageElement | null = null;
  actionImage: HTMLImageElement | null = null;

  // ── Origin (spawn position) ─────────────────────────────────────────────
  private _originX = 0;
  private _originR = 0;

  // ── State machine config ──────────────────────────────────────────────────
  private readonly _idleTimeoutMin:  number;
  private readonly _idleTimeoutMax:  number;
  private readonly _walkProbability: number;
  private readonly _actionDuration:  number;
  private readonly _walkSpeed:       number;

  // ── State machine runtime ─────────────────────────────────────────────────
  private stateTimer   = 0;
  private stateTimeout = 0;
  private targetX = 0;
  private targetY = 0;
  private _phase  = 0;

  constructor(
    canvasWidth:  number,
    canvasHeight: number,
    horizonY:     number,
    options?: SpriteOptions,
  ) {
    super(
      canvasWidth, canvasHeight, horizonY,
      options?.placement     ?? 'ground',
      options?.intrinsicSize ?? 100,
      options?.pageDistance  ?? 10,
      options?.depthScaling  ?? true,
    );
    this.animated    = options?.animated    ?? true;
    this.color       = options?.color       ?? nextColor();
    this.idleImage   = options?.idleImage   ?? null;
    this.walkImage   = options?.walkImage   ?? null;
    this.actionImage = options?.actionImage ?? null;

    this._idleTimeoutMin  = options?.idleTimeoutMin  ?? 0.6;
    this._idleTimeoutMax  = options?.idleTimeoutMax  ?? 3.0;
    this._walkProbability = options?.walkProbability ?? 0.72;
    this._actionDuration  = options?.actionDuration  ?? 0.75;
    this._walkSpeed       = options?.walkSpeed       ?? 75;

    this._patrolRadius = options?.patrolRadius ?? Infinity;

    this._placeItem(options ?? {});
    this._originX = this.x;
    this._originR = this.r;
    this._enterIdle();
  }

  // ── Public state triggers ─────────────────────────────────────────────────

  /** Force an immediate transition to idle. */
  triggerIdle(): void { this._enterIdle(); }

  /** Force an immediate walk to a random target. */
  triggerWalk(): void { this._enterWalk(); }

  /** Force an immediate action (jump). */
  triggerAction(): void { this._enterAction(); }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _currentImage(): HTMLImageElement | null {
    return this._state === 'idle' ? this.idleImage
         : this._state === 'walk' ? this.walkImage
         : this.actionImage;
  }

  // ── State transitions ─────────────────────────────────────────────────────

  private _enterIdle(): void {
    this._state       = 'idle';
    this.stateTimer   = 0;
    this.stateTimeout = this._idleTimeoutMin +
      Math.random() * (this._idleTimeoutMax - this._idleTimeoutMin);
  }

  private _enterWalk(): void {
    this._state     = 'walk';
    this.stateTimer = 0;
    const mx = this.canvasW * 0.08;

    const frac = this.patrolRadius / Math.max(0.001, this.pageDistance);
    // Depth: constrain r within ±frac of origin
    const minR = Math.max(0, this._originR - frac);
    const maxR = Math.min(1, this._originR + frac);
    this.targetY = this._yFromR(minR + Math.random() * (maxR - minR));
    // X: same fraction of canvas width
    const radiusX = frac * this.canvasW;
    this.targetX = Math.max(mx, Math.min(this.canvasW - mx,
      this._originX + (Math.random() * 2 - 1) * radiusX));

    this.facingRight = this.targetX >= this.x;
    this._phase = 0;
  }

  private _enterAction(): void {
    this._state       = 'action';
    this.stateTimer   = 0;
    this.stateTimeout = this._actionDuration;
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(dt: number): void {
    if (!this.animated) return;
    this.stateTimer += dt;

    switch (this._state) {
      case 'idle':
        if (this.stateTimer >= this.stateTimeout) {
          Math.random() < this._walkProbability ? this._enterWalk() : this._enterAction();
        }
        break;

      case 'walk': {
        const dx   = this.targetX - this.x;
        const dy   = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1.5) {
          this.x = this.targetX;
          this.y = this.targetY;
          this._enterIdle();
        } else {
          const speed = this.depthScaling ? depthScale(this.r) : 1;
          const step = Math.min(this._walkSpeed * speed * dt, dist);
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
          this._phase = (this._phase + dt * 9) % (Math.PI * 2);
        }
        break;
      }

      case 'action':
        this._phase = (this._phase + dt * 6) % (Math.PI * 2);
        if (this.stateTimer >= this.stateTimeout) this._enterIdle();
        break;
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  draw(ctx: CanvasRenderingContext2D): void {
    const sz    = this.depthScaling
      ? renderedSize(this.r, this.intrinsicSize, this.pageDistance)
      : this.intrinsicSize;
    const bodyW = sz * 0.44;

    // Vertical bounce / jump offset
    let liftY = 0;
    if (this._state === 'walk') {
      liftY = Math.abs(Math.sin(this._phase)) * sz * 0.18;
    } else if (this._state === 'action') {
      liftY = Math.sin(Math.min(1, this.stateTimer / this.stateTimeout) * Math.PI) * sz * 1.3;
    }

    // Top-pin: keep head within canvas.
    const img        = this._currentImage();
    const effectiveH = img ? sz : sz * 1.15;
    const cy0        = this.y - liftY;
    const shiftDown  = Math.max(0, effectiveH - cy0);
    const cy = cy0 + shiftDown;
    const gy = this.y + shiftDown;

    // Shadow
    const shadowAlpha = 0.18 * (1 - liftY / (sz * 1.5));
    const sr = bodyW * 0.7 * (1 - liftY / (sz * 3 + 1));
    ctx.save();
    ctx.translate(this.x, gy);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(sr, 1), Math.max(sr * 0.22, 1), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Image
    if (img) {
      ctx.save();
      ctx.translate(this.x, cy);
      if (!this.facingRight) ctx.scale(-1, 1);
      ctx.drawImage(img, -sz / 2, -sz, sz, sz);
      ctx.restore();
      return;
    }

    // Stick figure
    const headR = sz * 0.30;
    const bodyH = sz * 0.38;
    const legH  = sz * 0.22;
    const legX  = bodyW * 0.26;
    const legSwing = this._state === 'walk' ? Math.sin(this._phase * 2)                 : 0;
    const armSwing = this._state === 'walk' ? Math.sin(this._phase * 2 + Math.PI * 0.5) : 0;

    ctx.save();
    ctx.translate(this.x, cy);
    if (!this.facingRight) ctx.scale(-1, 1);

    ctx.strokeStyle = this.color;
    ctx.lineWidth   = Math.max(1.5, sz * 0.1);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    ctx.beginPath(); ctx.moveTo(-legX, 0); ctx.lineTo(-legX + legSwing * sz * 0.1, -legH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( legX, 0); ctx.lineTo( legX - legSwing * sz * 0.1, -legH); ctx.stroke();

    const bodyTop  = -(legH + bodyH);
    const bodyLeft = -bodyW / 2;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(bodyLeft, bodyTop, bodyW, bodyH, Math.max(2, sz * 0.07));
    ctx.fill();

    const armY  = bodyTop + bodyH * 0.28;
    const armLn = sz * 0.22;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = Math.max(1.5, sz * 0.09);
    ctx.beginPath(); ctx.moveTo( bodyLeft, armY); ctx.lineTo( bodyLeft - armLn * 0.9, armY + armLn * 0.5 + armSwing * armLn * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-bodyLeft, armY); ctx.lineTo(-bodyLeft + armLn * 0.9, armY + armLn * 0.5 - armSwing * armLn * 0.4); ctx.stroke();

    const headCy = bodyTop - headR * 0.8;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, headCy, headR, 0, Math.PI * 2); ctx.fill();

    const eyeR   = headR * 0.21;
    const eyeX   = headR * 0.34;
    const eyeOff = headR * 0.07;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeX, headCy, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( eyeX, headCy, eyeR, 0, Math.PI * 2); ctx.fill();
    const pupilR = eyeR * 0.55;
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-eyeX + eyeOff, headCy, pupilR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( eyeX + eyeOff, headCy, pupilR, 0, Math.PI * 2); ctx.fill();

    if (this._state === 'action') {
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, headCy + headR * 0.3, headR * 0.19, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#222';
      ctx.lineWidth   = Math.max(1, sz * 0.04);
      ctx.beginPath(); ctx.arc(0, headCy + headR * 0.12, headR * 0.28, 0.2, Math.PI - 0.2); ctx.stroke();
    }

    ctx.restore();
  }
}
