# AGENT.md — Flip Layer Website Agent Protocol & Memory Ledger

> **Obsidian Vault Location**: `Flip layer website/AGENT.md`
> Any changes logged here are synced with the vault note.

## 1. Operating Protocol

### Pre-Turn Hook: Vault Lookback
At the start of every prompt:
1. **Read `Flip layer website/AGENT.md` and related notes in `Flip layer website/`** to recall past adjustments, constraints, and architecture history.
2. Formulate changes consistent with established project patterns.

### Post-Turn Hook: Ledger Update
At the end of every prompt:
1. Append details of changes to `Flip layer website/AGENT.md` (and keep this file in sync).
2. Record timestamp, modified files, adjustments made, and learnings/invariants.

---

## 2. System Architecture & Context

- **Platform**: Flip Layer Website (`Flippy v4`)
- **Key Files**:
  - `index.html`: Primary UI markup and canvas mount points.
  - `app.js`: Core application logic, event listeners, state management, and rendering pipelines.
  - `styles.css`: Visual styling, layout geometry, responsive rules, and theme variables.
  - `fx.js`: Effects, animation routines, or auxiliary canvas handling.
  - `Flip layer website/`: Obsidian vault used for persistent notes, design specs, and agent memory.

---

## 3. Change & Adjustment Log

### [2026-10-29 20:05] — Initial Setup & Protocol Bootstrap
- **Prompt / Request**: Initialize agent md in the Obsidian vault to store notes and website adjustments, and establish automatic vault lookback for future cases.
- **Files Modified**: 
  - `Flip layer website/AGENT.md`
  - `AGENT.md`
- **Adjustments Made**:
  - Configured persistent memory ledger and pre/post prompt operational lifecycle.
  - Established structured change logging format for future prompts.
  - Linked root workspace to Obsidian vault memory.
- **Learnings & Invariants**:
  - Always read the vault logs first to avoid reverting intentional design and behavioral adjustments.

### [2026-10-29 20:38] — Fix Diagonal Flip Layer Aspect Ratio & 90° Rotation Defect
- **Prompt / Request**: Fix diagonal flip layer problem observed in `Resources/Wipe Layers 5x.mp4` and `Wipe Layers 5x.xml` where the orange rectangle rotated 90° into 5:4 ratio upon 180° flip, whereas the yellow manual Alight Motion rectangle preserved its 4:5 ratio cleanly.
- **Files Modified**:
  - `app.js`
  - `Flip layer website/AGENT.md`
  - `AGENT.md`
- **Adjustments Made**:
  - **XML Generation (`generateAlightMotionXML`)**: Eliminated `<property name="size">` on standard Wipe method shapes (`!isBoxV2 && !isCube`) and replaced `scale="1.000000,1.000000"` with native Alight Motion square-base scaling `<scale value="${(targetW / 360).toFixed(6)},${(targetH / 360).toFixed(6)}"/>` (yielding `3.000000, 3.750000` for 1080×1350 4:5 projects).
  - **Effect Generation (`generateEffectsXml`)**: Conditioned `<property name="pivot">` in `flip3` to emit only when non-zero, matching Alight Motion's native export syntax.
  - **Canvas Preview (`renderPreview`)**: Added aspect ratio compensation `ctx.scale(1, 1 / rAspect)` before flip rotation and `ctx.scale(1, rAspect)` after, ensuring the live website canvas preview matches Alight Motion's local square shader pipeline without 90° rotation distortion.
  - **Formula HUD (`updateFormulas`)**: Added telemetry displaying `scaleX = W / 360`, `scaleY = H / 360` with native 360×360 isotropic base geometry explanation.
- **Learnings & Invariants**:
  - Alight Motion's `.rect` base mesh is 360×360 px. Sizing shapes via `<property name="size">` deforms the underlying mesh into anisotropic dimensions (e.g. 1080×1350); when `flip3` rotates 180° across a 45° diagonal axis, local coordinates reflect across $y = x$, swapping width and height into 1350×1080 (90° rotation).
  - Sizing shapes via `<transform><scale>` (`W/360, H/360`) without `<property name="size">` keeps the base mesh isotropic (1:1 square), so diagonal flips preserve bounding box symmetry, and the post-effect transform scale preserves the exact 4:5 ratio throughout the entire animation.

### [2026-10-29 20:55] — Correct Alight Motion Base Unit Divisor (360 -> 200)
- **Prompt / Request**: User reported that entering 600(Width) by 750(Height) resulted in the rectangle size being cut in half when imported into Alight Motion.
- **Files Modified**:
  - `app.js`
  - `Flip layer website/AGENT.md`
  - `AGENT.md`
- **Adjustments Made**:
  - **XML Scale Divisor**: Corrected scale calculation divisor in `generateAlightMotionXML` from `360.0` to Alight Motion's true native shape dimension `200.0` (`finalScaleX = targetW / 200.0`, `finalScaleY = targetH / 200.0`).
  - **Verified Scale**: Entering 600×750 now yields `<scale value="3.000000,3.750000"/>`, identical to Shape 12 ("Correct Eectangle") in user's reference XML.
  - **Formula HUD (`updateFormulas`)**: Updated live HUD formula telemetry to display `W / 200` and `H / 200` on native 200×200 base square.
- **Learnings & Invariants**:
  - Alight Motion's `.rect` default primitive dimensions are **200 × 200 px** spanning `[-100, +100]` in vector coordinates, not 360 px.
  - The correct scale multiplier for any target dimension $(W, H)$ without `<property name="size">` is strictly $\text{scaleX} = W / 200.0$, $\text{scaleY} = H / 200.0$.

### [2026-10-29 21:14] — Fix Diagonal Angle Preview & Flip Axis Synchronization
- **Prompt / Request**: Fix preview of diagonal angles on the website (which appeared distorted/messed up), calibrating against the Alight Motion reference video and flip axis.
- **Files Modified**:
  - `app.js`
  - `Flip layer website/AGENT.md`
  - `AGENT.md`
- **Adjustments Made**:
  - **3D Flip Axis Orthogonality (`renderPreview`)**: Fixed 2D flip rotation matrix in canvas. Corrected `ctx.scale(Math.cos(flipRad), 1)` to `ctx.scale(1, Math.cos(flipRad))`. The rotation axis vector must remain invariant at scale 1.0 while coordinates perpendicular to the axis rotate in/out of the plane at scale $\cos(\text{flipRad})$.
  - **Square-Space Wipe Clipping**: Wrapped diagonal wipe clip geometry inside `ctx.scale(1, 1 / rAspect)` and `ctx.scale(1, rAspect)`. In Alight Motion, `wipe2` executes in isotropic 200×200 square primitive space before non-uniform aspect scaling. This guarantees the 45° cut line and the 45° flip fold crease stay 100% coincident without angular skewing across non-square canvases (e.g. 4:5, 9:16).
  - **Dynamic Flip Axis Auto-Sync**: Added `syncFlipAxisToDirection()` when switching `splitDirection` or adjusting `wipeAngle`. Switching to `diagonal` defaults flip axis to 45°, `diagonal-desc` to 135°, `horizontal` to 0°, and `vertical` to 90°. `subSec.axisCustom` flag preserves intentional user overrides.
  - **Prevent Static Premature Clipping**: Restricted world-space rectangle clipping prior to 3D flip so single-section diagonal shapes rotate freely in 3D without getting clipped by static rectangular solid bounds.
- **Learnings & Invariants**:
  - When rotating around an arbitrary 2D axis line at angle $\theta$, points on the line do not move ($S_\parallel = 1.0$) and points perpendicular to the line foreshorten ($S_\perp = \cos\phi$). In canvas post-multiplied transforms `ctx.rotate(theta); ctx.scale(1, Math.cos(phi)); ctx.rotate(-theta);` correctly preserves the axis line.
  - Alight Motion's shader pipeline applies `wipe2` then `flip3` in square local mesh space $[-100, +100]^2$, followed by transform scale $(W/200, H/200)$. Both wipe cut lines and flip axes must be evaluated in square space before scaling to screen aspect ratio.
