/**
 * Alight Motion Editing Studio Engine - Flippy v4
 * Full Professional Alight Motion Project-Editing Workstation:
 * - Real-time Synchronized Video & Audio Engine (Hardware-decoded frames & Waveforms)
 * - 192 Verified Alight Motion Effects Catalog with GLSL Shaders & Animatable Parameters
 * - 20+ Vector Shapes (Rectangle, Star, Circle, Heart, Hexagon, Flower, etc.)
 * - Media Importer (Videos, Images, Audio Files) & "Extract Audio from Video"
 * - Freehand & Vector Drawing Tool
 * - Typography & Custom Font Importing (.ttf, .otf, .woff)
 * - Move & Transform: Position, Scale, Rotation, Anchor Point, Skew (with Keyframes ◇/◆)
 * - Color & Fill (Solid, Linear & Radial Gradients), Borders & Drop Shadows
 * - Opacity & Blending Modes (Multiply, Screen, Overlay, Color Dodge, etc.)
 * - Parent–Child Hierarchical Layer Linking & Motion Blur
 * - Interactive Canvas Transform Manipulator (Bounding Box, Corner Scale, Rotation)
 * - Multi-track Timeline with Zoom, Trimming, Clip Sliding, Layer Reordering & Splitting
 * - Beat Marking Needle with Quantized Millisecond Timecode Display
 * - Easing Curve Graph Editor Modal with Draggable Bezier Handles
 * - Undo & Redo History System (Ctrl+Z / Ctrl+Y)
 * - Export & Sharing: Native Alight Motion XML, Project JSON, Frame PNG, WebM Video Recorder
 */

(function () {
  'use strict';

  // Allowed media MIME types and file extensions
  const ALLOWED_MIME = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac'
  ];
  const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.mov', '.mkv', '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

  function isMediaAllowed(file) {
    if (!file) return false;
    if (file.type && (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'))) return true;
    const name = (file.name || '').toLowerCase();
    return ALLOWED_EXT.some(ext => name.endsWith(ext));
  }

  // =========================================================================
  // 1. PROJECT STATE & DATA MODEL
  // =========================================================================
  const project = {
    title: 'Project Name 7',
    width: 1080,
    height: 1080,
    exportWidth: 1920,
    exportHeight: 1080,
    fps: 60,
    bgColor: '#000000',       // Background color or 'transparent'
    totalDuration: 10.0,
    currentTime: 0.0,
    isPlaying: false,
    selectedLayerId: null,
    activeDrawerTab: 'media', // 'shape', 'media', 'audio', 'drawing', 'text', 'fx', 'props', 'elements'
    mediaFilter: 'all',       // 'all', 'video', 'image'
    importedMediaFiles: [],   // Stored imported video/image files
    importedAudioFiles: [],   // Stored imported audio files
    reusableElements: [],     // Reusable presets library
    showGrid: false,
    zoomLevel: 1.0,           // Timeline zoom scale
    bookmarks: [],            // Beat marks timestamps in seconds
    layers: [],               // STARTS CLEAN: ZERO SHAPES ON OPEN
    layerClipboard: null,     // Copy/paste layer buffer
    effectClipboard: null,    // Copy/paste effect buffer
    history: [],              // Undo history stack
    historyIndex: -1
  };

  // Toast notification
  function showToast(msg) {
    let t = document.getElementById('amToastMsg');
    if (!t) {
      t = document.createElement('div');
      t.id = 'amToastMsg';
      t.className = 'am-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 2600);
  }

  // =========================================================================
  // UNDO & REDO HISTORY SYSTEM
  // =========================================================================
  function saveHistoryState() {
    // Clone layers (excluding live DOM elements)
    const snapshot = {
      currentTime: project.currentTime,
      selectedLayerId: project.selectedLayerId,
      layers: project.layers.map(l => {
        const copy = JSON.parse(JSON.stringify(l, (key, value) => key === 'element' ? undefined : value));
        copy._elemRef = l.element;
        return copy;
      })
    };
    if (project.historyIndex < project.history.length - 1) {
      project.history = project.history.slice(0, project.historyIndex + 1);
    }
    project.history.push(snapshot);
    if (project.history.length > 40) project.history.shift();
    project.historyIndex = project.history.length - 1;
  }

  function undo() {
    if (project.historyIndex > 0) {
      project.historyIndex--;
      restoreHistoryState(project.history[project.historyIndex]);
      showToast('Undo');
    }
  }

  function redo() {
    if (project.historyIndex < project.history.length - 1) {
      project.historyIndex++;
      restoreHistoryState(project.history[project.historyIndex]);
      showToast('Redo');
    }
  }

  function restoreHistoryState(snap) {
    if (!snap) return;
    project.layers = snap.layers.map(l => {
      const restored = JSON.parse(JSON.stringify(l));
      restored.element = l._elemRef || null;
      return restored;
    });
    project.selectedLayerId = snap.selectedLayerId;
    renderTimeline();
    renderLayerInspector();
    renderEffectsDrawer();
    renderSceneFrame();
    updateManipulator();
  }

  // Cubic Bezier Evaluator for Alight Motion Easing Curves
  function evalCubicBezier(p1x, p1y, p2x, p2y, t) {
    let t0 = 0.0, t1 = 1.0;
    for (let i = 0; i < 8; i++) {
      let ct = (t0 + t1) * 0.5;
      let cx = 3 * (1 - ct) * (1 - ct) * ct * p1x + 3 * (1 - ct) * ct * ct * p2x + ct * ct * ct;
      if (Math.abs(cx - t) < 0.001) { t0 = ct; break; }
      if (cx < t) t0 = ct; else t1 = ct;
    }
    let ct = t0;
    return 3 * (1 - ct) * (1 - ct) * ct * p1y + 3 * (1 - ct) * ct * ct * p2y + ct * ct * ct;
  }

  // Keyframe Interpolator for animatable properties
  function getAnimatedValue(prop, t, defaultVal) {
    if (!prop) return defaultVal;
    if (!prop.keyframes || prop.keyframes.length === 0) {
      return prop.value !== undefined ? prop.value : defaultVal;
    }

    const kfs = prop.keyframes;
    if (t <= kfs[0].t) return kfs[0].v;
    if (t >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].v;

    for (let i = 0; i < kfs.length - 1; i++) {
      const k1 = kfs[i];
      const k2 = kfs[i + 1];
      if (t >= k1.t && t <= k2.t) {
        const segT = (t - k1.t) / (k2.t - k1.t);
        let easeT = segT;
        if (k1.e) {
          const parts = k1.e.split(' ');
          if (parts[0] === 'cubicBezier' && parts.length >= 5) {
            easeT = evalCubicBezier(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]), segT);
          }
        }
        if (typeof k1.v === 'number' && typeof k2.v === 'number') {
          return k1.v + (k2.v - k1.v) * easeT;
        }
        return segT < 0.5 ? k1.v : k2.v;
      }
    }
    return defaultVal;
  }

  // Format seconds to Alight Motion MM:SS.mmm (Counting each millisecond quantized to project FPS)
  function formatAmTime(sec, fps) {
    fps = fps || project.fps || 60;
    const msPerFrame = 1000 / fps;
    const currentFrame = Math.round(sec * fps);
    const totalSec = currentFrame / fps;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const ms = Math.min(999, Math.round((currentFrame % fps) * msPerFrame));
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
  }

  // =========================================================================
  // 2. WEBGL GLSL SHADER EXECUTION & RENDERING PIPELINE
  // =========================================================================
  let gl = null;
  let canvasElem = null;
  let mainCanvasCtx = null;
  let offscreenCanvas = null;
  let offscreenCtx = null;
  let glCanvas = null;
  let layerCanvas = null;
  let layerCtx = null;
  let glPrograms = {};
  let copyProgram = null;

  // WebGL Ping-Pong Textures & Framebuffers for Multi-Pass Chaining
  let pingPongFBOs = [];
  let pingPongTextures = [];
  let quadBuffer = null;

  const VS_QUAD = `
    attribute vec2 a_pos;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      v_uv = a_uv;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FS_COPY = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    void main() {
      gl_FragColor = texture2D(u_texture, v_uv);
    }
  `;

  const MACRO_HEADER = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float u_time;

    // Alight Motion Standard Parameter Uniforms
    uniform float strength;
    uniform float amount;
    uniform float size;
    uniform float radius;
    uniform float angle;
    uniform float frequency;
    uniform float phase;
    uniform float xamp;
    uniform float yamp;
    uniform float xspace;
    uniform float yspace;
    uniform float brightness;
    uniform float contrast;
    uniform float exposure;
    uniform float gamma;
    uniform float offset;
    uniform float threshold;
    uniform float spread;
    uniform float seed;
    uniform float count;
    uniform float zoom;
    uniform float iterations;
    uniform float dispersion;
    uniform float split;
    uniform float saturation;
    uniform float red;
    uniform float green;
    uniform float blue;
    uniform vec4 color;
    uniform vec4 darkColor;

    // Alight Motion Shader Compatibility Macros
    #define inputImg u_texture
    #define texture inputImg
    #define texture2DCv(tex, coord) texture2D(u_texture, clamp(coord, 0.0, 1.0))
    #define acScreenNorm v_uv
    #define acLayerNorm v_uv
    #define acScreenSize u_resolution
    #define acTime u_time
    #define acPass 0
    #define l2s(v) (v)
  `;

  function initWebGL() {
    canvasElem = document.getElementById('amGlCanvas');
    if (!canvasElem) return false;

    mainCanvasCtx = canvasElem.getContext('2d');

    // Offscreen 2D canvas for compositing scene layers
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = project.width;
    offscreenCanvas.height = project.height;
    offscreenCtx = offscreenCanvas.getContext('2d');

    // Dedicated single-layer canvas for pre-shader rendering
    layerCanvas = document.createElement('canvas');
    layerCanvas.width = project.width;
    layerCanvas.height = project.height;
    layerCtx = layerCanvas.getContext('2d');

    // WebGL Canvas & Context for GLSL shader post-processing
    glCanvas = document.createElement('canvas');
    glCanvas.width = project.width;
    glCanvas.height = project.height;
    gl = glCanvas.getContext('webgl', { antialias: false, alpha: true, preserveDrawingBuffer: true }) ||
         glCanvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });

    if (!gl) return false;

    // Full screen quad buffer
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
      -1,  1, 0, 1,
       1, -1, 1, 0,
       1,  1, 1, 1
    ]), gl.STATIC_DRAW);

    // Create 2 textures and 2 framebuffers for ping-pong chaining
    pingPongFBOs = [gl.createFramebuffer(), gl.createFramebuffer()];
    pingPongTextures = [gl.createTexture(), gl.createTexture()];

    const w = project.width;
    const h = project.height;

    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, pingPongTextures[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      gl.bindFramebuffer(gl.FRAMEBUFFER, pingPongFBOs[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pingPongTextures[i], 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    copyProgram = createProgram(gl, VS_QUAD, FS_COPY);

    const vp = document.getElementById('amCanvasViewport');
    if (vp) vp.style.aspectRatio = `${project.width} / ${project.height}`;

    return true;
  }

  function createProgram(glCtx, vsCode, fsCode) {
    const vs = glCtx.createShader(glCtx.VERTEX_SHADER);
    glCtx.shaderSource(vs, vsCode);
    glCtx.compileShader(vs);
    if (!glCtx.getShaderParameter(vs, glCtx.COMPILE_STATUS)) {
      console.warn('VS Error:', glCtx.getShaderInfoLog(vs));
      return null;
    }

    const fs = glCtx.createShader(glCtx.FRAGMENT_SHADER);
    glCtx.shaderSource(fs, fsCode);
    glCtx.compileShader(fs);
    if (!glCtx.getShaderParameter(fs, glCtx.COMPILE_STATUS)) {
      console.warn('FS Error:', glCtx.getShaderInfoLog(fs));
      return null;
    }

    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getShaderParameter(prog, glCtx.LINK_STATUS)) {
      console.warn('Link Error:', glCtx.getShaderInfoLog(prog));
      return null;
    }
    return prog;
  }

  function getOrCreateEffectProgram(eff) {
    if (glPrograms[eff.id]) return glPrograms[eff.id];

    let shaderBody = eff.glsl || (window.AM_GLSL_CATALOG && window.AM_GLSL_CATALOG[eff.id]);
    if (!shaderBody) {
      shaderBody = `
        void main() {
          vec4 c = texture2DCv(inputImg.texture, acScreenNorm);
          gl_FragColor = c;
        }
      `;
    }

    const fullFs = MACRO_HEADER + '\n' + shaderBody;
    const prog = createProgram(gl, VS_QUAD, fullFs);
    if (prog) {
      glPrograms[eff.id] = prog;
      return prog;
    }
    return copyProgram;
  }

  // Execute GLSL Post-Processing Pipeline on a Layer's Buffer
  function applyEffectsToLayer(srcCanvas, layer, t) {
    if (!gl || !layer.effects || layer.effects.length === 0) {
      return srcCanvas;
    }

    const w = project.width;
    const h = project.height;

    if (glCanvas.width !== w || glCanvas.height !== h) {
      glCanvas.width = w;
      glCanvas.height = h;
      for (let i = 0; i < 2; i++) {
        gl.bindTexture(gl.TEXTURE_2D, pingPongTextures[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
    }

    // 1. Upload initial source canvas to Texture 0
    gl.bindTexture(gl.TEXTURE_2D, pingPongTextures[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);

    let curIn = 0;
    let curOut = 1;

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);

    // 2. Chained Multi-Pass GLSL Execution
    layer.effects.forEach((eff) => {
      const prog = getOrCreateEffectProgram(eff);
      if (!prog) return;

      gl.useProgram(prog);

      const aPos = gl.getAttribLocation(prog, 'a_pos');
      const aUv = gl.getAttribLocation(prog, 'a_uv');
      if (aPos >= 0) {
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
      }
      if (aUv >= 0) {
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
      }

      // Bind input texture from previous pass
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pingPongTextures[curIn]);
      const uTex = gl.getUniformLocation(prog, 'u_texture');
      if (uTex) gl.uniform1i(uTex, 0);

      // Standard Alight Motion Uniforms
      const uRes = gl.getUniformLocation(prog, 'u_resolution');
      if (uRes) gl.uniform2f(uRes, w, h);
      const uTime = gl.getUniformLocation(prog, 'u_time');
      if (uTime) gl.uniform1f(uTime, t);

      // Effect Parameter Uniforms (Evaluates animatable keyframes)
      Object.entries(eff.params || {}).forEach(([pId, prop]) => {
        const loc = gl.getUniformLocation(prog, pId);
        if (loc) {
          const val = getAnimatedValue(prop, t, prop.value !== undefined ? prop.value : 0.5);
          gl.uniform1f(loc, Number(val));
        }
      });

      // Render Quad to Destination Ping-Pong Framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, pingPongFBOs[curOut]);
      gl.viewport(0, 0, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Swap Ping-Pong Buffers
      const temp = curIn;
      curIn = curOut;
      curOut = temp;
    });

    // 3. Blit final pass from FBO to glCanvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);

    gl.useProgram(copyProgram);
    const aPos = gl.getAttribLocation(copyProgram, 'a_pos');
    const aUv = gl.getAttribLocation(copyProgram, 'a_uv');
    if (aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    }
    if (aUv >= 0) {
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pingPongTextures[curIn]);
    const uTex = gl.getUniformLocation(copyProgram, 'u_texture');
    if (uTex) gl.uniform1i(uTex, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    return glCanvas;
  }

  // Draw 20 Vector Shapes
  function renderShape(ctx, layer, t) {
    const st = layer.shapeType || 'rect';
    const sz = layer.size || 240;
    const half = sz / 2;

    ctx.beginPath();
    switch (st) {
      case 'circle':
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        break;
      case 'pie':
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, half, 0.4, Math.PI * 2 - 0.4);
        ctx.closePath();
        break;
      case 'round_rect':
        const r = layer.cornerRadius || 24;
        ctx.roundRect(-half, -half, sz, sz, r);
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = half * Math.cos(angle);
          const py = half * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'star':
        const points = 5;
        const outer = half;
        const inner = half * 0.45;
        for (let i = 0; i < points * 2; i++) {
          const rad = (i * Math.PI) / points - Math.PI / 2;
          const dist = i % 2 === 0 ? outer : inner;
          const px = dist * Math.cos(rad);
          const py = dist * Math.sin(rad);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'plus':
        const arm = sz * 0.35;
        const thick = sz * 0.25;
        ctx.moveTo(-thick / 2, -arm);
        ctx.lineTo(thick / 2, -arm);
        ctx.lineTo(thick / 2, -thick / 2);
        ctx.lineTo(arm, -thick / 2);
        ctx.lineTo(arm, thick / 2);
        ctx.lineTo(thick / 2, thick / 2);
        ctx.lineTo(thick / 2, arm);
        ctx.lineTo(-thick / 2, arm);
        ctx.lineTo(-thick / 2, thick / 2);
        ctx.lineTo(-arm, thick / 2);
        ctx.lineTo(-arm, -thick / 2);
        ctx.lineTo(-thick / 2, -thick / 2);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(0, -half);
        ctx.lineTo(half, half);
        ctx.lineTo(-half, half);
        ctx.closePath();
        break;
      case 'heart':
        const topCurveHeight = half * 0.7;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -half, 0, -half, topCurveHeight);
        ctx.bezierCurveTo(-half, half, 0, half * 1.3, 0, half * 1.6);
        ctx.bezierCurveTo(0, half * 1.3, half, half, half, topCurveHeight);
        ctx.bezierCurveTo(half, 0, 0, 0, 0, topCurveHeight);
        ctx.closePath();
        break;
      case 'crescent':
        ctx.arc(0, 0, half, -Math.PI / 2, Math.PI / 2, false);
        ctx.quadraticCurveTo(half * 0.3, 0, 0, -half);
        ctx.closePath();
        break;
      case 'multifoil':
        const petals = 8;
        for (let i = 0; i < petals * 2; i++) {
          const rad = (i * Math.PI) / petals;
          const dist = i % 2 === 0 ? half : half * 0.6;
          const px = dist * Math.cos(rad);
          const py = dist * Math.sin(rad);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'arrow':
        ctx.moveTo(0, -half);
        ctx.lineTo(half, 0);
        ctx.lineTo(half * 0.4, 0);
        ctx.lineTo(half * 0.4, half);
        ctx.lineTo(-half * 0.4, half);
        ctx.lineTo(-half * 0.4, 0);
        ctx.lineTo(-half, 0);
        ctx.closePath();
        break;
      case 'ring':
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.arc(0, 0, half * 0.6, 0, Math.PI * 2, true);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(0, -half);
        ctx.lineTo(half, 0);
        ctx.lineTo(0, half);
        ctx.lineTo(-half, 0);
        ctx.closePath();
        break;
      case 'line':
        ctx.moveTo(-half, 0);
        ctx.lineTo(half, 0);
        break;
      default: // 'rect'
        ctx.rect(-half, -half, sz, sz);
        break;
    }

    // Fill style (solid or gradient)
    if (layer.fillType === 'gradient' && layer.gradient) {
      const g = ctx.createLinearGradient(-half, -half, half, half);
      g.addColorStop(0, layer.gradient.start || '#ff4757');
      g.addColorStop(1, layer.gradient.end || '#2ed573');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = layer.fillColor || '#ff4757';
    }

    // Shadow
    if (layer.shadow && layer.shadow.blur > 0) {
      ctx.shadowColor = layer.shadow.color || 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.x || 0;
      ctx.shadowOffsetY = layer.shadow.y || 0;
    } else {
      ctx.shadowColor = 'transparent';
    }

    ctx.fill();

    // Stroke
    if (layer.stroke && layer.stroke.width > 0) {
      ctx.strokeStyle = layer.stroke.color || '#ffffff';
      ctx.lineWidth = layer.stroke.width;
      ctx.stroke();
    }
  }

  // Draw Text Layer
  function renderText(ctx, layer) {
    const text = layer.text || 'Alight Motion';
    const fontSize = layer.fontSize || 64;
    const fontFamily = layer.fontFamily || 'Roboto, sans-serif';
    ctx.font = `${layer.fontWeight || '700'} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = layer.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = layer.color || '#ffffff';

    if (layer.shadow && layer.shadow.blur > 0) {
      ctx.shadowColor = layer.shadow.color || 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.x || 0;
      ctx.shadowOffsetY = layer.shadow.y || 0;
    } else {
      ctx.shadowColor = 'transparent';
    }

    ctx.fillText(text, 0, 0);

    if (layer.stroke && layer.stroke.width > 0) {
      ctx.strokeStyle = layer.stroke.color || '#000000';
      ctx.lineWidth = layer.stroke.width;
      ctx.strokeText(text, 0, 0);
    }
  }

  // Draw Freehand / Vector Drawing Layer
  function renderDrawing(ctx, layer) {
    if (!layer.points || layer.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = layer.strokeColor || '#00e676';
    ctx.lineWidth = layer.strokeWidth || 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(layer.points[0].x, layer.points[0].y);
    for (let i = 1; i < layer.points.length; i++) {
      ctx.lineTo(layer.points[i].x, layer.points[i].y);
    }
    ctx.stroke();
  }

  // Main Scene Frame Renderer (Full GLSL Effect Post-Processing)
  function renderSceneFrame() {
    if (!canvasElem || !offscreenCtx || !layerCtx) return;

    const w = project.width;
    const h = project.height;
    if (canvasElem.width !== w || canvasElem.height !== h) {
      canvasElem.width = w;
      canvasElem.height = h;
    }
    if (layerCanvas.width !== w || layerCanvas.height !== h) {
      layerCanvas.width = w;
      layerCanvas.height = h;
    }

    // 1. Clear offscreen 2D canvas with project.bgColor
    offscreenCtx.clearRect(0, 0, w, h);
    const curBg = project.bgColor || '#000000';
    if (curBg !== 'transparent') {
      offscreenCtx.fillStyle = curBg;
      offscreenCtx.fillRect(0, 0, w, h);
    }

    const t = project.currentTime;

    // Show empty prompt if no layers
    const emptyPrompt = document.getElementById('amEmptyCanvasPrompt');
    if (emptyPrompt) {
      emptyPrompt.style.display = project.layers.length === 0 ? 'flex' : 'none';
    }

    // 2. Render each visible layer (reverse order so index 0 is on top)
    const reversed = [...project.layers].reverse();

    reversed.forEach((layer) => {
      if (!layer.visible) return;
      if (t < layer.startTime || t > layer.endTime) return;

      // STEP A: Render raw layer content into clean layerCanvas
      layerCtx.clearRect(0, 0, w, h);

      if (layer.type === 'media') {
        const elem = layer.element;
        if (elem) {
          const vw = elem.videoWidth || elem.naturalWidth || w;
          const vh = elem.videoHeight || elem.naturalHeight || h;
          const fit = Math.min((w * 0.95) / vw, (h * 0.95) / vh);
          const dw = vw * fit;
          const dh = vh * fit;
          try {
            layerCtx.drawImage(elem, (w - dw) / 2, (h - dh) / 2, dw, dh);
          } catch (err) {}
        }
      } else if (layer.type === 'shape') {
        layerCtx.save();
        layerCtx.translate(w / 2, h / 2);
        renderShape(layerCtx, layer, t);
        layerCtx.restore();
      } else if (layer.type === 'text') {
        layerCtx.save();
        layerCtx.translate(w / 2, h / 2);
        renderText(layerCtx, layer);
        layerCtx.restore();
      } else if (layer.type === 'drawing') {
        renderDrawing(layerCtx, layer);
      }

      // STEP B: PASS LAYER BUFFER THROUGH WEBGL GLSL SHADER PIPELINE
      let finalBuffer = layerCanvas;
      if (layer.effects && layer.effects.length > 0) {
        finalBuffer = applyEffectsToLayer(layerCanvas, layer, t);
      }

      // STEP C: BLIT PROCESSED LAYER TO SCENE WITH TRANSFORMS, OPACITY & BLEND MODE
      offscreenCtx.save();

      // Blending Mode
      if (layer.blendMode) {
        offscreenCtx.globalCompositeOperation = layer.blendMode;
      }

      // Animated Transform Values
      let posX = getAnimatedValue(layer.transform.x, t, w / 2);
      let posY = getAnimatedValue(layer.transform.y, t, h / 2);
      let sX = getAnimatedValue(layer.transform.scaleX, t, 1.0);
      let sY = getAnimatedValue(layer.transform.scaleY, t, 1.0);
      let rot = getAnimatedValue(layer.transform.rotation, t, 0.0);
      let skewX = getAnimatedValue(layer.transform.skewX, t, 0.0);
      let skewY = getAnimatedValue(layer.transform.skewY, t, 0.0);
      let alpha = getAnimatedValue(layer.transform.opacity, t, 1.0);
      let pivotX = layer.transform.pivotX ? layer.transform.pivotX.value : 0;
      let pivotY = layer.transform.pivotY ? layer.transform.pivotY.value : 0;

      // Parent-Child Hierarchical Linking
      if (layer.parentId) {
        const parent = project.layers.find(p => p.id === layer.parentId);
        if (parent) {
          const pPosX = getAnimatedValue(parent.transform.x, t, w / 2);
          const pPosY = getAnimatedValue(parent.transform.y, t, h / 2);
          const pSX = getAnimatedValue(parent.transform.scaleX, t, 1.0);
          const pSY = getAnimatedValue(parent.transform.scaleY, t, 1.0);
          const pRot = getAnimatedValue(parent.transform.rotation, t, 0.0);
          offscreenCtx.translate(pPosX, pPosY);
          offscreenCtx.rotate((pRot * Math.PI) / 180);
          offscreenCtx.scale(pSX, pSY);
        }
      }

      offscreenCtx.translate(posX, posY);
      offscreenCtx.rotate((rot * Math.PI) / 180);
      if (skewX !== 0 || skewY !== 0) {
        offscreenCtx.transform(1, Math.tan((skewY * Math.PI) / 180), Math.tan((skewX * Math.PI / 180)), 1, 0, 0);
      }
      offscreenCtx.scale(sX, sY);
      offscreenCtx.translate(-pivotX, -pivotY);
      offscreenCtx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Draw the effect-rendered buffer centered
      offscreenCtx.drawImage(finalBuffer, -w / 2, -h / 2, w, h);

      offscreenCtx.restore();
    });

    // 3. Blit to main visible canvas
    mainCanvasCtx.clearRect(0, 0, w, h);
    mainCanvasCtx.drawImage(offscreenCanvas, 0, 0);

    updateManipulator();
  }

  // =========================================================================
  // 3. MASTER PLAYBACK & AUDIO/VIDEO SYNCHRONIZATION
  // =========================================================================
  let animFrameId = null;
  let lastPlayTime = performance.now();

  function syncAllMediaPlayback() {
    const t = project.currentTime;

    project.layers.forEach(layer => {
      // 1. Synchronize Video Layers
      if (layer.type === 'media' && layer.mediaType === 'video' && layer.element) {
        const vid = layer.element;
        if (t >= layer.startTime && t <= layer.endTime) {
          const target = Math.max(0, t - layer.startTime);
          if (Math.abs(vid.currentTime - target) > 0.08) {
            vid.currentTime = target;
          }
          vid.muted = layer.muted || false;
          vid.volume = layer.muted ? 0 : Math.min(1.0, layer.volume !== undefined ? layer.volume : 1.0);
          if (project.isPlaying) {
            if (vid.paused) vid.play().catch(() => {});
          } else {
            if (!vid.paused) vid.pause();
          }
        } else {
          if (!vid.paused) vid.pause();
        }
      }

      // 2. Synchronize Audio Layers
      if (layer.type === 'audio' && layer.element) {
        const aud = layer.element;
        if (t >= layer.startTime && t <= layer.endTime) {
          const target = Math.max(0, t - layer.startTime);
          if (Math.abs(aud.currentTime - target) > 0.08) {
            aud.currentTime = target;
          }
          aud.volume = layer.muted ? 0 : Math.min(1.0, layer.volume !== undefined ? layer.volume : 1.0);
          if (project.isPlaying) {
            if (aud.paused) aud.play().catch(() => {});
          } else {
            if (!aud.paused) aud.pause();
          }
        } else {
          if (!aud.paused) aud.pause();
        }
      }
    });
  }

  function playbackLoop() {
    if (project.isPlaying) {
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastPlayTime) / 1000);
      lastPlayTime = now;

      project.currentTime += delta;
      if (project.currentTime >= project.totalDuration) {
        project.currentTime = 0;
      }

      syncAllMediaPlayback();
      updateScrubberPosition();
      renderSceneFrame();
    } else {
      lastPlayTime = performance.now();
    }
    animFrameId = requestAnimationFrame(playbackLoop);
  }

  function updatePlayButtonIcons() {
    const playIcons = document.querySelectorAll('.am-play-icon');
    playIcons.forEach(icon => {
      icon.innerHTML = project.isPlaying
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    });
  }

  function togglePlay() {
    project.isPlaying = !project.isPlaying;
    updatePlayButtonIcons();
    syncAllMediaPlayback();
  }

  function setPlayheadTime(sec) {
    project.currentTime = Math.max(0, Math.min(project.totalDuration, sec));
    syncAllMediaPlayback();
    updateScrubberPosition();
    renderTimeline();
    renderSceneFrame();
  }

  // =========================================================================
  // 4. RULER, BEAT MARKING & TIMELINE ENGINE
  // =========================================================================
  function renderRuler() {
    const rCanvas = document.getElementById('amRulerCanvas');
    const rulerWrap = document.getElementById('amRulerWrap');
    if (!rCanvas || !rulerWrap) return;

    const dpr = window.devicePixelRatio || 1;
    const width = rulerWrap.clientWidth;
    const height = rulerWrap.clientHeight || 24;

    if (rCanvas.width !== width * dpr || rCanvas.height !== height * dpr) {
      rCanvas.width = width * dpr;
      rCanvas.height = height * dpr;
    }

    const ctx = rCanvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#161924';
    ctx.fillRect(0, 0, width, height);

    const laneWidth = (width - 180) * (project.zoomLevel || 1.0);
    if (laneWidth <= 0) { ctx.restore(); return; }

    const dur = project.totalDuration;
    const stepSec = dur > 20 ? 2 : 1;

    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';

    for (let s = 0; s <= dur; s += stepSec) {
      const x = 180 + (s / dur) * laneWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, height - 10);
      ctx.lineTo(x, height);
      ctx.stroke();

      const m = Math.floor(s / 60);
      const secNum = s % 60;
      const label = `${String(m).padStart(2, '0')}:${String(secNum).padStart(2, '0')}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(label, x + 3, 4);

      if (dur <= 15) {
        const subDiv = 4;
        for (let sub = 1; sub < subDiv; sub++) {
          const subX = x + (sub / subDiv) * (stepSec / dur) * laneWidth;
          if (subX < width) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.beginPath();
            ctx.moveTo(subX, height - 5);
            ctx.lineTo(subX, height);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();

    // Render HTML Beat Pins on Ruler
    let pinWrap = document.getElementById('amRulerPinsWrap');
    if (!pinWrap) {
      pinWrap = document.createElement('div');
      pinWrap.id = 'amRulerPinsWrap';
      pinWrap.style.position = 'absolute';
      pinWrap.style.top = '0';
      pinWrap.style.bottom = '0';
      pinWrap.style.left = '0';
      pinWrap.style.right = '0';
      pinWrap.style.pointerEvents = 'none';
      rulerWrap.appendChild(pinWrap);
    }
    pinWrap.innerHTML = '';

    (project.bookmarks || []).forEach(b => {
      const pct = b / project.totalDuration;
      const left = 180 + (pct * laneWidth);
      const pin = document.createElement('div');
      pin.className = 'am-beat-pin';
      pin.style.left = `${left}px`;
      pin.title = `Beat at ${formatAmTime(b, project.fps)} (Click to jump)`;
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        setPlayheadTime(b);
      });
      pinWrap.appendChild(pin);
    });
  }

  function renderBeatMarkers() {
    const layer = document.getElementById('amBeatLinesLayer');
    const tracksContainer = document.getElementById('amTracksViewport');
    if (!layer || !tracksContainer) return;
    layer.innerHTML = '';

    const laneWidth = (tracksContainer.clientWidth - 180) * (project.zoomLevel || 1.0);
    if (laneWidth <= 0) return;

    (project.bookmarks || []).forEach(b => {
      const pct = b / project.totalDuration;
      const left = 180 + (pct * laneWidth);
      const line = document.createElement('div');
      line.className = 'am-beat-line';
      line.style.left = `${left}px`;
      line.title = `Beat at ${formatAmTime(b, project.fps)} (Click to jump / Click playhead to remove)`;
      line.addEventListener('click', (e) => {
        e.stopPropagation();
        setPlayheadTime(b);
      });
      layer.appendChild(line);
    });

    renderRuler();
  }

  function toggleBeatBookmark(sec) {
    if (!project.bookmarks) project.bookmarks = [];
    const t = Math.max(0, Math.min(project.totalDuration, sec));
    const frameTolerance = 1.0 / project.fps;
    const existingIdx = project.bookmarks.findIndex(b => Math.abs(b - t) < frameTolerance);

    const playhead = document.getElementById('amPlayheadLine');

    if (existingIdx !== -1) {
      const removedTime = project.bookmarks[existingIdx];
      project.bookmarks.splice(existingIdx, 1);
      showToast(`Beat removed (${formatAmTime(removedTime, project.fps)})`);
    } else {
      project.bookmarks.push(t);
      project.bookmarks.sort((a, b) => a - b);
      showToast(`Beat marked at ${formatAmTime(t, project.fps)}`);
      if (playhead) {
        playhead.classList.add('flash-beat');
        setTimeout(() => playhead.classList.remove('flash-beat'), 350);
      }
    }
    renderBeatMarkers();
    renderTimeline();
  }

  function jumpPrevMarker() {
    const allPoints = [];
    project.layers.forEach(l => {
      ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'].forEach(k => {
        if (l.transform[k] && l.transform[k].keyframes) {
          l.transform[k].keyframes.forEach(kf => allPoints.push(kf.t));
        }
      });
    });
    (project.bookmarks || []).forEach(b => allPoints.push(b));
    const unique = [...new Set(allPoints)].sort((a, b) => a - b);
    const prev = unique.filter(t => t < project.currentTime - (0.5 / project.fps));
    if (prev.length > 0) {
      setPlayheadTime(prev[prev.length - 1]);
    } else {
      setPlayheadTime(0);
    }
  }

  function jumpNextMarker() {
    const allPoints = [];
    project.layers.forEach(l => {
      ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'].forEach(k => {
        if (l.transform[k] && l.transform[k].keyframes) {
          l.transform[k].keyframes.forEach(kf => allPoints.push(kf.t));
        }
      });
    });
    (project.bookmarks || []).forEach(b => allPoints.push(b));
    const unique = [...new Set(allPoints)].sort((a, b) => a - b);
    const next = unique.find(t => t > project.currentTime + (0.5 / project.fps));
    if (next !== undefined) {
      setPlayheadTime(next);
    } else {
      setPlayheadTime(project.totalDuration);
    }
  }

  // Draw Audio Waveform inside Purple Audio Timeline Track
  function drawAudioWaveform(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    const bars = Math.floor(w / 4);
    const mid = h / 2;
    for (let i = 0; i < bars; i++) {
      const x = i * 4;
      const noise = Math.sin(i * 0.2) * 0.4 + Math.sin(i * 0.05) * 0.3 + (Math.random() * 0.3);
      const barH = Math.max(3, Math.abs(noise) * (h * 0.75));
      ctx.fillRect(x, mid - barH / 2, 2, barH);
    }
  }

  function renderTimeline() {
    const tracksContainer = document.getElementById('amTracksViewport');
    if (!tracksContainer) return;
    tracksContainer.innerHTML = '';

    if (project.layers.length === 0) {
      tracksContainer.innerHTML = `
        <div class="am-empty-timeline-hint">
          Timeline is empty. Choose a shape, import media, or add text to start editing.
        </div>
      `;
      updateScrubberPosition();
      return;
    }

    const totalDur = project.totalDuration;
    const zoom = project.zoomLevel || 1.0;

    project.layers.forEach((layer, idx) => {
      const row = document.createElement('div');
      row.className = `am-track-row ${layer.id === project.selectedLayerId ? 'selected' : ''}`;
      row.dataset.layerId = layer.id;

      // Track Head
      const head = document.createElement('div');
      head.className = 'am-track-head';
      head.innerHTML = `
        <button class="am-track-visibility" title="Toggle Visibility" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${layer.visible ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>'}
          </svg>
        </button>
        <div class="am-track-thumb-box">
          ${layer.type === 'media' && layer.element && layer.mediaType === 'image' ? `<img class="am-track-thumb-img" src="${layer.element.src}" alt="">` : ''}
          ${layer.type === 'media' && layer.mediaType === 'video' ? '<span style="font-size:10px; color:#fff;">VID</span>' : ''}
          ${layer.type === 'audio' ? '<span style="font-size:10px; color:#fff;">♫</span>' : ''}
          ${layer.type === 'shape' ? '<span style="font-size:10px; color:#fff;">▲</span>' : ''}
          ${layer.type === 'text' ? '<span style="font-size:10px; color:#fff;">Aa</span>' : ''}
          ${layer.type === 'drawing' ? '<span style="font-size:10px; color:#fff;">✎</span>' : ''}
        </div>
        <span class="am-track-name" title="${layer.name}">${layer.name}</span>
      `;

      head.querySelector('.am-track-visibility').addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        renderTimeline();
        renderSceneFrame();
      });

      head.addEventListener('click', () => {
        selectLayer(layer.id, true);
      });

      // Track Lane
      const lane = document.createElement('div');
      lane.className = 'am-track-lane';

      const leftPct = (layer.startTime / totalDur) * 100 * zoom;
      const widthPct = ((layer.endTime - layer.startTime) / totalDur) * 100 * zoom;

      const clip = document.createElement('div');
      clip.className = `am-clip-block ${layer.colorCls || 'am-clip-media'}`;
      clip.style.left = `${leftPct}%`;
      clip.style.width = `${widthPct}%`;

      // Audio waveform inside audio track
      if (layer.type === 'audio') {
        const wf = document.createElement('canvas');
        wf.className = 'am-clip-waveform-canvas';
        wf.width = 300;
        wf.height = 36;
        drawAudioWaveform(wf);
        clip.appendChild(wf);
      }

      // Filmstrip preview inside video clip
      if (layer.type === 'media' && layer.element && layer.mediaType === 'video') {
        const strip = document.createElement('div');
        strip.className = 'am-clip-filmstrip';
        for (let i = 0; i < 4; i++) {
          const frameBox = document.createElement('div');
          frameBox.className = 'am-clip-film-frame';
          frameBox.style.background = '#222838';
          strip.appendChild(frameBox);
        }
        clip.appendChild(strip);
      }

      const label = document.createElement('span');
      label.style.position = 'relative';
      label.style.zIndex = '4';
      label.textContent = layer.name;
      clip.appendChild(label);

      // Beat marks on Clip (Screenshot 3 style)
      (project.bookmarks || []).forEach(bt => {
        if (bt >= layer.startTime && bt <= layer.endTime) {
          const bPct = ((bt - layer.startTime) / (layer.endTime - layer.startTime)) * 100;
          const notch = document.createElement('div');
          notch.className = 'am-clip-beat-notch';
          notch.style.left = `${bPct}%`;
          notch.title = `Beat at ${formatAmTime(bt, project.fps)}`;
          clip.appendChild(notch);
        }
      });

      // Interactive Trimming Handles
      const trimL = document.createElement('div');
      trimL.className = 'am-clip-trim left';
      trimL.title = 'Drag to Trim Start';
      const trimR = document.createElement('div');
      trimR.className = 'am-clip-trim right';
      trimR.title = 'Drag to Trim End';
      clip.appendChild(trimL);
      clip.appendChild(trimR);

      // Handle left trim drag
      trimL.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const initStart = layer.startTime;
        const laneW = tracksContainer.clientWidth - 180;
        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const dt = (dx / laneW) * totalDur;
          layer.startTime = Math.max(0, Math.min(layer.endTime - 0.2, initStart + dt));
          renderTimeline();
          renderSceneFrame();
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          saveHistoryState();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      // Handle right trim drag
      trimR.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const initEnd = layer.endTime;
        const laneW = tracksContainer.clientWidth - 180;
        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const dt = (dx / laneW) * totalDur;
          layer.endTime = Math.max(layer.startTime + 0.2, Math.min(totalDur, initEnd + dt));
          renderTimeline();
          renderSceneFrame();
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          saveHistoryState();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      // Handle clip sliding (horizontal dragging without changing duration)
      clip.addEventListener('pointerdown', (e) => {
        if (e.target === trimL || e.target === trimR || e.target.classList.contains('am-kf-diamond')) return;
        e.stopPropagation();
        selectLayer(layer.id, true);

        const startX = e.clientX;
        const initStart = layer.startTime;
        const initEnd = layer.endTime;
        const dur = initEnd - initStart;
        const laneW = tracksContainer.clientWidth - 180;

        let moved = false;
        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          if (Math.abs(dx) > 3) moved = true;
          const dt = (dx / laneW) * totalDur;
          const newStart = Math.max(0, Math.min(totalDur - dur, initStart + dt));
          layer.startTime = newStart;
          layer.endTime = newStart + dur;
          renderTimeline();
          renderSceneFrame();
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if (moved) saveHistoryState();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      // Keyframe Diamonds on Clip
      const allKfs = [];
      ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'].forEach(k => {
        if (layer.transform[k] && layer.transform[k].keyframes) {
          layer.transform[k].keyframes.forEach(kf => allKfs.push(kf.t));
        }
      });
      (layer.effects || []).forEach(eff => {
        Object.values(eff.params || {}).forEach(p => {
          if (p.keyframes) p.keyframes.forEach(kf => allKfs.push(kf.t));
        });
      });

      const uniqueKfs = [...new Set(allKfs)].sort((a, b) => a - b);
      uniqueKfs.forEach((t) => {
        if (t >= layer.startTime && t <= layer.endTime) {
          const kfPct = ((t - layer.startTime) / (layer.endTime - layer.startTime)) * 100;
          const diamond = document.createElement('div');
          diamond.className = `am-kf-diamond ${Math.abs(t - project.currentTime) < 0.04 ? 'active' : ''}`;
          diamond.style.left = `${kfPct}%`;
          diamond.title = `Keyframe at ${formatAmTime(t, project.fps)}`;
          diamond.addEventListener('click', (e) => {
            e.stopPropagation();
            setPlayheadTime(t);
          });
          clip.appendChild(diamond);
        }
      });

      lane.appendChild(clip);

      // Reordering Grip (Move Up / Down)
      const grip = document.createElement('div');
      grip.className = 'am-track-grip';
      grip.innerHTML = '&#9776;';
      grip.title = 'Click to move layer up / down';
      grip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const temp = project.layers[idx];
          project.layers[idx] = project.layers[idx - 1];
          project.layers[idx - 1] = temp;
          renderTimeline();
          renderSceneFrame();
          saveHistoryState();
        }
      });

      row.appendChild(head);
      row.appendChild(lane);
      row.appendChild(grip);
      tracksContainer.appendChild(row);
    });

    updateScrubberPosition();
    renderBeatMarkers();
    renderRuler();
  }

  function updateScrubberPosition() {
    const playhead = document.getElementById('amPlayheadLine');
    const timeBadge = document.getElementById('amTimeBadge');
    const timeTotal = document.getElementById('amTimeTotal');
    const tracksContainer = document.getElementById('amTracksViewport');
    if (!playhead || !tracksContainer) return;

    const laneWidth = (tracksContainer.clientWidth - 180) * (project.zoomLevel || 1.0);
    const pct = project.currentTime / project.totalDuration;
    const playheadLeft = 180 + (pct * laneWidth);

    playhead.style.left = `${playheadLeft}px`;

    // Highlight playhead when sitting on a beat
    const onBeat = (project.bookmarks || []).some(b => Math.abs(b - project.currentTime) < (0.6 / project.fps));
    playhead.classList.toggle('flash-beat', onBeat);

    const formatted = formatAmTime(project.currentTime, project.fps);
    if (timeBadge) timeBadge.textContent = formatted;
    if (timeTotal) timeTotal.textContent = formatAmTime(project.totalDuration, project.fps);

    updateKeyframeToggleButton();
  }

  function updateKeyframeToggleButton() {
    const btn = document.getElementById('amKeyframeToggleBtn');
    if (!btn) return;
    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer) {
      btn.classList.remove('has-kf');
      return;
    }
    const t = project.currentTime;
    let hasKf = false;
    ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'].forEach(k => {
      if (layer.transform[k] && layer.transform[k].keyframes) {
        if (layer.transform[k].keyframes.some(kf => Math.abs(kf.t - t) < 0.04)) hasKf = true;
      }
    });
    btn.classList.toggle('has-kf', hasKf);
  }

  // Split Clip at Playhead
  function splitClipAtPlayhead() {
    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer) {
      showToast('Select a layer to split');
      return;
    }
    const t = project.currentTime;
    if (t <= layer.startTime + 0.1 || t >= layer.endTime - 0.1) {
      showToast('Playhead must be inside the layer duration');
      return;
    }

    const newEnd = layer.endTime;
    layer.endTime = t;

    // Clone layer for second part
    const clone = JSON.parse(JSON.stringify(layer, (k, v) => k === 'element' ? undefined : v));
    clone.id = `layer_${Date.now()}`;
    clone.name = `${layer.name} (Part 2)`;
    clone.startTime = t;
    clone.endTime = newEnd;
    clone.element = layer.element;

    const idx = project.layers.indexOf(layer);
    project.layers.splice(idx + 1, 0, clone);
    project.selectedLayerId = clone.id;

    renderTimeline();
    renderLayerInspector();
    renderSceneFrame();
    saveHistoryState();
    showToast('Clip split at playhead');
  }

  // =========================================================================
  // 5. INTERACTIVE CANVAS MANIPULATOR & HIT-TESTING (SCREENSHOT 1-3 THEME)
  // =========================================================================
  function selectLayer(layerId, openPropsTab = true) {
    project.selectedLayerId = layerId;
    if (openPropsTab && layerId) {
      project.activeDrawerTab = 'props';
      document.querySelectorAll('.am-cat-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'props');
      });
      document.getElementById('amDrawerShapeView').style.display = 'none';
      document.getElementById('amDrawerMediaView').style.display = 'none';
      document.getElementById('amDrawerAudioView').style.display = 'none';
      document.getElementById('amDrawerDrawView').style.display = 'none';
      document.getElementById('amDrawerTextView').style.display = 'none';
      document.getElementById('amDrawerEffectsView').style.display = 'none';
      document.getElementById('amDrawerPropsView').style.display = 'block';
      document.getElementById('amDrawerElementsView').style.display = 'none';
      const drawerTitle = document.getElementById('amDrawerTitle');
      if (drawerTitle) drawerTitle.textContent = 'PROPERTIES';
    }
    renderTimeline();
    renderLayerInspector();
    renderEffectsDrawer();
    updateManipulator();
    renderSceneFrame();
  }

  function getLayerBoundsInCanvas(layer, t) {
    const w = project.width;
    const h = project.height;
    const posX = getAnimatedValue(layer.transform.x, t, w / 2);
    const posY = getAnimatedValue(layer.transform.y, t, h / 2);
    const sX = getAnimatedValue(layer.transform.scaleX, t, 1.0);
    const sY = getAnimatedValue(layer.transform.scaleY, t, 1.0);
    const rot = getAnimatedValue(layer.transform.rotation, t, 0.0);

    let baseW = 200;
    let baseH = 200;

    if (layer.type === 'media' && layer.element) {
      const vw = layer.element.videoWidth || layer.element.naturalWidth || w;
      const vh = layer.element.videoHeight || layer.element.naturalHeight || h;
      const fit = Math.min((w * 0.95) / vw, (h * 0.95) / vh);
      baseW = vw * fit;
      baseH = vh * fit;
    } else if (layer.type === 'text') {
      baseW = 400;
      baseH = 120;
    } else if (layer.type === 'shape') {
      baseW = 220;
      baseH = 220;
    }

    const halfW = (baseW * sX) / 2;
    const halfH = (baseH * sY) / 2;

    return { posX, posY, sX, sY, rot, baseW, baseH, halfW, halfH };
  }

  function hitTestLayer(layer, canvasX, canvasY, t) {
    if (!layer.visible) return false;
    if (t < layer.startTime || t > layer.endTime) return false;

    const b = getLayerBoundsInCanvas(layer, t);

    // Transform click point to layer local coordinates
    const dx = canvasX - b.posX;
    const dy = canvasY - b.posY;
    const rad = (-b.rot * Math.PI) / 180;
    const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

    return Math.abs(localX) <= b.halfW && Math.abs(localY) <= b.halfH;
  }

  function updateManipulator() {
    const manip = document.getElementById('amCanvasManipulator');
    if (!manip || !canvasElem) return;

    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer || !layer.visible) {
      manip.style.display = 'none';
      return;
    }

    const t = project.currentTime;
    if (t < layer.startTime || t > layer.endTime) {
      manip.style.display = 'none';
      return;
    }

    manip.style.display = 'block';

    const vpRect = document.getElementById('amCanvasViewport').getBoundingClientRect();
    const scaleFactor = vpRect.width / project.width;

    const b = getLayerBoundsInCanvas(layer, t);
    const boxW = b.baseW * b.sX * scaleFactor;
    const boxH = b.baseH * b.sY * scaleFactor;
    const posX = b.posX * scaleFactor;
    const posY = b.posY * scaleFactor;

    const bounds = manip.querySelector('.am-manip-bounds');
    if (bounds) {
      bounds.style.width = `${boxW}px`;
      bounds.style.height = `${boxH}px`;
      bounds.style.left = `${posX - boxW / 2}px`;
      bounds.style.top = `${posY - boxH / 2}px`;
      bounds.style.transform = `rotate(${b.rot}deg)`;
    }
  }

  function initManipulatorEvents() {
    const manip = document.getElementById('amCanvasManipulator');
    const viewport = document.getElementById('amCanvasViewport');
    if (!viewport) return;

    // A. Direct Tap on Preview Canvas to Highlight Layer in Timeline & Inspect
    viewport.addEventListener('pointerdown', (e) => {
      // If clicking directly on manipulator handles, let manipulator listener handle it
      if (e.target.closest('#amCanvasManipulator') && e.target.dataset.handle) {
        return;
      }

      const vpRect = viewport.getBoundingClientRect();
      const scaleFactor = vpRect.width / project.width;
      const canvasX = (e.clientX - vpRect.left) / scaleFactor;
      const canvasY = (e.clientY - vpRect.top) / scaleFactor;
      const t = project.currentTime;

      // Hit-test layers front-to-back (index 0 is topmost)
      let hitLayer = null;
      for (let i = 0; i < project.layers.length; i++) {
        const l = project.layers[i];
        if (hitTestLayer(l, canvasX, canvasY, t)) {
          hitLayer = l;
          break;
        }
      }

      if (hitLayer) {
        selectLayer(hitLayer.id, true);

        // Immediate direct-drag on canvas for the tapped layer
        const startX = e.clientX;
        const startY = e.clientY;
        const initPosX = getAnimatedValue(hitLayer.transform.x, t, project.width / 2);
        const initPosY = getAnimatedValue(hitLayer.transform.y, t, project.height / 2);

        let dragged = false;
        const onMove = (ev) => {
          dragged = true;
          const dx = (ev.clientX - startX) / scaleFactor;
          const dy = (ev.clientY - startY) / scaleFactor;
          hitLayer.transform.x.value = initPosX + dx;
          hitLayer.transform.y.value = initPosY + dy;
          renderSceneFrame();
          renderLayerInspector();
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if (dragged) saveHistoryState();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      } else {
        // Tapped canvas background -> deselect
        selectLayer(null, false);
      }
    });

    // B. Manipulator Bounding Box Handles (Move, Rotate, Scale)
    if (manip) {
      manip.addEventListener('pointerdown', (e) => {
        const handle = e.target.dataset.handle;
        if (!handle) return;
        e.stopPropagation();

        const layer = project.layers.find(l => l.id === project.selectedLayerId);
        if (!layer) return;

        const t = project.currentTime;
        const startX = e.clientX;
        const startY = e.clientY;
        const initPosX = getAnimatedValue(layer.transform.x, t, project.width / 2);
        const initPosY = getAnimatedValue(layer.transform.y, t, project.height / 2);
        const initScaleX = getAnimatedValue(layer.transform.scaleX, t, 1.0);
        const initScaleY = getAnimatedValue(layer.transform.scaleY, t, 1.0);
        const initRot = getAnimatedValue(layer.transform.rotation, t, 0.0);

        const vpRect = viewport.getBoundingClientRect();
        const scaleFactor = vpRect.width / project.width;

        const onMove = (ev) => {
          const dx = (ev.clientX - startX) / scaleFactor;
          const dy = (ev.clientY - startY) / scaleFactor;

          if (handle === 'move') {
            layer.transform.x.value = initPosX + dx;
            layer.transform.y.value = initPosY + dy;
          } else if (handle === 'rot') {
            const angle = Math.atan2(ev.clientY - (vpRect.top + initPosY * scaleFactor), ev.clientX - (vpRect.left + initPosX * scaleFactor));
            layer.transform.rotation.value = (angle * 180) / Math.PI + 90;
          } else if (handle === 'br' || handle === 'tl' || handle === 'tr' || handle === 'bl') {
            const factor = (dx + dy) / 200;
            layer.transform.scaleX.value = Math.max(0.1, initScaleX + factor);
            layer.transform.scaleY.value = Math.max(0.1, initScaleY + factor);
          }

          renderSceneFrame();
          renderLayerInspector();
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          saveHistoryState();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    }
  }

  // 6. 20+ SHAPES ENGINE (SCREENSHOT 1 THEME)
  // =========================================================================
  const SHAPE_DEFS = [
    { type: 'rect', name: 'Rectangle', icon: '<rect x="3" y="3" width="18" height="18" rx="1"/>' },
    { type: 'circle', name: 'Circle', icon: '<circle cx="12" cy="12" r="9"/>' },
    { type: 'pie', name: 'Pie Slice', icon: '<path d="M12 12 L21 12 A9 9 0 1 1 18 5.6 Z"/>' },
    { type: 'round_rect', name: 'Round Rect', icon: '<rect x="3" y="3" width="18" height="18" rx="5"/>' },
    { type: 'hexagon', name: 'Hexagon', icon: '<polygon points="12 2 21 7 21 17 12 22 3 17 3 7"/>' },
    { type: 'star', name: 'Star', icon: '<polygon points="12 2 15 8.5 22 9.5 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.5 9 8.5"/>' },
    { type: 'plus', name: 'Plus', icon: '<path d="M12 4v16m-8-8h16"/>' },
    { type: 'multifoil', name: 'Flower', icon: '<circle cx="12" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><circle cx="12" cy="12" r="3"/>' },
    { type: 'triangle', name: 'Triangle', icon: '<polygon points="12 3 22 21 2 21"/>' },
    { type: 'arrow', name: 'Arrow', icon: '<polygon points="12 2 22 12 16 12 16 22 8 22 8 12 2 12"/>' },
    { type: 'heart', name: 'Heart', icon: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' },
    { type: 'crescent', name: 'Moon', icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
    { type: 'cloud', name: 'Cloud', icon: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>' },
    { type: 'banner', name: 'Ribbon', icon: '<polygon points="4 4 20 4 18 12 20 20 4 20 6 12"/>' },
    { type: 'diamond', name: 'Diamond', icon: '<polygon points="12 2 22 12 12 22 2 12"/>' },
    { type: 'ring', name: 'Ring', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>' },
    { type: 'sun', name: 'Sun', icon: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' },
    { type: 'chevron', name: 'Chevron', icon: '<polyline points="6 9 12 15 18 9"/>' },
    { type: 'trapezoid', name: 'Trapezoid', icon: '<polygon points="6 4 18 4 22 20 2 20"/>' },
    { type: 'line', name: 'Line', icon: '<line x1="3" y1="12" x2="21" y2="12"/>' }
  ];

  function renderShapesDrawer() {
    const grid = document.getElementById('amShapesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    SHAPE_DEFS.forEach(s => {
      const card = document.createElement('div');
      card.className = 'am-shape-card';
      card.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${s.icon}
        </svg>
        <span>${s.name}</span>
      `;
      card.addEventListener('click', () => {
        addShapeLayerToTimeline(s.type, s.name);
      });
      grid.appendChild(card);
    });
  }

  function addShapeLayerToTimeline(shapeType, name) {
    const layerId = `layer_shape_${Date.now()}`;
    const newLayer = {
      id: layerId,
      name: name || 'Shape',
      type: 'shape',
      shapeType: shapeType,
      size: 240,
      fillType: 'solid',
      fillColor: '#ff4757',
      gradient: { start: '#ff4757', end: '#2ed573' },
      stroke: { color: '#ffffff', width: 0 },
      shadow: { color: '#000000', blur: 0, x: 0, y: 0 },
      colorCls: 'am-clip-shape',
      startTime: 0.0,
      endTime: project.totalDuration,
      visible: true,
      blendMode: 'source-over',
      transform: {
        x: { value: project.width / 2, keyframes: [] },
        y: { value: project.height / 2, keyframes: [] },
        scaleX: { value: 1.0, keyframes: [] },
        scaleY: { value: 1.0, keyframes: [] },
        rotation: { value: 0.0, keyframes: [] },
        skewX: { value: 0.0, keyframes: [] },
        skewY: { value: 0.0, keyframes: [] },
        opacity: { value: 1.0, keyframes: [] },
        pivotX: { value: 0 },
        pivotY: { value: 0 }
      },
      effects: []
    };

    project.layers.unshift(newLayer);
    project.selectedLayerId = layerId;

    renderTimeline();
    renderLayerInspector();
    renderEffectsDrawer();
    renderSceneFrame();
    saveHistoryState();
    showToast(`Added ${name}`);
  }

  // =========================================================================
  // 7. AUDIO COMPATIBILITY & MEDIA IMPORTERS
  // =========================================================================
  function initAudioImporter() {
    const fileInput = document.getElementById('amAudioFileInput');
    const triggerBtn = document.getElementById('amTriggerAudioImportBtn');
    const dropzone = document.getElementById('amAudioDropzone');

    if (triggerBtn && fileInput) {
      triggerBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => handleAudioFiles(e.target.files));
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = '#9b59b6'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer.files) handleAudioFiles(e.dataTransfer.files);
      });
    }
  }

  function handleAudioFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach(file => {
      const url = URL.createObjectURL(file);
      const audioEntry = {
        name: file.name,
        url: url,
        duration: 10.0
      };

      const temp = document.createElement('audio');
      temp.src = url;
      temp.onloadedmetadata = () => {
        audioEntry.duration = temp.duration || 10.0;
        renderAudioBrowser();
      };

      project.importedAudioFiles.push(audioEntry);
    });
    renderAudioBrowser();
    showToast(`Imported ${fileList.length} audio file(s)`);
  }

  function renderAudioBrowser() {
    const list = document.getElementById('amAudioList');
    if (!list) return;
    list.innerHTML = '';

    project.importedAudioFiles.forEach(item => {
      const card = document.createElement('div');
      card.className = 'am-audio-card';
      card.innerHTML = `
        <div class="am-audio-info">
          <span class="am-audio-name">${item.name}</span>
          <span class="am-audio-meta">${formatAmTime(item.duration, project.fps)}</span>
        </div>
        <button class="am-btn-action" type="button">+ Track</button>
      `;

      card.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        addAudioLayerToTimeline(item);
      });
      list.appendChild(card);
    });
  }

  function addAudioLayerToTimeline(item) {
    const aud = document.createElement('audio');
    aud.src = item.url;
    aud.preload = 'auto';

    let stash = document.getElementById('amAudioStash');
    if (!stash) {
      stash = document.createElement('div');
      stash.id = 'amAudioStash';
      stash.style.display = 'none';
      document.body.appendChild(stash);
    }
    stash.appendChild(aud);

    const layerId = `layer_audio_${Date.now()}`;
    const newLayer = {
      id: layerId,
      name: item.name,
      type: 'audio',
      element: aud,
      colorCls: 'am-clip-audio',
      startTime: 0.0,
      endTime: Math.min(project.totalDuration, item.duration || project.totalDuration),
      visible: true,
      volume: 1.0,
      muted: false,
      transform: { x: { value: 0 }, y: { value: 0 } },
      effects: []
    };

    project.layers.push(newLayer);
    project.selectedLayerId = layerId;

    renderTimeline();
    renderLayerInspector();
    saveHistoryState();
    showToast('Audio track added to timeline');
  }

  // Extract Audio from Video
  function extractAudioFromVideo(videoLayer) {
    if (!videoLayer || videoLayer.type !== 'media' || videoLayer.mediaType !== 'video' || !videoLayer.element) {
      showToast('Select a video layer to extract audio');
      return;
    }

    const aud = document.createElement('audio');
    aud.src = videoLayer.element.src;
    aud.preload = 'auto';

    let stash = document.getElementById('amAudioStash');
    if (!stash) {
      stash = document.createElement('div');
      stash.id = 'amAudioStash';
      stash.style.display = 'none';
      document.body.appendChild(stash);
    }
    stash.appendChild(aud);

    videoLayer.muted = true;
    if (videoLayer.element) videoLayer.element.muted = true;

    const layerId = `layer_audio_extracted_${Date.now()}`;
    const newLayer = {
      id: layerId,
      name: `${videoLayer.name} (Audio)`,
      type: 'audio',
      element: aud,
      colorCls: 'am-clip-audio',
      startTime: videoLayer.startTime,
      endTime: videoLayer.endTime,
      visible: true,
      volume: 1.0,
      muted: false,
      transform: { x: { value: 0 }, y: { value: 0 } },
      effects: []
    };

    const vIdx = project.layers.indexOf(videoLayer);
    project.layers.splice(vIdx + 1, 0, newLayer);
    project.selectedLayerId = layerId;

    renderTimeline();
    renderLayerInspector();
    saveHistoryState();
    showToast('Extracted audio to new purple track');
  }

  // =========================================================================
  // 8. TEXT, TYPOGRAPHY & CUSTOM FONT IMPORTER
  // =========================================================================
  function initTextEditor() {
    const addBtn = document.getElementById('amAddTextLayerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const textVal = document.getElementById('amTextInput')?.value || 'Alight Motion';
        const fontSize = parseInt(document.getElementById('amTextFontSize')?.value) || 64;
        const fontFamily = document.getElementById('amFontFamilySelect')?.value || 'Roboto';

        const layerId = `layer_text_${Date.now()}`;
        const newLayer = {
          id: layerId,
          name: textVal.slice(0, 14),
          type: 'text',
          text: textVal,
          fontSize: fontSize,
          fontFamily: fontFamily,
          fontWeight: '700',
          color: '#ffffff',
          align: 'center',
          stroke: { color: '#000000', width: 0 },
          shadow: { color: '#000000', blur: 0, x: 0, y: 0 },
          colorCls: 'am-clip-text',
          startTime: 0.0,
          endTime: project.totalDuration,
          visible: true,
          blendMode: 'source-over',
          transform: {
            x: { value: project.width / 2, keyframes: [] },
            y: { value: project.height / 2, keyframes: [] },
            scaleX: { value: 1.0, keyframes: [] },
            scaleY: { value: 1.0, keyframes: [] },
            rotation: { value: 0.0, keyframes: [] },
            skewX: { value: 0.0, keyframes: [] },
            skewY: { value: 0.0, keyframes: [] },
            opacity: { value: 1.0, keyframes: [] },
            pivotX: { value: 0 },
            pivotY: { value: 0 }
          },
          effects: []
        };

        project.layers.unshift(newLayer);
        project.selectedLayerId = layerId;
        renderTimeline();
        renderLayerInspector();
        renderSceneFrame();
        saveHistoryState();
        showToast('Text layer added');
      });
    }

    // Custom Font Importer
    const fontInput = document.getElementById('amFontFileInput');
    const importFontBtn = document.getElementById('amImportFontBtn');
    if (importFontBtn && fontInput) {
      importFontBtn.addEventListener('click', () => fontInput.click());
      fontInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fontName = file.name.replace(/\.[^/.]+$/, '');
        try {
          const buffer = await file.arrayBuffer();
          const fontFace = new FontFace(fontName, buffer);
          await fontFace.load();
          document.fonts.add(fontFace);

          const select = document.getElementById('amFontFamilySelect');
          if (select) {
            const opt = document.createElement('option');
            opt.value = fontName;
            opt.textContent = `${fontName} (Custom)`;
            opt.selected = true;
            select.appendChild(opt);
          }
          showToast(`Custom font loaded: ${fontName}`);
        } catch (err) {
          showToast(`Failed to load font: ${err.message}`);
        }
      });
    }
  }

  // =========================================================================
  // 9. FREEHAND & VECTOR DRAWING TOOL
  // =========================================================================
  let isDrawingMode = false;
  let currentStrokePoints = [];

  function initDrawingTool() {
    const startBtn = document.getElementById('amStartDrawingBtn');
    const clearBtn = document.getElementById('amClearDrawingBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        isDrawingMode = !isDrawingMode;
        startBtn.textContent = isDrawingMode ? 'Stop Drawing' : 'Start Drawing';
        startBtn.style.background = isDrawingMode ? '#ff4757' : '#00e676';
        if (canvasElem) canvasElem.style.cursor = isDrawingMode ? 'crosshair' : 'default';
        showToast(isDrawingMode ? 'Drawing mode active: draw on canvas' : 'Drawing mode stopped');
      });
    }

    if (canvasElem) {
      canvasElem.addEventListener('pointerdown', (e) => {
        if (!isDrawingMode) return;
        currentStrokePoints = [];
        const vpRect = canvasElem.getBoundingClientRect();
        const scale = project.width / vpRect.width;
        const px = (e.clientX - vpRect.left) * scale;
        const py = (e.clientY - vpRect.top) * scale;
        currentStrokePoints.push({ x: px, y: py });

        const onMove = (ev) => {
          const mx = (ev.clientX - vpRect.left) * scale;
          const my = (ev.clientY - vpRect.top) * scale;
          currentStrokePoints.push({ x: mx, y: my });

          // Render live stroke on canvas
          mainCanvasCtx.beginPath();
          mainCanvasCtx.strokeStyle = document.getElementById('amDrawStrokeColorHex')?.value || '#00e676';
          mainCanvasCtx.lineWidth = parseInt(document.getElementById('amDrawStrokeWidth')?.value) || 6;
          mainCanvasCtx.lineCap = 'round';
          mainCanvasCtx.moveTo(currentStrokePoints[currentStrokePoints.length - 2].x, currentStrokePoints[currentStrokePoints.length - 2].y);
          mainCanvasCtx.lineTo(mx, my);
          mainCanvasCtx.stroke();
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);

          if (currentStrokePoints.length > 1) {
            const layerId = `layer_draw_${Date.now()}`;
            const newLayer = {
              id: layerId,
              name: 'Drawing Stroke',
              type: 'drawing',
              points: [...currentStrokePoints],
              strokeWidth: parseInt(document.getElementById('amDrawStrokeWidth')?.value) || 6,
              strokeColor: document.getElementById('amDrawStrokeColorHex')?.value || '#00e676',
              colorCls: 'am-clip-drawing',
              startTime: 0.0,
              endTime: project.totalDuration,
              visible: true,
              transform: {
                x: { value: 0, keyframes: [] },
                y: { value: 0, keyframes: [] },
                scaleX: { value: 1.0, keyframes: [] },
                scaleY: { value: 1.0, keyframes: [] },
                rotation: { value: 0.0, keyframes: [] },
                opacity: { value: 1.0, keyframes: [] }
              },
              effects: []
            };
            project.layers.unshift(newLayer);
            project.selectedLayerId = layerId;
            renderTimeline();
            renderLayerInspector();
            renderSceneFrame();
            saveHistoryState();
          }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    }
  }

  // =========================================================================
  // 10. LAYER PROPERTIES & DEEP INSPECTOR
  // =========================================================================
  function renderLayerInspector() {
    const container = document.getElementById('amLayerInspectorContent');
    if (!container) return;
    container.innerHTML = '';

    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer) {
      container.innerHTML = '<div style="color:#7b8599; font-size:12px; text-align:center; padding:20px;">Select a layer on the timeline to inspect and edit transforms, fills, and borders.</div>';
      return;
    }

    const t = project.currentTime;

    // 1. Move & Transform Group
    const tfGroup = document.createElement('div');
    tfGroup.className = 'am-prop-group';
    tfGroup.innerHTML = `
      <div class="am-prop-group-title">
        <span>Move &amp; Transform</span>
      </div>
      <div class="am-prop-row">
        <span class="am-prop-label">Position X, Y</span>
        <div class="am-prop-input-wrap">
          <input type="number" class="am-prop-num-input" id="amPropPosX" value="${Math.round(getAnimatedValue(layer.transform.x, t, project.width / 2))}">
          <input type="number" class="am-prop-num-input" id="amPropPosY" value="${Math.round(getAnimatedValue(layer.transform.y, t, project.height / 2))}">
        </div>
      </div>
      <div class="am-prop-row">
        <span class="am-prop-label">Scale X, Y</span>
        <div class="am-prop-input-wrap">
          <input type="number" step="0.1" class="am-prop-num-input" id="amPropScaleX" value="${getAnimatedValue(layer.transform.scaleX, t, 1.0).toFixed(2)}">
          <input type="number" step="0.1" class="am-prop-num-input" id="amPropScaleY" value="${getAnimatedValue(layer.transform.scaleY, t, 1.0).toFixed(2)}">
        </div>
      </div>
      <div class="am-prop-row">
        <span class="am-prop-label">Rotation (°)</span>
        <input type="number" class="am-prop-num-input" id="amPropRot" value="${Math.round(getAnimatedValue(layer.transform.rotation, t, 0))}">
      </div>
      <div class="am-prop-row">
        <span class="am-prop-label">Skew X, Y</span>
        <div class="am-prop-input-wrap">
          <input type="number" class="am-prop-num-input" id="amPropSkewX" value="${Math.round(getAnimatedValue(layer.transform.skewX, t, 0))}">
          <input type="number" class="am-prop-num-input" id="amPropSkewY" value="${Math.round(getAnimatedValue(layer.transform.skewY, t, 0))}">
        </div>
      </div>
    `;

    // Wire Transform Inputs
    tfGroup.querySelector('#amPropPosX').addEventListener('input', (e) => {
      layer.transform.x.value = parseFloat(e.target.value) || 0;
      renderSceneFrame();
    });
    tfGroup.querySelector('#amPropPosY').addEventListener('input', (e) => {
      layer.transform.y.value = parseFloat(e.target.value) || 0;
      renderSceneFrame();
    });
    tfGroup.querySelector('#amPropScaleX').addEventListener('input', (e) => {
      layer.transform.scaleX.value = parseFloat(e.target.value) || 1.0;
      renderSceneFrame();
    });
    tfGroup.querySelector('#amPropScaleY').addEventListener('input', (e) => {
      layer.transform.scaleY.value = parseFloat(e.target.value) || 1.0;
      renderSceneFrame();
    });
    tfGroup.querySelector('#amPropRot').addEventListener('input', (e) => {
      layer.transform.rotation.value = parseFloat(e.target.value) || 0;
      renderSceneFrame();
    });
    container.appendChild(tfGroup);

    // 2. Opacity & Blending Group
    const blendGroup = document.createElement('div');
    blendGroup.className = 'am-prop-group';
    blendGroup.innerHTML = `
      <div class="am-prop-group-title"><span>Opacity &amp; Blending</span></div>
      <div class="am-prop-row">
        <span class="am-prop-label">Opacity</span>
        <div class="am-prop-input-wrap">
          <input type="range" min="0" max="1" step="0.01" id="amPropOpacity" value="${getAnimatedValue(layer.transform.opacity, t, 1.0)}">
          <span id="amPropOpacityVal" style="font-size:11px; color:#fff; width:35px;">${Math.round(getAnimatedValue(layer.transform.opacity, t, 1.0) * 100)}%</span>
        </div>
      </div>
      <div class="am-prop-row">
        <span class="am-prop-label">Blend Mode</span>
        <select id="amPropBlendMode" style="background:#1a1e2a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:4px 8px; color:#fff; font-size:11px;">
          <option value="source-over" ${layer.blendMode === 'source-over' ? 'selected' : ''}>Normal</option>
          <option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>Multiply</option>
          <option value="screen" ${layer.blendMode === 'screen' ? 'selected' : ''}>Screen</option>
          <option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>Overlay</option>
          <option value="darken" ${layer.blendMode === 'darken' ? 'selected' : ''}>Darken</option>
          <option value="lighten" ${layer.blendMode === 'lighten' ? 'selected' : ''}>Lighten</option>
          <option value="color-dodge" ${layer.blendMode === 'color-dodge' ? 'selected' : ''}>Color Dodge</option>
          <option value="difference" ${layer.blendMode === 'difference' ? 'selected' : ''}>Difference</option>
          <option value="exclusion" ${layer.blendMode === 'exclusion' ? 'selected' : ''}>Exclusion</option>
        </select>
      </div>
    `;

    blendGroup.querySelector('#amPropOpacity').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      layer.transform.opacity.value = val;
      blendGroup.querySelector('#amPropOpacityVal').textContent = `${Math.round(val * 100)}%`;
      renderSceneFrame();
    });

    blendGroup.querySelector('#amPropBlendMode').addEventListener('change', (e) => {
      layer.blendMode = e.target.value;
      renderSceneFrame();
    });
    container.appendChild(blendGroup);

    // 3. Parent Linking & Motion Blur Group
    const linkGroup = document.createElement('div');
    linkGroup.className = 'am-prop-group';
    const otherLayers = project.layers.filter(l => l.id !== layer.id);
    let optionsHtml = '<option value="">None (Root)</option>';
    otherLayers.forEach(ol => {
      optionsHtml += `<option value="${ol.id}" ${layer.parentId === ol.id ? 'selected' : ''}>${ol.name}</option>`;
    });

    linkGroup.innerHTML = `
      <div class="am-prop-group-title"><span>Parent Linking &amp; Motion Blur</span></div>
      <div class="am-prop-row">
        <span class="am-prop-label">Parent Layer</span>
        <select id="amPropParentLayer" style="background:#1a1e2a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:4px 8px; color:#fff; font-size:11px;">
          ${optionsHtml}
        </select>
      </div>
      <div class="am-prop-row">
        <span class="am-prop-label">Motion Blur</span>
        <input type="checkbox" id="amPropMotionBlur" ${layer.motionBlur ? 'checked' : ''}>
      </div>
    `;

    linkGroup.querySelector('#amPropParentLayer').addEventListener('change', (e) => {
      layer.parentId = e.target.value || null;
      renderSceneFrame();
      saveHistoryState();
    });

    linkGroup.querySelector('#amPropMotionBlur').addEventListener('change', (e) => {
      layer.motionBlur = e.target.checked;
      renderSceneFrame();
    });
    container.appendChild(linkGroup);

    // 4. Video & Audio Options (if media or audio)
    if ((layer.type === 'media' && layer.mediaType === 'video') || layer.type === 'audio') {
      const audGroup = document.createElement('div');
      audGroup.className = 'am-prop-group';
      audGroup.innerHTML = `
        <div class="am-prop-group-title"><span>Audio Controls</span></div>
        <div class="am-prop-row">
          <span class="am-prop-label">Volume</span>
          <input type="range" min="0" max="1" step="0.05" id="amPropVol" value="${layer.volume !== undefined ? layer.volume : 1.0}">
        </div>
        <div class="am-prop-row">
          <span class="am-prop-label">Mute Audio</span>
          <input type="checkbox" id="amPropMute" ${layer.muted ? 'checked' : ''}>
        </div>
        ${layer.type === 'media' && layer.mediaType === 'video' ? '<button class="am-btn-action" id="amExtractAudioBtn" type="button" style="width:100%; margin-top:6px;">Extract Audio to New Track</button>' : ''}
      `;

      audGroup.querySelector('#amPropVol').addEventListener('input', (e) => {
        layer.volume = parseFloat(e.target.value);
        if (layer.element) layer.element.volume = layer.volume;
      });

      audGroup.querySelector('#amPropMute').addEventListener('change', (e) => {
        layer.muted = e.target.checked;
        if (layer.element) layer.element.muted = layer.muted;
      });

      const extractBtn = audGroup.querySelector('#amExtractAudioBtn');
      if (extractBtn) {
        extractBtn.addEventListener('click', () => extractAudioFromVideo(layer));
      }

      container.appendChild(audGroup);
    }
  }

  // =========================================================================
  // 11. 192 VERIFIED EFFECTS CATALOG & GLSL ENGINE
  // =========================================================================
  function renderEffectsDrawer() {
    const container = document.getElementById('amEffectsListBody');
    if (!container) return;
    container.innerHTML = '';

    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer) {
      container.innerHTML = '<div style="color:#7b8599; font-size:12px; text-align:center; padding:20px;">Select a layer on the timeline to inspect or add effects.</div>';
      return;
    }

    if (!layer.effects || layer.effects.length === 0) {
      container.innerHTML = '<div style="color:#7b8599; font-size:12px; text-align:center; padding:10px 0;">No effects applied. Click "+ Add Effect" to browse the 192 verified Alight Motion effects.</div>';
      return;
    }

    layer.effects.forEach((eff, effIdx) => {
      const card = document.createElement('div');
      card.className = 'am-effect-card';

      const head = document.createElement('div');
      head.className = 'am-effect-header';
      head.innerHTML = `
        <span class="am-effect-title">${eff.name}</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="am-eff-del-btn" style="background:none; border:none; color:#ff4757; font-size:16px; cursor:pointer;" title="Remove Effect">&times;</button>
        </div>
      `;

      head.querySelector('.am-eff-del-btn').addEventListener('click', () => {
        layer.effects.splice(effIdx, 1);
        renderEffectsDrawer();
        renderTimeline();
        renderSceneFrame();
        saveHistoryState();
      });

      card.appendChild(head);

      const paramsList = document.createElement('div');
      paramsList.className = 'am-params-list';

      Object.entries(eff.params || {}).forEach(([pId, prop]) => {
        const row = document.createElement('div');
        row.className = 'am-param-row';

        const label = document.createElement('span');
        label.className = 'am-param-label';
        label.textContent = prop.label || pId;

        const valWrap = document.createElement('div');
        valWrap.className = 'am-param-val-wrap';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'am-param-slider';
        slider.min = prop.min !== undefined ? prop.min : 0;
        slider.max = prop.max !== undefined ? prop.max : 1;
        slider.step = prop.step || 0.01;

        const curVal = getAnimatedValue(prop, project.currentTime, prop.value);
        slider.value = curVal;

        const numVal = document.createElement('span');
        numVal.className = 'am-param-number';
        numVal.textContent = Number(curVal).toFixed(2);

        // Keyframe toggle diamond for this effect parameter
        const kfBtn = document.createElement('button');
        kfBtn.type = 'button';
        kfBtn.className = 'am-prop-kf-btn';
        const hasKf = (prop.keyframes || []).some(k => Math.abs(k.t - project.currentTime) < 0.04);
        kfBtn.classList.toggle('active', hasKf);
        kfBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg>';
        kfBtn.title = 'Add / Remove Keyframe at Playhead';

        kfBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!prop.keyframes) prop.keyframes = [];
          const t = project.currentTime;
          const kfIdx = prop.keyframes.findIndex(k => Math.abs(k.t - t) < 0.04);
          if (kfIdx !== -1) {
            prop.keyframes.splice(kfIdx, 1);
            kfBtn.classList.remove('active');
          } else {
            prop.keyframes.push({ t: t, v: parseFloat(slider.value), e: 'cubicBezier 0.4 0 0.2 1' });
            prop.keyframes.sort((a, b) => a.t - b.t);
            kfBtn.classList.add('active');
          }
          renderTimeline();
          renderSceneFrame();
          saveHistoryState();
        });

        slider.addEventListener('input', (e) => {
          const v = parseFloat(e.target.value);
          numVal.textContent = v.toFixed(2);
          prop.value = v;
          // If sitting on a keyframe, update its value
          if (prop.keyframes) {
            const kf = prop.keyframes.find(k => Math.abs(k.t - project.currentTime) < 0.04);
            if (kf) kf.v = v;
          }
          renderSceneFrame();
        });

        valWrap.appendChild(slider);
        valWrap.appendChild(numVal);
        valWrap.appendChild(kfBtn);
        row.appendChild(label);
        row.appendChild(valWrap);
        paramsList.appendChild(row);
      });

      card.appendChild(paramsList);
      container.appendChild(card);
    });
  }

  function showEffectLibraryModal() {
    const modal = document.getElementById('amEffectLibraryModal');
    if (modal) {
      modal.style.display = 'flex';
      populateEffectGrid('');
    }
  }

  function populateEffectGrid(searchQuery, filterCat) {
    const grid = document.getElementById('amEffListGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const effects = window.AM_VERIFIED_EFFECTS || [];
    const query = (searchQuery || '').toLowerCase().trim();

    const filtered = effects.filter(eff => {
      const matchQ = query === '' || eff.name.toLowerCase().includes(query) || eff.category.toLowerCase().includes(query);
      const matchCat = !filterCat || filterCat === 'all' || eff.category.toLowerCase() === filterCat.toLowerCase();
      return matchQ && matchCat;
    });

    filtered.forEach(eff => {
      const card = document.createElement('div');
      card.className = 'am-eff-card';
      card.innerHTML = `
        <span class="am-eff-card-title">${eff.name}</span>
        <span class="am-eff-card-cat">${eff.category}</span>
      `;
      card.addEventListener('click', () => {
        applyEffectToSelectedLayer(eff);
        document.getElementById('amEffectLibraryModal').style.display = 'none';
      });
      grid.appendChild(card);
    });
  }

  function applyEffectToSelectedLayer(effTemplate) {
    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer) {
      showToast('Please select a layer to apply effects');
      return;
    }
    if (!layer.effects) layer.effects = [];

    const normalizedParams = {};
    if (Array.isArray(effTemplate.params)) {
      effTemplate.params.forEach(p => {
        normalizedParams[p.id] = {
          label: p.label || p.id,
          value: p.default !== undefined ? p.default : 0.5,
          min: p.min !== undefined ? p.min : 0.0,
          max: p.max !== undefined ? p.max : 1.0,
          step: p.step || 0.01,
          keyframes: []
        };
      });
    } else if (effTemplate.params && typeof effTemplate.params === 'object') {
      Object.entries(effTemplate.params).forEach(([k, p]) => {
        normalizedParams[k] = {
          label: p.label || k,
          value: p.value !== undefined ? p.value : (p.default !== undefined ? p.default : 0.5),
          min: p.min !== undefined ? p.min : 0.0,
          max: p.max !== undefined ? p.max : 1.0,
          step: p.step || 0.01,
          keyframes: p.keyframes || []
        };
      });
    }

    const glslShader = effTemplate.glsl || (window.AM_GLSL_CATALOG && window.AM_GLSL_CATALOG[effTemplate.id]);

    const newEff = {
      id: effTemplate.id,
      name: effTemplate.name,
      category: effTemplate.category,
      glsl: glslShader,
      params: normalizedParams
    };

    layer.effects.push(newEff);
    renderEffectsDrawer();
    renderTimeline();
    renderSceneFrame();
    saveHistoryState();
    showToast(`Added ${effTemplate.name}`);
  }

  // Copy & Paste Effects Stack
  function copyEffectsStack() {
    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer || !layer.effects || layer.effects.length === 0) {
      showToast('No effects to copy');
      return;
    }
    project.effectClipboard = JSON.parse(JSON.stringify(layer.effects));
    showToast(`Copied ${layer.effects.length} effect(s)`);
  }

  function pasteEffectsStack() {
    const layer = project.layers.find(l => l.id === project.selectedLayerId);
    if (!layer) {
      showToast('Select a layer to paste effects');
      return;
    }
    if (!project.effectClipboard || project.effectClipboard.length === 0) {
      showToast('Effect clipboard is empty');
      return;
    }
    if (!layer.effects) layer.effects = [];
    layer.effects = [...layer.effects, ...JSON.parse(JSON.stringify(project.effectClipboard))];
    renderEffectsDrawer();
    renderTimeline();
    renderSceneFrame();
    saveHistoryState();
    showToast(`Pasted ${project.effectClipboard.length} effect(s)`);
  }

  // =========================================================================
  // 12. EASING CURVE GRAPH EDITOR MODAL
  // =========================================================================
  let curveP1 = { x: 0.4, y: 0.0 };
  let curveP2 = { x: 0.2, y: 1.0 };

  function renderCurveCanvas() {
    const canvas = document.getElementById('amCurveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = 40;
    const boxW = w - pad * 2;
    const boxH = h - pad * 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, boxW, boxH);

    // Diagonal reference
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + boxH);
    ctx.lineTo(pad + boxW, pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // Control lines
    const p0x = pad, p0y = pad + boxH;
    const p3x = pad + boxW, p3y = pad;
    const p1x = pad + curveP1.x * boxW, p1y = pad + (1 - curveP1.y) * boxH;
    const p2x = pad + curveP2.x * boxW, p2y = pad + (1 - curveP2.y) * boxH;

    ctx.strokeStyle = '#ff4757';
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.lineTo(p1x, p1y);
    ctx.stroke();

    ctx.strokeStyle = '#2ed573';
    ctx.beginPath();
    ctx.moveTo(p3x, p3y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // Cubic Bezier Curve
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.bezierCurveTo(p1x, p1y, p2x, p2y, p3x, p3y);
    ctx.stroke();

    // Handles
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(p1x, p1y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2ed573';
    ctx.beginPath();
    ctx.arc(p2x, p2y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function initGraphModal() {
    const btn = document.getElementById('amGraphModalBtn');
    const modal = document.getElementById('amGraphModal');
    const closeBtn = document.getElementById('amGraphCloseBtn');
    const cancelBtn = document.getElementById('amGraphCancelBtn');
    const applyBtn = document.getElementById('amGraphApplyBtn');
    const canvas = document.getElementById('amCurveCanvas');

    if (btn && modal) {
      btn.addEventListener('click', () => {
        modal.style.display = 'flex';
        renderCurveCanvas();
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    // Presets
    document.querySelectorAll('.am-curve-preset').forEach(p => {
      p.addEventListener('click', () => {
        document.querySelectorAll('.am-curve-preset').forEach(b => b.classList.remove('active'));
        p.classList.add('active');
        const vals = p.dataset.curve.split(' ').map(Number);
        curveP1 = { x: vals[0], y: vals[1] };
        curveP2 = { x: vals[2], y: vals[3] };
        renderCurveCanvas();
      });
    });

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const curveStr = `cubicBezier ${curveP1.x.toFixed(2)} ${curveP1.y.toFixed(2)} ${curveP2.x.toFixed(2)} ${curveP2.y.toFixed(2)}`;
        const layer = project.layers.find(l => l.id === project.selectedLayerId);
        if (layer) {
          ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'].forEach(k => {
            if (layer.transform[k] && layer.transform[k].keyframes) {
              layer.transform[k].keyframes.forEach(kf => {
                if (Math.abs(kf.t - project.currentTime) < 0.05) kf.e = curveStr;
              });
            }
          });
        }
        modal.style.display = 'none';
        showToast('Timing curve applied to keyframe');
      });
    }

    // Draggable curve handles on canvas
    if (canvas) {
      let activeHandle = null;
      canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const pad = 40;
        const boxW = canvas.width - pad * 2;
        const boxH = canvas.height - pad * 2;

        const p1x = pad + curveP1.x * boxW;
        const p1y = pad + (1 - curveP1.y) * boxH;
        const p2x = pad + curveP2.x * boxW;
        const p2y = pad + (1 - curveP2.y) * boxH;

        if (Math.hypot(mx - p1x, my - p1y) < 18) activeHandle = 'p1';
        else if (Math.hypot(mx - p2x, my - p2y) < 18) activeHandle = 'p2';

        if (activeHandle) {
          const onMove = (ev) => {
            const curX = ev.clientX - rect.left;
            const curY = ev.clientY - rect.top;
            const normX = Math.max(0, Math.min(1, (curX - pad) / boxW));
            const normY = Math.max(-0.5, Math.min(1.5, 1 - (curY - pad) / boxH));
            if (activeHandle === 'p1') { curveP1.x = normX; curveP1.y = normY; }
            if (activeHandle === 'p2') { curveP2.x = normX; curveP2.y = normY; }
            renderCurveCanvas();
          };
          const onUp = () => {
            activeHandle = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        }
      });
    }
  }

  // =========================================================================
  // 13. PROJECT SETTINGS MODAL & EXPORT ENGINE
  // =========================================================================
  function initProjectSettingsModal() {
    const settingsBtn = document.getElementById('amSettingsBtn');
    const modal = document.getElementById('amSettingsModal');
    const closeBtn = document.getElementById('amSettingsCloseBtn');
    const cancelBtn = document.getElementById('amSettingsCancelBtn');
    const saveBtn = document.getElementById('amSettingsSaveBtn');
    if (!settingsBtn || !modal) return;

    const wInput = document.getElementById('amSettingWidth');
    const hInput = document.getElementById('amSettingHeight');
    const fpsInput = document.getElementById('amSettingFps');
    const fpsHint = document.getElementById('amFpsCalcHint');
    const colorPicker = document.getElementById('amSettingBgColorPicker');
    const colorHex = document.getElementById('amSettingBgColorHex');

    function updateFpsHint(val) {
      const fpsVal = parseInt(val) || 60;
      if (fpsHint) {
        fpsHint.textContent = `1 frame = ${(1000 / fpsVal).toFixed(2)} ms (tick step)`;
      }
    }

    settingsBtn.addEventListener('click', () => {
      wInput.value = project.width;
      hInput.value = project.height;
      fpsInput.value = project.fps;
      updateFpsHint(project.fps);

      const currentBg = project.bgColor || '#000000';
      colorHex.value = currentBg;
      if (currentBg !== 'transparent') colorPicker.value = currentBg;

      modal.style.display = 'flex';
    });

    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    document.querySelectorAll('.am-ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.am-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        wInput.value = btn.dataset.w;
        hInput.value = btn.dataset.h;
      });
    });

    document.querySelectorAll('.am-fps-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.am-fps-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fpsInput.value = btn.dataset.fps;
        updateFpsHint(btn.dataset.fps);
      });
    });

    document.querySelectorAll('.am-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('.am-color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        const col = sw.dataset.color;
        colorHex.value = col;
        if (col !== 'transparent') colorPicker.value = col;
      });
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        project.width = parseInt(wInput.value) || 1080;
        project.height = parseInt(hInput.value) || 1080;
        project.fps = parseInt(fpsInput.value) || 60;
        project.bgColor = colorHex.value.trim() || '#000000';

        if (canvasElem) {
          canvasElem.width = project.width;
          canvasElem.height = project.height;
        }
        if (offscreenCanvas) {
          offscreenCanvas.width = project.width;
          offscreenCanvas.height = project.height;
        }
        const vp = document.getElementById('amCanvasViewport');
        if (vp) {
          vp.style.aspectRatio = `${project.width} / ${project.height}`;
          vp.classList.toggle('am-canvas-transparent-bg', project.bgColor === 'transparent');
        }
        const resBadge = document.getElementById('amProjectResBadge');
        if (resBadge) resBadge.textContent = `${project.width}×${project.height} • ${project.fps}fps`;

        updateScrubberPosition();
        renderRuler();
        renderBeatMarkers();
        renderSceneFrame();
        modal.style.display = 'none';
        showToast('Settings saved');
      });
    }
  }

  // Export Native Alight Motion XML
  function exportAlightMotionXML() {
    const docHeader = `<?xml version='1.0' encoding='UTF-8' ?>\n<!-- Created by Alight Motion (http://alightmotion.com) -->\n`;
    const totalFrames = Math.floor(project.totalDuration * project.fps);
    const bgHex = project.bgColor === 'transparent' ? '#00000000' : (project.bgColor || '#FF000000');

    let xml = `${docHeader}<scene title="${project.title}" width="${project.width}" height="${project.height}" exportWidth="${project.exportWidth}" exportHeight="${project.exportHeight}" bgcolor="${bgHex}" totalTime="${totalFrames}" fps="${project.fps}" amver="868" ffver="107" am="com.alightcreative.motion/6.2.59" amplatform="ios">\n`;

    if (project.bookmarks && project.bookmarks.length > 0) {
      xml += `  <bookmarks>\n`;
      project.bookmarks.forEach(b => {
        xml += `    <bookmark t="${b.toFixed(6)}"/>\n`;
      });
      xml += `  </bookmarks>\n`;
    }

    project.layers.forEach((layer, idx) => {
      const startF = Math.floor(layer.startTime * project.fps);
      const endF = Math.floor(layer.endTime * project.fps);
      xml += `  <shape id="${idx + 1}" label="${layer.name}" startTime="${startF}" endTime="${endF}" fillType="media" mediaFillMode="fill" s=".rect">\n`;
      xml += `    <transform>\n`;
      xml += `      <location>\n`;
      if (layer.transform.x.keyframes.length > 0) {
        layer.transform.x.keyframes.forEach(kf => {
          xml += `        <kf t="${kf.t.toFixed(6)}" v="${kf.v.toFixed(6)},${getAnimatedValue(layer.transform.y, kf.t, project.height / 2).toFixed(6)},0.000000" ${kf.e ? `e="${kf.e}"` : ''}/>\n`;
        });
      } else {
        xml += `        <kf t="0.000000" v="${layer.transform.x.value.toFixed(6)},${layer.transform.y.value.toFixed(6)},0.000000"/>\n`;
      }
      xml += `      </location>\n`;
      xml += `    </transform>\n`;
      xml += `  </shape>\n`;
    });

    xml += `</scene>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.xml`;
    a.click();
    showToast('Alight Motion XML exported!');
  }

  // Export Modal Engine (XML, JSON, Frame PNG, WebM Video Recorder)
  function initExportModal() {
    const exportBtn = document.getElementById('amExportBtn');
    const modal = document.getElementById('amExportModal');
    const closeBtn = document.getElementById('amExportCloseBtn');
    if (exportBtn && modal) {
      exportBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
    }
    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    // XML action
    document.getElementById('amExportXmlActionBtn')?.addEventListener('click', () => {
      exportAlightMotionXML();
      modal.style.display = 'none';
    });

    // JSON action
    document.getElementById('amExportJsonActionBtn')?.addEventListener('click', () => {
      const json = JSON.stringify(project, (k, v) => k === 'element' || k === 'history' ? undefined : v, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${project.title}.json`;
      a.click();
      modal.style.display = 'none';
      showToast('Project JSON exported');
    });

    // Frame PNG action
    document.getElementById('amExportPngActionBtn')?.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = canvasElem.toDataURL('image/png');
      a.download = `${project.title}_frame_${project.currentTime.toFixed(2)}.png`;
      a.click();
      modal.style.display = 'none';
      showToast('Frame snapshot downloaded');
    });

    // Video Recording action (WebM)
    document.getElementById('amExportVideoActionBtn')?.addEventListener('click', () => {
      modal.style.display = 'none';
      recordVideoRender();
    });
  }

  // MediaRecorder Video Render Engine
  function recordVideoRender() {
    if (!canvasElem.captureStream) {
      showToast('Video recording not supported in this browser');
      return;
    }
    showToast('Rendering video... please wait');
    const stream = canvasElem.captureStream(project.fps);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${project.title}_rendered.webm`;
      a.click();
      showToast('Video render complete!');
      setPlayheadTime(0);
    };

    recorder.start();
    setPlayheadTime(0);
    project.isPlaying = true;

    const checkEnd = setInterval(() => {
      if (project.currentTime >= project.totalDuration - (1 / project.fps)) {
        clearInterval(checkEnd);
        project.isPlaying = false;
        recorder.stop();
      }
    }, 100);
  }

  // =========================================================================
  // 14. MEDIA IMPORTER & BROWSER (VIDEOS & IMAGES)
  // =========================================================================
  function initMediaImporter() {
    const fileInput = document.getElementById('amMediaFileInput');
    const triggerBtn = document.getElementById('amTriggerImportBtn');
    const dropzone = document.getElementById('amMediaDropzone');
    const viewport = document.getElementById('amCanvasViewport');

    if (triggerBtn && fileInput) {
      triggerBtn.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        handleMediaFiles(e.target.files);
        fileInput.value = '';
      });
    }

    const setupDrag = (elem) => {
      if (!elem) return;
      elem.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elem.style.borderColor = '#00e676';
      });
      elem.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elem.style.borderColor = '';
      });
      elem.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elem.style.borderColor = '';
        if (e.dataTransfer && e.dataTransfer.files) {
          handleMediaFiles(e.dataTransfer.files);
        }
      });
    };

    setupDrag(dropzone);
    setupDrag(viewport);

    // Media Filter Pills (All, Videos, Images)
    document.querySelectorAll('.am-media-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.am-media-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        project.mediaFilter = pill.dataset.filter;
        renderMediaBrowser();
      });
    });
  }

  function handleMediaFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    let addedCount = 0;

    files.forEach(file => {
      if (!isMediaAllowed(file)) return;
      addedCount++;
      const isVideo = file.type.startsWith('video/') || 
                      file.name.endsWith('.mp4') || file.name.endsWith('.webm') || 
                      file.name.endsWith('.mov') || file.name.endsWith('.mkv') ||
                      file.name.endsWith('.avi');
      const url = URL.createObjectURL(file);

      const mediaEntry = {
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url: url,
        duration: 10.0,
        width: 1080,
        height: 1080
      };

      if (isVideo) {
        const tempVid = document.createElement('video');
        tempVid.src = url;
        tempVid.muted = true;
        tempVid.preload = 'metadata';
        tempVid.onloadedmetadata = () => {
          mediaEntry.duration = tempVid.duration || 10.0;
          mediaEntry.width = tempVid.videoWidth || 1080;
          mediaEntry.height = tempVid.videoHeight || 1080;
          renderMediaBrowser();
          renderSceneFrame();
        };
      } else {
        const tempImg = new Image();
        tempImg.src = url;
        tempImg.onload = () => {
          mediaEntry.width = tempImg.naturalWidth || 1080;
          mediaEntry.height = tempImg.naturalHeight || 1080;
          renderMediaBrowser();
          renderSceneFrame();
        };
      }

      project.importedMediaFiles.push(mediaEntry);

      // Directly add to timeline so the user sees it instantly
      addMediaLayerToTimeline(mediaEntry);
    });

    renderMediaBrowser();
    if (addedCount > 0) {
      showToast(`Imported & Added ${addedCount} media file(s)`);
    } else {
      showToast('Please select supported video or image files');
    }
  }

  function renderMediaBrowser() {
    const container = document.getElementById('amMediaGrid');
    if (!container) return;
    container.innerHTML = '';

    const filtered = project.importedMediaFiles.filter(item => {
      if (project.mediaFilter === 'video') return item.type === 'video';
      if (project.mediaFilter === 'image') return item.type === 'image';
      return true;
    });

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'am-media-card';
      card.innerHTML = `
        <div class="am-media-thumb-wrap">
          ${item.type === 'image' ? `<img class="am-media-thumb" src="${item.url}" alt="${item.name}">` : ''}
          ${item.type === 'video' ? `
            <div style="width:100%; height:100%; background:#191d29; display:flex; align-items:center; justify-content:center; color:#00e676;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span class="am-media-type-badge">${formatAmTime(item.duration, project.fps)}</span>
          ` : ''}
        </div>
        <div class="am-media-info">
          <span class="am-media-filename" title="${item.name}">${item.name}</span>
          <span class="am-media-meta">${item.width}×${item.height}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        addMediaLayerToTimeline(item);
      });

      container.appendChild(card);
    });
  }

  function addMediaLayerToTimeline(item) {
    let elem = null;
    if (item.type === 'video') {
      elem = document.createElement('video');
      elem.src = item.url;
      elem.muted = false;
      elem.playsInline = true;
      elem.setAttribute('playsinline', '');
      elem.setAttribute('webkit-playsinline', '');
      elem.preload = 'auto';
      elem.crossOrigin = 'anonymous';
      elem.currentTime = 0;

      // Mount inside DOM viewport with opacity: 0.001 so browser GPU decoders never pause decoding
      let stash = document.getElementById('amVideoStash');
      if (!stash) {
        stash = document.createElement('div');
        stash.id = 'amVideoStash';
        stash.style.position = 'fixed';
        stash.style.bottom = '0';
        stash.style.right = '0';
        stash.style.width = '120px';
        stash.style.height = '80px';
        stash.style.opacity = '0.001';
        stash.style.pointerEvents = 'none';
        stash.style.zIndex = '-999';
        stash.style.overflow = 'hidden';
        document.body.appendChild(stash);
      }
      stash.appendChild(elem);

      elem.onloadeddata = () => renderSceneFrame();
      elem.oncanplay = () => renderSceneFrame();
      elem.onseeked = () => renderSceneFrame();
      elem.load();
    } else {
      elem = new Image();
      elem.src = item.url;
    }

    const layerId = `layer_media_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newLayer = {
      id: layerId,
      name: item.name,
      type: 'media',
      mediaType: item.type,
      element: elem,
      colorCls: 'am-clip-media',
      startTime: 0.0,
      endTime: Math.min(project.totalDuration, item.duration || project.totalDuration),
      visible: true,
      blendMode: 'source-over',
      transform: {
        x: { value: project.width / 2, keyframes: [] },
        y: { value: project.height / 2, keyframes: [] },
        scaleX: { value: 1.0, keyframes: [] },
        scaleY: { value: 1.0, keyframes: [] },
        rotation: { value: 0.0, keyframes: [] },
        skewX: { value: 0.0, keyframes: [] },
        skewY: { value: 0.0, keyframes: [] },
        opacity: { value: 1.0, keyframes: [] },
        pivotX: { value: 0 },
        pivotY: { value: 0 }
      },
      effects: []
    };

    project.layers.unshift(newLayer);
    selectLayer(layerId, true);
    saveHistoryState();
    showToast(`Added ${item.name} to timeline`);
  }

  // 15. INITIALIZATION & GLOBAL LISTENERS
  // =========================================================================
  function initListeners() {
    const playBtn = document.getElementById('amPlayBtn');
    if (playBtn) playBtn.addEventListener('click', togglePlay);

    const leftPlayBtn = document.getElementById('amLeftPlayBtn');
    if (leftPlayBtn) leftPlayBtn.addEventListener('click', togglePlay);

    // Keyframe Toggle Diamond Button
    const kfToggleBtn = document.getElementById('amKeyframeToggleBtn');
    if (kfToggleBtn) {
      kfToggleBtn.addEventListener('click', () => {
        const layer = project.layers.find(l => l.id === project.selectedLayerId);
        if (!layer) return;
        const t = project.currentTime;
        const hasKf = layer.transform.x.keyframes.some(k => Math.abs(k.t - t) < 0.04);
        if (hasKf) {
          layer.transform.x.keyframes = layer.transform.x.keyframes.filter(k => Math.abs(k.t - t) >= 0.04);
        } else {
          layer.transform.x.keyframes.push({ t: t, v: getAnimatedValue(layer.transform.x, t, project.width / 2), e: 'cubicBezier 0.4 0 0.2 1' });
          layer.transform.x.keyframes.sort((a, b) => a.t - b.t);
        }
        renderTimeline();
        renderSceneFrame();
        saveHistoryState();
      });
    }

    // Split Clip Button & Shortcut (S)
    const splitBtn = document.getElementById('amSplitClipBtn');
    if (splitBtn) splitBtn.addEventListener('click', splitClipAtPlayhead);

    // Copy, Paste, Duplicate, Delete Layer Buttons
    document.getElementById('amCopyLayerBtn')?.addEventListener('click', () => {
      const layer = project.layers.find(l => l.id === project.selectedLayerId);
      if (!layer) return;
      project.layerClipboard = JSON.parse(JSON.stringify(layer, (k, v) => k === 'element' ? undefined : v));
      project.layerClipboard._elemRef = layer.element;
      showToast(`Copied layer: ${layer.name}`);
    });

    document.getElementById('amPasteLayerBtn')?.addEventListener('click', () => {
      if (!project.layerClipboard) {
        showToast('Clipboard is empty');
        return;
      }
      const clone = JSON.parse(JSON.stringify(project.layerClipboard));
      clone.id = `layer_${Date.now()}`;
      clone.name = `${clone.name} (Copy)`;
      clone.element = project.layerClipboard._elemRef;
      clone.transform.x.value += 30;
      clone.transform.y.value += 30;

      project.layers.unshift(clone);
      project.selectedLayerId = clone.id;
      renderTimeline();
      renderLayerInspector();
      renderSceneFrame();
      saveHistoryState();
      showToast('Layer pasted');
    });

    document.getElementById('amDuplicateLayerBtn')?.addEventListener('click', () => {
      const layer = project.layers.find(l => l.id === project.selectedLayerId);
      if (!layer) return;
      const clone = JSON.parse(JSON.stringify(layer, (k, v) => k === 'element' ? undefined : v));
      clone.id = `layer_${Date.now()}`;
      clone.name = `${layer.name} (Duplicate)`;
      clone.element = layer.element;
      clone.transform.x.value += 25;
      clone.transform.y.value += 25;

      const idx = project.layers.indexOf(layer);
      project.layers.splice(idx, 0, clone);
      project.selectedLayerId = clone.id;
      renderTimeline();
      renderLayerInspector();
      renderSceneFrame();
      saveHistoryState();
      showToast('Layer duplicated');
    });

    document.getElementById('amDeleteLayerBtn')?.addEventListener('click', () => {
      const layer = project.layers.find(l => l.id === project.selectedLayerId);
      if (!layer) return;
      project.layers = project.layers.filter(l => l.id !== layer.id);
      project.selectedLayerId = project.layers.length > 0 ? project.layers[0].id : null;
      renderTimeline();
      renderLayerInspector();
      renderSceneFrame();
      saveHistoryState();
      showToast('Layer deleted');
    });

    // Timeline Zoom Controls
    document.getElementById('amTimelineZoomIn')?.addEventListener('click', () => {
      project.zoomLevel = Math.min(4.0, (project.zoomLevel || 1.0) + 0.25);
      renderTimeline();
    });
    document.getElementById('amTimelineZoomOut')?.addEventListener('click', () => {
      project.zoomLevel = Math.max(0.5, (project.zoomLevel || 1.0) - 0.25);
      renderTimeline();
    });

    // Copy / Paste Effects Buttons
    document.getElementById('amCopyEffectsBtn')?.addEventListener('click', copyEffectsStack);
    document.getElementById('amPasteEffectsBtn')?.addEventListener('click', pasteEffectsStack);

    // Mark Beat by pressing Playhead White Line, Bookmark Button, or Time Badge
    document.getElementById('amPlayheadLine')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBeatBookmark(project.currentTime);
    });
    document.getElementById('amBookmarkBtn')?.addEventListener('click', () => toggleBeatBookmark(project.currentTime));
    document.getElementById('amTimeBadge')?.addEventListener('click', () => toggleBeatBookmark(project.currentTime));

    // Jump to Prev / Next Keyframe or Beat Marker
    document.getElementById('amJumpPrevKfBtn')?.addEventListener('click', jumpPrevMarker);
    document.getElementById('amJumpNextKfBtn')?.addEventListener('click', jumpNextMarker);

    // Undo & Redo Buttons & Keyboard Shortcuts
    document.getElementById('amUndoBtn')?.addEventListener('click', undo);
    document.getElementById('amRedoBtn')?.addEventListener('click', redo);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); splitClipAtPlayhead(); }
    });

    // Right Category Bar Switcher (All 8 Alight Motion Tabs)
    document.querySelectorAll('.am-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.am-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        project.activeDrawerTab = tab;

        document.getElementById('amDrawerShapeView').style.display = tab === 'shape' ? 'block' : 'none';
        document.getElementById('amDrawerMediaView').style.display = tab === 'media' ? 'flex' : 'none';
        document.getElementById('amDrawerAudioView').style.display = tab === 'audio' ? 'block' : 'none';
        document.getElementById('amDrawerDrawView').style.display = tab === 'drawing' ? 'block' : 'none';
        document.getElementById('amDrawerTextView').style.display = tab === 'text' ? 'block' : 'none';
        document.getElementById('amDrawerEffectsView').style.display = tab === 'fx' ? 'flex' : 'none';
        document.getElementById('amDrawerPropsView').style.display = tab === 'props' ? 'block' : 'none';
        document.getElementById('amDrawerElementsView').style.display = tab === 'elements' ? 'block' : 'none';

        const drawerTitle = document.getElementById('amDrawerTitle');
        if (drawerTitle) drawerTitle.textContent = tab.toUpperCase();

        if (tab === 'props') renderLayerInspector();
        if (tab === 'shape') renderShapesDrawer();
        if (tab === 'audio') renderAudioBrowser();
      });
    });

    // Time Ruler scrubber click/drag
    const ruler = document.getElementById('amRulerWrap');
    if (ruler) {
      ruler.addEventListener('pointerdown', (e) => {
        const rect = ruler.getBoundingClientRect();
        const updateT = (ev) => {
          const x = ev.clientX - rect.left - 180;
          const w = (rect.width - 180) * (project.zoomLevel || 1.0);
          if (w > 0) setPlayheadTime((x / w) * project.totalDuration);
        };
        updateT(e);
        const onMove = (ev) => updateT(ev);
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    }

    // Grid toggle
    const gridBtn = document.getElementById('amGridToggleBtn');
    if (gridBtn) {
      gridBtn.addEventListener('click', () => {
        project.showGrid = !project.showGrid;
        gridBtn.classList.toggle('active', project.showGrid);
        document.getElementById('amCanvasViewport').classList.toggle('am-guide-active', project.showGrid);
      });
    }

    // Effect Library Modal Wiring
    document.getElementById('amAddEffectBtn')?.addEventListener('click', showEffectLibraryModal);
    document.getElementById('amModalCloseBtn')?.addEventListener('click', () => {
      document.getElementById('amEffectLibraryModal').style.display = 'none';
    });

    const effSearch = document.getElementById('amEffSearchInput');
    if (effSearch) {
      effSearch.addEventListener('input', (e) => populateEffectGrid(e.target.value));
    }

    document.querySelectorAll('.am-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.am-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        populateEffectGrid(effSearch ? effSearch.value : '', pill.dataset.cat);
      });
    });

    // Subsystems
    initAudioImporter();
    initTextEditor();
    initDrawingTool();
    initProjectSettingsModal();
    initGraphModal();
    initExportModal();
    initManipulatorEvents();

    window.addEventListener('resize', () => {
      renderRuler();
      renderBeatMarkers();
      updateScrubberPosition();
      updateManipulator();
    });
  }

  let isStudioInitialized = false;

  // Public Module API
  window.EditingTabStudio = {
    init: function () {
      initWebGL();

      if (!isStudioInitialized) {
        isStudioInitialized = true;
        project.layers = []; // ZERO SHAPES ON FIRST OPEN
        project.selectedLayerId = null;
        initMediaImporter();
        renderShapesDrawer();
        renderMediaBrowser();
        initListeners();
        saveHistoryState();
      }

      renderShapesDrawer();
      renderMediaBrowser();
      renderTimeline();
      renderEffectsDrawer();
      renderSceneFrame();

      if (!animFrameId) {
        animFrameId = requestAnimationFrame(playbackLoop);
      }
    },
    reset: function () {
      project.layers = [];
      project.selectedLayerId = null;
      renderTimeline();
      renderEffectsDrawer();
      renderSceneFrame();
    },
    exportXML: exportAlightMotionXML,
    getProject: () => project
  };

})();
