/**
 * XML Preview GLSL — Alight Motion Native GLSL Shader Engine & 3D Keyframe Studio
 * Flippy v4 Workspace Extension
 * 
 * Provides:
 *  - 274 Alight Motion XML effects converted to standard WebGL GLSL
 *  - Interactive 3D Rectangle Transform (Move X/Y, Z-Axis Depth, 3D Euler Rotations, Scale)
 *  - Multi-pass Ping-Pong GLSL Shader Pipeline
 *  - Keyframe Animation Engine with Timeline Scrubber & Easing Curves
 *  - Dynamic Effect Parameter Generator with Keyframeable Uniforms
 *  - Alight Motion XML Export & Import
 */
(function(window, document) {
  'use strict';

  var AM_DB = window.AM_EFFECTS_DB || [];

  // Studio State
  var state = {
    layers: [
      {
        id: 'rect_1',
        name: 'Rectangle 1',
        color: '#e05336',
        fillType: 'solid', // 'solid' | 'grid' | 'checker'
        width: 600,
        height: 750,
        opacity: 1.0,
        transform: {
          x: 0,
          y: 0,
          z: 0,          // Z-depth (-2000 to +2000 px)
          rotZ: 0,       // 2D Rotation (degrees)
          rotX: 0,       // 3D Pitch / Tilt around X (degrees)
          rotY: 0,       // 3D Yaw / Spin around Y (degrees)
          scale: 1.0,    // Uniform scale multiplier
          scaleX: 1.0,
          scaleY: 1.0
        },
        keyframes: {
          x: [{ t: 0.0, val: -180, curve: 'hermite' }, { t: 1.0, val: 180, curve: 'hermite' }],
          y: [{ t: 0.0, val: 0, curve: 'linear' }],
          z: [{ t: 0.0, val: -400, curve: 'ease-in-out' }, { t: 1.0, val: 200, curve: 'ease-in-out' }],
          rotZ: [{ t: 0.0, val: 0, curve: 'hermite' }, { t: 1.0, val: 45, curve: 'hermite' }],
          rotX: [{ t: 0.0, val: 0, curve: 'hermite' }, { t: 1.0, val: 30, curve: 'hermite' }],
          rotY: [{ t: 0.0, val: 0, curve: 'hermite' }, { t: 1.0, val: 45, curve: 'hermite' }],
          scale: [{ t: 0.0, val: 1.0, curve: 'linear' }],
          scaleX: [{ t: 0.0, val: 1.0, curve: 'linear' }],
          scaleY: [{ t: 0.0, val: 1.0, curve: 'linear' }],
          opacity: [{ t: 0.0, val: 1.0, curve: 'linear' }]
        },
        effects: [
          {
            instanceId: 'eff_bend_1',
            id: 'com.alightcreative.effects.bendwarp',
            name: 'Bend',
            category: 'Distortion & Warp',
            enabled: true,
            params: {
              amount: 35.0,
              offset: 0.15,
              originType: 3,
              oppositeType: 0,
              highLimit: 0.85,
              lowLimit: 0.20
            },
            keyframes: {
              amount: [{ t: 0.0, val: 0.0, curve: 'ease-in-out' }, { t: 1.0, val: 65.0, curve: 'ease-in-out' }]
            }
          }
        ]
      }
    ],
    selectedLayerId: 'rect_1',
    currentTime: 0.0,
    duration: 2.0,
    fps: 60,
    isPlaying: false,
    cameraMode: 'front', // 'front' | 'orbit'
    cameraOrbit: { pitch: 18, yaw: -25, distance: 1350 },
    stageResolution: { width: 1080, height: 1350 },
    canvasBgColor: '#0a0a0e',
    showGizmo: true,
    activeEasing: 'hermite',
    selectedPropertyForTimeline: 'x',
    activeGizmoAction: null, // 'move' | 'rot' | 'scale'
    dragStart: { mouseX: 0, mouseY: 0, initX: 0, initY: 0, initRot: 0, initScale: 1 }
  };

  // WebGL Resources
  var glRes = {
    canvas: null,
    gl: null,
    baseProgram: null,
    screenBlitProgram: null,
    quadVbo: null,
    rectVbo: null,
    fboA: null,
    fboB: null,
    fboTexA: null,
    fboTexB: null,
    fboWidth: 1080,
    fboHeight: 1350,
    compiledEffects: {},
    animFrameId: null,
    lastFrameTime: 0,
    fpsCalc: { lastTime: performance.now(), frames: 0, fps: 60 }
  };

  // Matrix Utilities
  var M4 = {
    create: function() {
      return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    },
    identity: function(out) {
      out[0]=1; out[1]=0; out[2]=0; out[3]=0;
      out[4]=0; out[5]=1; out[6]=0; out[7]=0;
      out[8]=0; out[9]=0; out[10]=1; out[11]=0;
      out[12]=0; out[13]=0; out[14]=0; out[15]=1;
      return out;
    },
    multiply: function(out, a, b) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      var b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
      var b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
      var b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
      var b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

      out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
      out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
      out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
      out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

      out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
      out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
      out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
      out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;

      out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
      out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
      out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
      out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;

      out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
      out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
      out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
      out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
      return out;
    },
    perspective: function(out, fovy, aspect, near, far) {
      var f = 1.0 / Math.tan(fovy / 2);
      var nf = 1 / (near - far);
      out[0] = f / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = f;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = (far + near) * nf;
      out[11] = -1;
      out[12] = 0;
      out[13] = 0;
      out[14] = (2 * far * near) * nf;
      out[15] = 0;
      return out;
    },
    lookAt: function(out, eye, center, up) {
      var eyex = eye[0], eyey = eye[1], eyez = eye[2];
      var upx = up[0], upy = up[1], upz = up[2];
      var centerx = center[0], centery = center[1], centerz = center[2];

      var z0 = eyex - centerx, z1 = eyey - centery, z2 = eyez - centerz;
      var len = 1 / Math.hypot(z0, z1, z2);
      z0 *= len; z1 *= len; z2 *= len;

      var x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
      len = Math.hypot(x0, x1, x2);
      if (!len) {
        x0 = 0; x1 = 0; x2 = 0;
      } else {
        len = 1 / len;
        x0 *= len; x1 *= len; x2 *= len;
      }

      var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
      len = Math.hypot(y0, y1, y2);
      if (!len) {
        y0 = 0; y1 = 0; y2 = 0;
      } else {
        len = 1 / len;
        y0 *= len; y1 *= len; y2 *= len;
      }

      out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
      out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
      out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
      out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
      out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
      out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
      out[15] = 1;
      return out;
    },
    translate: function(out, a, v) {
      var x = v[0], y = v[1], z = v[2];
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      return out;
    },
    rotateX: function(out, a, rad) {
      var s = Math.sin(rad), c = Math.cos(rad);
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      out[4] = a10 * c + a20 * s;
      out[5] = a11 * c + a21 * s;
      out[6] = a12 * c + a22 * s;
      out[7] = a13 * c + a23 * s;
      out[8] = a20 * c - a10 * s;
      out[9] = a21 * c - a11 * s;
      out[10] = a22 * c - a12 * s;
      out[11] = a23 * c - a13 * s;
      return out;
    },
    rotateY: function(out, a, rad) {
      var s = Math.sin(rad), c = Math.cos(rad);
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      out[0] = a00 * c - a20 * s;
      out[1] = a01 * c - a21 * s;
      out[2] = a02 * c - a22 * s;
      out[3] = a03 * c - a23 * s;
      out[8] = a00 * s + a20 * c;
      out[9] = a01 * s + a21 * c;
      out[10] = a02 * s + a22 * c;
      out[11] = a03 * s + a23 * c;
      return out;
    },
    rotateZ: function(out, a, rad) {
      var s = Math.sin(rad), c = Math.cos(rad);
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      out[0] = a00 * c + a10 * s;
      out[1] = a01 * c + a11 * s;
      out[2] = a02 * c + a12 * s;
      out[3] = a03 * c + a13 * s;
      out[4] = a10 * c - a00 * s;
      out[5] = a11 * c - a01 * s;
      out[6] = a12 * c - a02 * s;
      out[7] = a13 * c - a03 * s;
      return out;
    },
    scale: function(out, a, v) {
      var x = v[0], y = v[1], z = v[2];
      out[0] = a[0] * x; out[1] = a[1] * x; out[2] = a[2] * x; out[3] = a[3] * x;
      out[4] = a[4] * y; out[5] = a[5] * y; out[6] = a[6] * y; out[7] = a[7] * y;
      out[8] = a[8] * z; out[9] = a[9] * z; out[10] = a[10] * z; out[11] = a[11] * z;
      return out;
    },
    invert: function(out, a) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      var b00 = a00 * a11 - a01 * a10;
      var b01 = a00 * a12 - a02 * a10;
      var b02 = a00 * a13 - a03 * a10;
      var b03 = a01 * a12 - a02 * a11;
      var b04 = a01 * a13 - a03 * a11;
      var b05 = a02 * a13 - a03 * a12;
      var b06 = a20 * a31 - a21 * a30;
      var b07 = a20 * a32 - a22 * a30;
      var b08 = a20 * a33 - a23 * a30;
      var b09 = a21 * a32 - a22 * a31;
      var b10 = a21 * a33 - a23 * a31;
      var b11 = a22 * a33 - a23 * a32;

      var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1.0 / det;

      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
  };

  // Easing Utilities
  function solveCubicBezier(t, p1x, p1y, p2x, p2y) {
    var cx = 3.0 * p1x;
    var bx = 3.0 * (p2x - p1x) - cx;
    var ax = 1.0 - cx - bx;
    var cy = 3.0 * p1y;
    var by = 3.0 * (p2y - p1y) - cy;
    var ay = 1.0 - cy - by;

    function sampleCurveX(s) { return ((ax * s + bx) * s + cx) * s; }
    function sampleCurveY(s) { return ((ay * s + by) * s + cy) * s; }
    var s = t;
    for (var i = 0; i < 6; i++) {
      var x = sampleCurveX(s) - t;
      if (Math.abs(x) < 1e-4) return sampleCurveY(s);
      var dx = (3.0 * ax * s + 2.0 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6) break;
      s -= x / dx;
    }
    return sampleCurveY(Math.max(0, Math.min(1, s)));
  }

  function applyEasing(u, curve) {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    switch (curve) {
      case 'linear': return u;
      case 'ease-in': return u * u;
      case 'ease-out': return u * (2 - u);
      case 'ease-in-out': return u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u;
      case 'hermite':
      default:
        return solveCubicBezier(u, 0.4, 0.0, 0.2, 1.0);
    }
  }

  // Keyframe Interpolator
  function interpolateTrack(keyframes, time, fallbackVal) {
    if (!keyframes || keyframes.length === 0) return fallbackVal;
    if (keyframes.length === 1) return keyframes[0].val;

    var sorted = keyframes.slice().sort(function(a, b) { return a.t - b.t; });
    if (time <= sorted[0].t) return sorted[0].val;
    if (time >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].val;

    for (var i = 0; i < sorted.length - 1; i++) {
      var k0 = sorted[i];
      var k1 = sorted[i + 1];
      if (time >= k0.t && time <= k1.t) {
        var span = k1.t - k0.t;
        if (span <= 1e-5) return k0.val;
        var u = (time - k0.t) / span;
        var eased = applyEasing(u, k0.curve || 'hermite');

        if (typeof k0.val === 'number' && typeof k1.val === 'number') {
          return k0.val + (k1.val - k0.val) * eased;
        } else if (typeof k0.val === 'boolean') {
          return u < 0.5 ? k0.val : k1.val;
        } else {
          return u < 0.5 ? k0.val : k1.val;
        }
      }
    }
    return fallbackVal;
  }

  function getActiveLayer() {
    for (var i = 0; i < state.layers.length; i++) {
      if (state.layers[i].id === state.selectedLayerId) return state.layers[i];
    }
    return state.layers[0] || null;
  }

  function evaluateLayerAtTime(layer, time) {
    var t = layer.transform;
    var kfs = layer.keyframes || {};

    return {
      x: interpolateTrack(kfs.x, time, t.x),
      y: interpolateTrack(kfs.y, time, t.y),
      z: interpolateTrack(kfs.z, time, t.z),
      rotZ: interpolateTrack(kfs.rotZ, time, t.rotZ),
      rotX: interpolateTrack(kfs.rotX, time, t.rotX),
      rotY: interpolateTrack(kfs.rotY, time, t.rotY),
      scale: interpolateTrack(kfs.scale, time, t.scale),
      scaleX: interpolateTrack(kfs.scaleX, time, t.scaleX),
      scaleY: interpolateTrack(kfs.scaleY, time, t.scaleY),
      opacity: interpolateTrack(kfs.opacity, time, layer.opacity !== undefined ? layer.opacity : 1.0)
    };
  }

  function evaluateEffectParamsAtTime(eff, time) {
    var out = {};
    var rawParams = eff.params || {};
    var kfs = eff.keyframes || {};

    for (var pId in rawParams) {
      if (Object.prototype.hasOwnProperty.call(rawParams, pId)) {
        var baseVal = rawParams[pId];
        if (kfs[pId] && kfs[pId].length > 0) {
          out[pId] = interpolateTrack(kfs[pId], time, baseVal);
        } else {
          out[pId] = baseVal;
        }
      }
    }
    return out;
  }

  // WebGL Shader Compilation & Linking
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var err = gl.getShaderInfoLog(shader);
      console.warn('[XML GLSL] Shader compilation error:', err, '\nSource:\n', source);
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    var vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    var fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[XML GLSL] Program link error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  // Base 3D Rectangle Shader Sources
  var BASE_VS = [
    'precision highp float;',
    'attribute vec3 a_position;',
    'attribute vec2 a_texCoord;',
    'uniform mat4 u_mvp;',
    'varying vec2 v_uv;',
    'varying vec2 v_localCoord;',
    'void main() {',
    '  v_uv = a_texCoord;',
    '  v_localCoord = a_position.xy;',
    '  gl_Position = u_mvp * vec4(a_position, 1.0);',
    '}'
  ].join('\n');

  var BASE_FS = [
    'precision highp float;',
    'uniform vec4 u_color;',
    'uniform int u_fillType;', // 0=solid, 1=grid, 2=checker
    'uniform float u_opacity;',
    'varying vec2 v_uv;',
    'varying vec2 v_localCoord;',
    'void main() {',
    '  vec4 col = u_color;',
    '  if (u_fillType == 1) {',
    '    vec2 g = abs(fract(v_uv * 10.0 - 0.5) - 0.5) / fwidth(v_uv * 10.0);',
    '    float line = min(g.x, g.y);',
    '    float gridPattern = 1.0 - min(line, 1.0);',
    '    col.rgb = mix(col.rgb * 0.7, vec3(1.0), gridPattern * 0.5);',
    '  } else if (u_fillType == 2) {',
    '    vec2 c = floor(v_uv * 8.0);',
    '    float check = mod(c.x + c.y, 2.0);',
    '    col.rgb = mix(col.rgb, col.rgb * 0.65, check);',
    '  }',
    '  // Crisp border stroke',
    '  vec2 edgeDist = abs(v_localCoord) * 2.0;',
    '  float border = max(edgeDist.x, edgeDist.y);',
    '  if (border > 0.97) {',
    '    col.rgb = mix(col.rgb, vec3(1.0, 1.0, 1.0), 0.8);',
    '  }',
    '  gl_FragColor = vec4(col.rgb, col.a * u_opacity);',
    '}'
  ].join('\n');

  // Full-Screen Quad Blit Shader Sources
  var QUAD_VS = [
    'precision highp float;',
    'attribute vec2 a_position;',
    'attribute vec2 a_texCoord;',
    'varying vec2 v_uv;',
    'varying vec2 acScreenNorm;',
    'varying vec2 acLayerNorm;',
    'void main() {',
    '  v_uv = a_texCoord;',
    '  acScreenNorm = a_texCoord;',
    '  acLayerNorm = a_texCoord;',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var SCREEN_BLIT_FS = [
    'precision highp float;',
    'uniform sampler2D u_texture;',
    'varying vec2 v_uv;',
    'void main() {',
    '  gl_FragColor = texture2D(u_texture, v_uv);',
    '}'
  ].join('\n');

  // Dynamic Effect Shader Generator
  function buildEffectFragmentShader(effectDef) {
    var paramDecls = '';
    var params = effectDef.params || [];
    for (var i = 0; i < params.length; i++) {
      var p = params[i];
      if (p.type === 'texture') {
        if (p.id !== 'inputImg' && p.id !== 'comp') {
          paramDecls += 'uniform sampler2D ' + p.id + ';\n';
        }
      } else if (p.type === 'float' || p.type === 'spinner' || p.type === 'slider' || p.type === 'hue-disc' || p.type === 'iterations') {
        paramDecls += 'uniform float ' + p.id + ';\n';
      } else if (p.type === 'color') {
        paramDecls += 'uniform vec4 ' + p.id + ';\n';
      } else if (p.type === 'point') {
        paramDecls += 'uniform vec2 ' + p.id + ';\n';
      } else if (p.type === 'switch') {
        paramDecls += 'uniform bool ' + p.id + ';\n';
      } else if (p.type === 'selector') {
        paramDecls += 'uniform int ' + p.id + ';\n';
      } else if (p.type === 'xyz') {
        paramDecls += 'uniform vec3 ' + p.id + ';\n';
      } else if (p.type === 'orient') {
        paramDecls += 'uniform mat4 ' + p.id + ';\n';
      }
    }

    var code = effectDef.shaderCode;

    var helpers = '';
    if (code.indexOf('texture2DCv') === -1) {
      helpers += 'vec4 texture2DCv(sampler2D tex, vec2 uv) { return texture2D(tex, clamp(uv, 0.0, 1.0)); }\n';
    }
    if (code.indexOf('getTexSize') === -1) {
      helpers += 'vec2 getTexSize(vec2 s) { return s; }\nvec2 getTexSize(sampler2D s) { return acScreenSize; }\n';
    }
    if (code.indexOf('l2s(') === -1 && code.indexOf('vec2 l2s') === -1) {
      helpers += 'vec2 l2s(vec2 v) { return (vec4(v, 0.0, 1.0) * acLayerToScreen).xy; }\n';
    }
    if (code.indexOf('s2l(') === -1 && code.indexOf('vec2 s2l') === -1) {
      helpers += 'vec2 s2l(vec2 v) { return (vec4(v, 0.0, 1.0) * acScreenToLayer).xy; }\n';
    }
    if (code.indexOf('M_PI') === -1) {
      helpers += '#define M_PI 3.14159265358979323846\n';
    }

    var header = [
      'precision highp float;',
      'precision highp int;',
      '// Alight Motion Builtin Uniforms',
      'uniform vec2 acScreenSize;',
      'uniform vec2 acLayerSize;',
      'uniform mat4 acLayerToScreen;',
      'uniform mat4 acScreenToLayer;',
      'uniform vec2 acLayerCenter;',
      'uniform vec2 acLayerCenterNorm;',
      'uniform vec2 acLayerPivot;',
      'uniform vec2 acPreviewSize;',
      'uniform vec2 acLayerSizeNorm;',
      'uniform float acTime;',
      'uniform int acPass;',
      'uniform bool acShowGuides;',
      'uniform mat4 acLTS;',
      '// Samplers',
      'uniform sampler2D inputImg;',
      'uniform sampler2D comp;',
      '// Varyings',
      'varying vec2 acScreenNorm;',
      'varying vec2 acLayerNorm;',
      'varying vec2 v_uv;',
      helpers,
      paramDecls
    ].join('\n');

    return header + '\n' + code;
  }

  // Initialize WebGL Context & Buffers
  function initGL(canvas) {
    if (!canvas) return false;
    var gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true, antialias: true }) ||
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, alpha: true, antialias: true });
    if (!gl) {
      console.warn('[XML GLSL] WebGL not supported on this browser.');
      return false;
    }

    glRes.canvas = canvas;
    glRes.gl = gl;

    // Full-screen Quad Buffer
    var quadVerts = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
      -1,  1,  0, 1,
       1, -1,  1, 0,
       1,  1,  1, 1
    ]);
    glRes.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glRes.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // Unit Rectangle Buffer (Centered at origin [-0.5, 0.5])
    var rectVerts = new Float32Array([
      -0.5, -0.5, 0.0,   0.0, 0.0,
       0.5, -0.5, 0.0,   1.0, 0.0,
      -0.5,  0.5, 0.0,   0.0, 1.0,
      -0.5,  0.5, 0.0,   0.0, 1.0,
       0.5, -0.5, 0.0,   1.0, 0.0,
       0.5,  0.5, 0.0,   1.0, 1.0
    ]);
    glRes.rectVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glRes.rectVbo);
    gl.bufferData(gl.ARRAY_BUFFER, rectVerts, gl.STATIC_DRAW);

    // Compile Base & Blit Programs
    glRes.baseProgram = createProgram(gl, BASE_VS, BASE_FS);
    glRes.screenBlitProgram = createProgram(gl, QUAD_VS, SCREEN_BLIT_FS);

    // Setup Ping-Pong Framebuffers
    createPingPongFBOs(gl, state.stageResolution.width, state.stageResolution.height);

    return true;
  }

  function createPingPongFBOs(gl, width, height) {
    if (glRes.fboA) gl.deleteFramebuffer(glRes.fboA);
    if (glRes.fboB) gl.deleteFramebuffer(glRes.fboB);
    if (glRes.fboTexA) gl.deleteTexture(glRes.fboTexA);
    if (glRes.fboTexB) gl.deleteTexture(glRes.fboTexB);

    glRes.fboWidth = width;
    glRes.fboHeight = height;

    function makeFboTex() {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      var fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      // Renderbuffer for depth
      var rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

      return { fbo: fbo, tex: tex };
    }

    var a = makeFboTex();
    var b = makeFboTex();
    glRes.fboA = a.fbo; glRes.fboTexA = a.tex;
    glRes.fboB = b.fbo; glRes.fboTexB = b.tex;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // Get or Compile Effect Program
  function getEffectProgram(gl, effectDef) {
    if (!effectDef) return null;
    if (glRes.compiledEffects[effectDef.id]) {
      return glRes.compiledEffects[effectDef.id];
    }

    var fsSource = buildEffectFragmentShader(effectDef);
    var prog = createProgram(gl, QUAD_VS, fsSource);
    if (!prog) {
      console.warn('[XML GLSL] Failed to compile effect:', effectDef.name, effectDef.id);
      return null;
    }

    // Cache Uniform Locations
    var locs = {
      // AM Builtins
      acScreenSize: gl.getUniformLocation(prog, 'acScreenSize'),
      acLayerSize: gl.getUniformLocation(prog, 'acLayerSize'),
      acLayerToScreen: gl.getUniformLocation(prog, 'acLayerToScreen'),
      acScreenToLayer: gl.getUniformLocation(prog, 'acScreenToLayer'),
      acLayerCenter: gl.getUniformLocation(prog, 'acLayerCenter'),
      acLayerCenterNorm: gl.getUniformLocation(prog, 'acLayerCenterNorm'),
      acLayerPivot: gl.getUniformLocation(prog, 'acLayerPivot'),
      acTime: gl.getUniformLocation(prog, 'acTime'),
      acPass: gl.getUniformLocation(prog, 'acPass'),
      acShowGuides: gl.getUniformLocation(prog, 'acShowGuides'),
      acLTS: gl.getUniformLocation(prog, 'acLTS'),
      inputImg: gl.getUniformLocation(prog, 'inputImg'),
      comp: gl.getUniformLocation(prog, 'comp'),
      params: {}
    };

    var params = effectDef.params || [];
    for (var i = 0; i < params.length; i++) {
      var p = params[i];
      locs.params[p.id] = gl.getUniformLocation(prog, p.id);
    }

    var entry = {
      program: prog,
      locations: locs,
      effectDef: effectDef,
      fsSource: fsSource
    };

    glRes.compiledEffects[effectDef.id] = entry;
    return entry;
  }

  // Hex / Color Parser to float RGBA [0..1]
  function parseColorToRgba(hexOrCss) {
    if (!hexOrCss) return [1, 1, 1, 1];
    if (hexOrCss.charAt(0) === '#') {
      var h = hexOrCss.slice(1);
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      var r = parseInt(h.slice(0, 2), 16) / 255.0 || 0;
      var g = parseInt(h.slice(2, 4), 16) / 255.0 || 0;
      var b = parseInt(h.slice(4, 6), 16) / 255.0 || 0;
      return [r, g, b, 1.0];
    }
    return [0.88, 0.33, 0.21, 1.0];
  }

  // Main Render Routine (Pass 0: Base 3D Rect, Passes 1..N: Effects, Final: Blit)
  function renderFrame(time) {
    var gl = glRes.gl;
    if (!gl) return;

    var canvas = glRes.canvas;
    var W = state.stageResolution.width;
    var H = state.stageResolution.height;

    // Ensure Canvas drawing buffer size matches stage resolution
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      createPingPongFBOs(gl, W, H);
    }

    var layer = getActiveLayer();
    if (!layer) return;

    var cur = evaluateLayerAtTime(layer, time);

    // -------------------------------------------------------------------------
    // PASS 0: Render 3D Rectangle into FBO A
    // -------------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, glRes.fboA);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(glRes.baseProgram);

    // Setup 3D Camera Projection
    var fov = 45 * Math.PI / 180;
    var aspect = W / H;
    var projMat = M4.create();
    M4.perspective(projMat, fov, aspect, 1.0, 10000.0);

    // Camera View Matrix
    var viewMat = M4.create();
    var defaultDist = (H / 2.0) / Math.tan(fov / 2.0); // 1 unit in 3D == 1 screen pixel at z=0

    if (state.cameraMode === 'front') {
      M4.lookAt(viewMat, [0, 0, defaultDist], [0, 0, 0], [0, 1, 0]);
    } else {
      // 3D Orbit Camera
      var pitchRad = state.cameraOrbit.pitch * Math.PI / 180;
      var yawRad = state.cameraOrbit.yaw * Math.PI / 180;
      var dist = state.cameraOrbit.distance || defaultDist;

      var eyeX = dist * Math.sin(yawRad) * Math.cos(pitchRad);
      var eyeY = dist * Math.sin(pitchRad);
      var eyeZ = dist * Math.cos(yawRad) * Math.cos(pitchRad);
      M4.lookAt(viewMat, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);
    }

    // Model Matrix (Translation, 3D Euler Rotations, Scale)
    var modelMat = M4.create();
    M4.identity(modelMat);
    // Move X, Y, Z
    M4.translate(modelMat, modelMat, [cur.x, -cur.y, cur.z]);
    // 3D Rotations
    M4.rotateX(modelMat, modelMat, cur.rotX * Math.PI / 180);
    M4.rotateY(modelMat, modelMat, cur.rotY * Math.PI / 180);
    M4.rotateZ(modelMat, modelMat, -cur.rotZ * Math.PI / 180);
    // Non-uniform & uniform scale
    var totalScaleX = (layer.width || 600) * cur.scale * cur.scaleX;
    var totalScaleY = (layer.height || 750) * cur.scale * cur.scaleY;
    M4.scale(modelMat, modelMat, [totalScaleX, totalScaleY, 1.0]);

    // Model-View-Projection Matrix
    var mvMat = M4.create();
    M4.multiply(mvMat, viewMat, modelMat);
    var mvpMat = M4.create();
    M4.multiply(mvpMat, projMat, mvMat);

    // Model-to-Screen (acLayerToScreen) Matrix
    var acLayerToScreen = M4.create();
    M4.multiply(acLayerToScreen, projMat, mvMat);
    var acScreenToLayer = M4.create();
    M4.invert(acScreenToLayer, acLayerToScreen);

    // Bind Attributes for Unit Rectangle
    gl.bindBuffer(gl.ARRAY_BUFFER, glRes.rectVbo);
    var aPos = gl.getAttribLocation(glRes.baseProgram, 'a_position');
    var aTex = gl.getAttribLocation(glRes.baseProgram, 'a_texCoord');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 5 * 4, 0);
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

    // Uniforms
    var uMvp = gl.getUniformLocation(glRes.baseProgram, 'u_mvp');
    var uCol = gl.getUniformLocation(glRes.baseProgram, 'u_color');
    var uFill = gl.getUniformLocation(glRes.baseProgram, 'u_fillType');
    var uOpac = gl.getUniformLocation(glRes.baseProgram, 'u_opacity');

    gl.uniformMatrix4fv(uMvp, false, mvpMat);
    var rgba = parseColorToRgba(layer.color || '#e05336');
    gl.uniform4fv(uCol, rgba);
    gl.uniform1i(uFill, layer.fillType === 'grid' ? 1 : (layer.fillType === 'checker' ? 2 : 0));
    gl.uniform1f(uOpac, cur.opacity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // -------------------------------------------------------------------------
    // PASS 1..N: Ping-Pong Effect Processing
    // -------------------------------------------------------------------------
    gl.disable(gl.DEPTH_TEST);
    var currentReadTex = glRes.fboTexA;
    var currentWriteFbo = glRes.fboB;
    var currentWriteTex = glRes.fboTexB;

    var activeEffects = (layer.effects || []).filter(function(e) { return e.enabled; });

    for (var i = 0; i < activeEffects.length; i++) {
      var eff = activeEffects[i];
      var effDef = null;
      for (var d = 0; d < AM_DB.length; d++) {
        if (AM_DB[d].id === eff.id) { effDef = AM_DB[d]; break; }
      }
      if (!effDef) continue;

      var compiled = getEffectProgram(gl, effDef);
      if (!compiled) continue;

      gl.bindFramebuffer(gl.FRAMEBUFFER, currentWriteFbo);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(compiled.program);

      // Bind inputImg texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentReadTex);
      if (compiled.locations.inputImg) gl.uniform1i(compiled.locations.inputImg, 0);

      // Pass Alight Motion Built-in Uniforms
      var locs = compiled.locations;
      if (locs.acScreenSize) gl.uniform2f(locs.acScreenSize, W, H);
      if (locs.acLayerSize) gl.uniform2f(locs.acLayerSize, layer.width || 600, layer.height || 750);
      if (locs.acLayerToScreen) gl.uniformMatrix4fv(locs.acLayerToScreen, false, acLayerToScreen);
      if (locs.acScreenToLayer && acScreenToLayer) gl.uniformMatrix4fv(locs.acScreenToLayer, false, acScreenToLayer);
      if (locs.acLTS) gl.uniformMatrix4fv(locs.acLTS, false, acLayerToScreen);

      var screenCenterX = W * 0.5 + cur.x;
      var screenCenterY = H * 0.5 + cur.y;
      if (locs.acLayerCenter) gl.uniform2f(locs.acLayerCenter, screenCenterX, screenCenterY);
      if (locs.acLayerCenterNorm) gl.uniform2f(locs.acLayerCenterNorm, screenCenterX / W, screenCenterY / H);
      if (locs.acLayerPivot) gl.uniform2f(locs.acLayerPivot, 0.5, 0.5);
      if (locs.acTime) gl.uniform1f(locs.acTime, time);
      if (locs.acPass) gl.uniform1i(locs.acPass, i);
      if (locs.acShowGuides) gl.uniform1i(locs.acShowGuides, 0);

      // Pass Effect Parameter Uniforms (Keyframed or Static)
      var pVals = evaluateEffectParamsAtTime(eff, time);
      var pDefs = effDef.params || [];
      for (var p = 0; p < pDefs.length; p++) {
        var pDef = pDefs[p];
        var uLoc = locs.params[pDef.id];
        if (!uLoc) continue;
        var val = pVals[pDef.id] !== undefined ? pVals[pDef.id] : pDef.default;

        if (pDef.type === 'float' || pDef.type === 'spinner' || pDef.type === 'slider' || pDef.type === 'hue-disc' || pDef.type === 'iterations') {
          gl.uniform1f(uLoc, parseFloat(val) || 0.0);
        } else if (pDef.type === 'selector') {
          gl.uniform1i(uLoc, parseInt(val, 10) || 0);
        } else if (pDef.type === 'switch') {
          gl.uniform1i(uLoc, (val === true || val === 'true' || val === 1) ? 1 : 0);
        } else if (pDef.type === 'color') {
          var cRgba = parseColorToRgba(val);
          gl.uniform4fv(uLoc, cRgba);
        } else if (pDef.type === 'point') {
          var pt = typeof val === 'string' ? val.split(',').map(Number) : [0.5, 0.5];
          gl.uniform2f(uLoc, pt[0] || 0.0, pt[1] || 0.0);
        } else if (pDef.type === 'xyz') {
          var xyz = typeof val === 'string' ? val.split(',').map(Number) : [0, 0, 0];
          gl.uniform3f(uLoc, xyz[0] || 0.0, xyz[1] || 0.0, xyz[2] || 0.0);
        }
      }

      // Draw Full-Screen Quad
      gl.bindBuffer(gl.ARRAY_BUFFER, glRes.quadVbo);
      var qPos = gl.getAttribLocation(compiled.program, 'a_position');
      var qTex = gl.getAttribLocation(compiled.program, 'a_texCoord');
      if (qPos >= 0) {
        gl.enableVertexAttribArray(qPos);
        gl.vertexAttribPointer(qPos, 2, gl.FLOAT, false, 4 * 4, 0);
      }
      if (qTex >= 0) {
        gl.enableVertexAttribArray(qTex);
        gl.vertexAttribPointer(qTex, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Ping-pong swap
      var tmpTex = currentReadTex;
      currentReadTex = currentWriteTex;
      currentWriteTex = tmpTex;

      currentWriteFbo = (currentWriteFbo === glRes.fboA) ? glRes.fboB : glRes.fboA;
    }

    // -------------------------------------------------------------------------
    // FINAL PASS: Composite Output to Canvas Screen
    // -------------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    var bg = parseColorToRgba(state.canvasBgColor || '#0a0a0e');
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(glRes.screenBlitProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentReadTex);
    var uBlitTex = gl.getUniformLocation(glRes.screenBlitProgram, 'u_texture');
    gl.uniform1i(uBlitTex, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, glRes.quadVbo);
    var bPos = gl.getAttribLocation(glRes.screenBlitProgram, 'a_position');
    var bTex = gl.getAttribLocation(glRes.screenBlitProgram, 'a_texCoord');
    if (bPos >= 0) {
      gl.enableVertexAttribArray(bPos);
      gl.vertexAttribPointer(bPos, 2, gl.FLOAT, false, 4 * 4, 0);
    }
    if (bTex >= 0) {
      gl.enableVertexAttribArray(bTex);
      gl.vertexAttribPointer(bTex, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Telemetry Update
    updateTelemetry(activeEffects.length, cur);
  }

  // Live Telemetry Readout
  function updateTelemetry(activeEffectsCount, cur) {
    glRes.fpsCalc.frames++;
    var now = performance.now();
    if (now - glRes.fpsCalc.lastTime >= 500) {
      glRes.fpsCalc.fps = Math.round((glRes.fpsCalc.frames * 1000) / (now - glRes.fpsCalc.lastTime));
      glRes.fpsCalc.frames = 0;
      glRes.fpsCalc.lastTime = now;
    }

    var fpsEl = document.getElementById('xmlglslFps');
    if (fpsEl) fpsEl.textContent = glRes.fpsCalc.fps + ' FPS';

    var resEl = document.getElementById('xmlglslRes');
    if (resEl) resEl.textContent = state.stageResolution.width + ' × ' + state.stageResolution.height;

    var effCountEl = document.getElementById('xmlglslActiveEffectsCount');
    if (effCountEl) effCountEl.textContent = activeEffectsCount + ' FX';

    var zEl = document.getElementById('xmlglslZReadout');
    if (zEl) zEl.textContent = 'Z: ' + Math.round(cur.z) + 'px';
  }

  // Animation Playback Loop
  function playLoop(timestamp) {
    if (!glRes.lastFrameTime) glRes.lastFrameTime = timestamp;
    var dt = (timestamp - glRes.lastFrameTime) / 1000.0;
    glRes.lastFrameTime = timestamp;

    if (state.isPlaying) {
      state.currentTime += dt;
      if (state.currentTime > state.duration) {
        state.currentTime = 0.0;
      }
      syncTimelineUI();
      syncInputsFromState();
    }

    renderFrame(state.currentTime);

    glRes.animFrameId = requestAnimationFrame(playLoop);
  }

  function startPlayback() {
    state.isPlaying = true;
    glRes.lastFrameTime = performance.now();
    var playBtn = document.getElementById('xmlglslPlayBtn');
    if (playBtn) playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  function pausePlayback() {
    state.isPlaying = false;
    var playBtn = document.getElementById('xmlglslPlayBtn');
    if (playBtn) playBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  function togglePlayback() {
    if (state.isPlaying) pausePlayback();
    else startPlayback();
  }

  // Keyframe Engine Manipulation
  function toggleKeyframeOnProperty(layer, propName, time) {
    if (!layer.keyframes[propName]) layer.keyframes[propName] = [];
    var track = layer.keyframes[propName];

    // Check if keyframe exists within 0.03 seconds
    var existingIdx = -1;
    for (var i = 0; i < track.length; i++) {
      if (Math.abs(track[i].t - time) < 0.03) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      // Remove keyframe
      track.splice(existingIdx, 1);
    } else {
      // Add keyframe with current evaluated value
      var curVal = evaluateLayerAtTime(layer, time)[propName];
      track.push({ t: parseFloat(time.toFixed(3)), val: curVal, curve: state.activeEasing || 'hermite' });
      track.sort(function(a, b) { return a.t - b.t; });
    }

    syncTimelineUI();
    syncKeyframeButtons();
    renderFrame(state.currentTime);
  }

  function toggleKeyframeOnEffectParam(eff, paramId, time) {
    if (!eff.keyframes) eff.keyframes = {};
    if (!eff.keyframes[paramId]) eff.keyframes[paramId] = [];
    var track = eff.keyframes[paramId];

    var existingIdx = -1;
    for (var i = 0; i < track.length; i++) {
      if (Math.abs(track[i].t - time) < 0.03) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      track.splice(existingIdx, 1);
    } else {
      var curVal = evaluateEffectParamsAtTime(eff, time)[paramId];
      track.push({ t: parseFloat(time.toFixed(3)), val: curVal, curve: state.activeEasing || 'hermite' });
      track.sort(function(a, b) { return a.t - b.t; });
    }

    syncTimelineUI();
    syncKeyframeButtons();
    renderFrame(state.currentTime);
  }

  // UI Event Handlers & Bindings
  function syncInputsFromState() {
    var layer = getActiveLayer();
    if (!layer) return;

    var cur = evaluateLayerAtTime(layer, state.currentTime);

    function setVal(id, v, fixed) {
      var el = document.getElementById(id);
      if (el && document.activeElement !== el) {
        el.value = fixed !== undefined ? Number(v).toFixed(fixed) : v;
      }
    }

    setVal('xgPosX', cur.x, 1);
    setVal('xgPosXSlider', cur.x);
    setVal('xgPosY', cur.y, 1);
    setVal('xgPosYSlider', cur.y);
    setVal('xgPosZ', cur.z, 1);
    setVal('xgPosZSlider', cur.z);

    setVal('xgRotZ', cur.rotZ, 1);
    setVal('xgRotZSlider', cur.rotZ);
    setVal('xgRotX', cur.rotX, 1);
    setVal('xgRotXSlider', cur.rotX);
    setVal('xgRotY', cur.rotY, 1);
    setVal('xgRotYSlider', cur.rotY);

    setVal('xgScale', cur.scale, 2);
    setVal('xgScaleSlider', cur.scale);
    setVal('xgScaleX', cur.scaleX, 2);
    setVal('xgScaleXSlider', cur.scaleX);
    setVal('xgScaleY', cur.scaleY, 2);
    setVal('xgScaleYSlider', cur.scaleY);

    setVal('xgOpacity', Math.round(cur.opacity * 100));
    setVal('xgOpacitySlider', Math.round(cur.opacity * 100));

    setVal('xgWidth', layer.width || 600);
    setVal('xgHeight', layer.height || 750);
    setVal('xgFillColor', layer.color || '#e05336');

    syncKeyframeButtons();
  }

  function syncKeyframeButtons() {
    var layer = getActiveLayer();
    if (!layer) return;

    var props = ['x', 'y', 'z', 'rotZ', 'rotX', 'rotY', 'scale', 'scaleX', 'scaleY', 'opacity'];
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      var btn = document.querySelector('.xg-kf-btn[data-prop="' + p + '"]');
      if (btn) {
        var track = (layer.keyframes && layer.keyframes[p]) || [];
        var hasKf = track.some(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });
        btn.classList.toggle('active', hasKf);
        btn.title = hasKf ? 'Keyframe set at current time. Click to remove.' : 'Click to add keyframe at current time.';
      }
    }

    // Effect param keyframe buttons
    document.querySelectorAll('.xg-eff-kf-btn').forEach(function(btn) {
      var effId = btn.getAttribute('data-eff-instance');
      var paramId = btn.getAttribute('data-param-id');
      var eff = null;
      for (var e = 0; e < (layer.effects || []).length; e++) {
        if (layer.effects[e].instanceId === effId) { eff = layer.effects[e]; break; }
      }
      if (eff && eff.keyframes && eff.keyframes[paramId]) {
        var hasKf = eff.keyframes[paramId].some(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });
        btn.classList.toggle('active', hasKf);
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function syncTimelineUI() {
    var pct = Math.max(0, Math.min(100, (state.currentTime / state.duration) * 100));

    var playhead = document.getElementById('xmlglslPlayhead');
    if (playhead) playhead.style.left = pct + '%';

    var progress = document.getElementById('xmlglslProgressFill');
    if (progress) progress.style.width = pct + '%';

    var timeLabel = document.getElementById('xmlglslTimeReadout');
    if (timeLabel) {
      var curSec = state.currentTime.toFixed(2);
      var durSec = state.duration.toFixed(2);
      var curFrame = Math.round(state.currentTime * state.fps);
      var totalFrames = Math.round(state.duration * state.fps);
      timeLabel.textContent = curSec + 's / ' + durSec + 's (' + curFrame + '/' + totalFrames + 'f)';
    }

    renderTimelineKeyframeTracks();
  }

  // Draw Keyframe Diamonds on Timeline Track
  function renderTimelineKeyframeTracks() {
    var trackContainer = document.getElementById('xmlglslKeyframeRuler');
    if (!trackContainer) return;

    var layer = getActiveLayer();
    if (!layer) return;

    // Collect all timestamps from active layer transform & effects
    var kfMap = {};
    var props = ['x', 'y', 'z', 'rotZ', 'rotX', 'rotY', 'scale', 'scaleX', 'scaleY', 'opacity'];
    for (var i = 0; i < props.length; i++) {
      var track = (layer.keyframes && layer.keyframes[props[i]]) || [];
      for (var k = 0; k < track.length; k++) {
        var t = track[k].t;
        if (!kfMap[t]) kfMap[t] = [];
        kfMap[t].push(props[i]);
      }
    }

    var effs = layer.effects || [];
    for (var e = 0; e < effs.length; e++) {
      var effKfs = effs[e].keyframes || {};
      for (var pId in effKfs) {
        var pTrack = effKfs[pId] || [];
        for (var pk = 0; pk < pTrack.length; pk++) {
          var pt = pTrack[pk].t;
          if (!kfMap[pt]) kfMap[pt] = [];
          kfMap[pt].push(effs[e].name + '.' + pId);
        }
      }
    }

    var html = '';
    for (var timeKey in kfMap) {
      var tVal = parseFloat(timeKey);
      var posPct = (tVal / state.duration) * 100;
      if (posPct >= 0 && posPct <= 100) {
        var isCurrent = Math.abs(tVal - state.currentTime) < 0.03;
        html += '<div class="xg-kf-marker' + (isCurrent ? ' selected' : '') + '" style="left: ' + posPct + '%;" data-time="' + tVal + '" title="' + tVal.toFixed(2) + 's: ' + kfMap[timeKey].join(', ') + '"></div>';
      }
    }

    trackContainer.innerHTML = html;

    // Click on diamond jumps time
    trackContainer.querySelectorAll('.xg-kf-marker').forEach(function(diamond) {
      diamond.addEventListener('click', function(ev) {
        ev.stopPropagation();
        var seekT = parseFloat(diamond.getAttribute('data-time'));
        if (!isNaN(seekT)) {
          state.currentTime = seekT;
          syncTimelineUI();
          syncInputsFromState();
          renderFrame(state.currentTime);
        }
      });
    });
  }

  // Render Effect Stack UI Cards
  function renderEffectsStackUI() {
    var container = document.getElementById('xmlglslAppliedEffectsList');
    if (!container) return;

    var layer = getActiveLayer();
    if (!layer || !layer.effects || layer.effects.length === 0) {
      container.innerHTML = '<div class="xg-empty-card">No effects applied yet. Choose an Alight Motion GLSL effect below to add it.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < layer.effects.length; i++) {
      var eff = layer.effects[i];
      var effDef = null;
      for (var d = 0; d < AM_DB.length; d++) {
        if (AM_DB[d].id === eff.id) { effDef = AM_DB[d]; break; }
      }
      if (!effDef) continue;

      html += '<div class="xg-effect-card' + (eff.enabled ? '' : ' disabled') + '" data-eff-instance="' + eff.instanceId + '">';
      html += '  <div class="xg-effect-header">';
      html += '    <label class="xg-switch-mini" title="Enable / Disable effect">';
      html += '      <input type="checkbox" class="xg-eff-toggle" data-eff-instance="' + eff.instanceId + '"' + (eff.enabled ? ' checked' : '') + '>';
      html += '      <span class="xg-switch-slider"></span>';
      html += '    </label>';
      html += '    <div class="xg-effect-meta">';
      html += '      <div class="xg-effect-title">' + (effDef.name || eff.id) + '</div>';
      html += '      <span class="xg-effect-tag">' + (effDef.category || 'Effect') + '</span>';
      html += '    </div>';
      html += '    <div class="xg-effect-actions">';
      html += '      <button class="xg-btn-icon xg-btn-view-glsl" data-eff-id="' + effDef.id + '" title="View compiled WebGL GLSL fragment shader code">GLSL</button>';
      html += '      <button class="xg-btn-icon xg-btn-eff-up" data-eff-instance="' + eff.instanceId + '" title="Move Up" ' + (i === 0 ? 'disabled' : '') + '>↑</button>';
      html += '      <button class="xg-btn-icon xg-btn-eff-down" data-eff-instance="' + eff.instanceId + '" title="Move Down" ' + (i === layer.effects.length - 1 ? 'disabled' : '') + '>↓</button>';
      html += '      <button class="xg-btn-icon xg-btn-eff-del" data-eff-instance="' + eff.instanceId + '" title="Remove effect">✕</button>';
      html += '    </div>';
      html += '  </div>';

      // Parameter Controls
      html += '  <div class="xg-effect-params-body">';
      var curParams = evaluateEffectParamsAtTime(eff, state.currentTime);
      var params = effDef.params || [];
      for (var p = 0; p < params.length; p++) {
        var pDef = params[p];
        if (pDef.type === 'texture') continue; // texture handled internally

        var val = curParams[pDef.id] !== undefined ? curParams[pDef.id] : pDef.default;
        var pTrack = (eff.keyframes && eff.keyframes[pDef.id]) || [];
        var hasKf = pTrack.some(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });

        html += '    <div class="xg-param-row">';
        html += '      <div class="xg-param-label-wrap">';
        html += '        <button class="xg-eff-kf-btn' + (hasKf ? ' active' : '') + '" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '" title="Keyframe parameter">✦</button>';
        html += '        <label class="xg-param-label">' + (pDef.label || pDef.id) + '</label>';
        html += '      </div>';

        if (pDef.type === 'float' || pDef.type === 'spinner' || pDef.type === 'slider' || pDef.type === 'hue-disc' || pDef.type === 'iterations') {
          var minVal = pDef.min !== undefined ? pDef.min : (pDef.subType === 'angle' ? -180 : 0);
          var maxVal = pDef.max !== undefined ? pDef.max : (pDef.subType === 'angle' ? 180 : (pDef.subType === 'percent' ? 1.0 : 100));
          var stepVal = pDef.step !== undefined ? pDef.step : (pDef.subType === 'percent' ? 0.01 : 1);
          var numVal = parseFloat(val) || 0;

          html += '      <div class="xg-dual-ctrl">';
          html += '        <input type="range" class="xg-eff-param-slider" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '" min="' + minVal + '" max="' + maxVal + '" step="' + stepVal + '" value="' + numVal + '">';
          html += '        <input type="number" class="xg-eff-param-num" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '" min="' + minVal + '" max="' + maxVal + '" step="' + stepVal + '" value="' + numVal.toFixed(stepVal < 0.1 ? 2 : 1) + '">';
          html += '      </div>';
        } else if (pDef.type === 'selector' && pDef.choices && pDef.choices.length > 0) {
          html += '      <select class="xg-eff-param-select" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '">';
          for (var c = 0; c < pDef.choices.length; c++) {
            var ch = pDef.choices[c];
            html += '        <option value="' + ch.value + '"' + (String(val) === String(ch.value) ? ' selected' : '') + '>' + ch.label + '</option>';
          }
          html += '      </select>';
        } else if (pDef.type === 'switch') {
          var isChecked = (val === true || val === 'true' || val === 1);
          html += '      <label class="xg-switch-mini">';
          html += '        <input type="checkbox" class="xg-eff-param-check" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '"' + (isChecked ? ' checked' : '') + '>';
          html += '        <span class="xg-switch-slider"></span>';
          html += '      </label>';
        } else if (pDef.type === 'color') {
          html += '      <div class="xg-color-wrap">';
          html += '        <input type="color" class="xg-eff-param-color" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '" value="' + (typeof val === 'string' && val.charAt(0) === '#' ? val : '#ffffff') + '">';
          html += '      </div>';
        } else if (pDef.type === 'point') {
          var ptVals = typeof val === 'string' ? val.split(',').map(Number) : [0.5, 0.5];
          html += '      <div class="xg-dual-ctrl">';
          html += '        <input type="number" step="0.01" class="xg-eff-param-point-x" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '" value="' + (ptVals[0] || 0) + '">';
          html += '        <input type="number" step="0.01" class="xg-eff-param-point-y" data-eff-instance="' + eff.instanceId + '" data-param-id="' + pDef.id + '" value="' + (ptVals[1] || 0) + '">';
          html += '      </div>';
        }
        html += '    </div>';
      }
      html += '  </div>';
      html += '</div>';
    }

    container.innerHTML = html;
    bindEffectCardListeners(container);
  }

  function bindEffectCardListeners(container) {
    var layer = getActiveLayer();
    if (!layer) return;

    // Toggle Effect On/Off
    container.querySelectorAll('.xg-eff-toggle').forEach(function(toggle) {
      toggle.addEventListener('change', function() {
        var instId = toggle.getAttribute('data-eff-instance');
        var eff = layer.effects.find(function(e) { return e.instanceId === instId; });
        if (eff) {
          eff.enabled = toggle.checked;
          renderEffectsStackUI();
          renderFrame(state.currentTime);
        }
      });
    });

    // Delete Effect
    container.querySelectorAll('.xg-btn-eff-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var instId = btn.getAttribute('data-eff-instance');
        layer.effects = layer.effects.filter(function(e) { return e.instanceId !== instId; });
        renderEffectsStackUI();
        renderTimelineKeyframeTracks();
        renderFrame(state.currentTime);
      });
    });

    // Move Up
    container.querySelectorAll('.xg-btn-eff-up').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var instId = btn.getAttribute('data-eff-instance');
        var idx = layer.effects.findIndex(function(e) { return e.instanceId === instId; });
        if (idx > 0) {
          var tmp = layer.effects[idx];
          layer.effects[idx] = layer.effects[idx - 1];
          layer.effects[idx - 1] = tmp;
          renderEffectsStackUI();
          renderFrame(state.currentTime);
        }
      });
    });

    // Move Down
    container.querySelectorAll('.xg-btn-eff-down').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var instId = btn.getAttribute('data-eff-instance');
        var idx = layer.effects.findIndex(function(e) { return e.instanceId === instId; });
        if (idx >= 0 && idx < layer.effects.length - 1) {
          var tmp = layer.effects[idx];
          layer.effects[idx] = layer.effects[idx + 1];
          layer.effects[idx + 1] = tmp;
          renderEffectsStackUI();
          renderFrame(state.currentTime);
        }
      });
    });

    // View GLSL Code
    container.querySelectorAll('.xg-btn-view-glsl').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var effId = btn.getAttribute('data-eff-id');
        openGlslViewerModal(effId);
      });
    });

    // Keyframe Toggle on Effect Parameter
    container.querySelectorAll('.xg-eff-kf-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var instId = btn.getAttribute('data-eff-instance');
        var paramId = btn.getAttribute('data-param-id');
        var eff = layer.effects.find(function(e) { return e.instanceId === instId; });
        if (eff) {
          toggleKeyframeOnEffectParam(eff, paramId, state.currentTime);
        }
      });
    });

    // Parameter Input Changes (Numbers, Sliders, Dropdowns, Toggles)
    function onParamChange(instId, paramId, newVal) {
      var eff = layer.effects.find(function(e) { return e.instanceId === instId; });
      if (!eff) return;
      eff.params[paramId] = newVal;

      // If keyframe exists at current time, update it
      if (eff.keyframes && eff.keyframes[paramId]) {
        var kf = eff.keyframes[paramId].find(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });
        if (kf) kf.val = newVal;
      }

      renderFrame(state.currentTime);
    }

    container.querySelectorAll('.xg-eff-param-slider, .xg-eff-param-num').forEach(function(input) {
      input.addEventListener('input', function() {
        var instId = input.getAttribute('data-eff-instance');
        var paramId = input.getAttribute('data-param-id');
        var val = parseFloat(input.value) || 0;
        // Sync sibling input
        var sibling = container.querySelector(
          input.classList.contains('xg-eff-param-slider')
            ? '.xg-eff-param-num[data-eff-instance="' + instId + '"][data-param-id="' + paramId + '"]'
            : '.xg-eff-param-slider[data-eff-instance="' + instId + '"][data-param-id="' + paramId + '"]'
        );
        if (sibling && document.activeElement !== sibling) sibling.value = val;
        onParamChange(instId, paramId, val);
      });
    });

    container.querySelectorAll('.xg-eff-param-select').forEach(function(select) {
      select.addEventListener('change', function() {
        onParamChange(select.getAttribute('data-eff-instance'), select.getAttribute('data-param-id'), parseInt(select.value, 10));
      });
    });

    container.querySelectorAll('.xg-eff-param-check').forEach(function(chk) {
      chk.addEventListener('change', function() {
        onParamChange(chk.getAttribute('data-eff-instance'), chk.getAttribute('data-param-id'), chk.checked);
      });
    });

    container.querySelectorAll('.xg-eff-param-color').forEach(function(col) {
      col.addEventListener('input', function() {
        onParamChange(col.getAttribute('data-eff-instance'), col.getAttribute('data-param-id'), col.value);
      });
    });
  }

  // Effect Browser Dropdown / Search Filter
  function populateEffectsLibrary(categoryFilter, searchQuery) {
    var select = document.getElementById('xmlglslEffectSelect');
    if (!select) return;

    var cat = categoryFilter || 'all';
    var q = (searchQuery || '').trim().toLowerCase();

    var filtered = AM_DB.filter(function(e) {
      var matchesCat = (cat === 'all') || (e.category === cat);
      var matchesQuery = !q || (e.name.toLowerCase().indexOf(q) !== -1) || (e.id.toLowerCase().indexOf(q) !== -1);
      return matchesCat && matchesQuery;
    });

    var html = '<option value="">-- Choose Alight Motion Effect (' + filtered.length + ' available) --</option>';
    for (var i = 0; i < filtered.length; i++) {
      html += '<option value="' + filtered[i].id + '">' + filtered[i].name + ' [' + filtered[i].category + ']</option>';
    }
    select.innerHTML = html;
  }

  function addEffectToActiveLayer(effectId) {
    if (!effectId) return;
    var layer = getActiveLayer();
    if (!layer) return;

    var effDef = null;
    for (var i = 0; i < AM_DB.length; i++) {
      if (AM_DB[i].id === effectId) { effDef = AM_DB[i]; break; }
    }
    if (!effDef) return;

    // Build default params map
    var defaultParams = {};
    var params = effDef.params || [];
    for (var p = 0; p < params.length; p++) {
      defaultParams[params[p].id] = params[p].default;
    }

    var newInst = {
      instanceId: 'eff_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      id: effDef.id,
      name: effDef.name,
      category: effDef.category,
      enabled: true,
      params: defaultParams,
      keyframes: {}
    };

    if (!layer.effects) layer.effects = [];
    layer.effects.push(newInst);

    renderEffectsStackUI();
    renderTimelineKeyframeTracks();
    renderFrame(state.currentTime);
  }

  // Alight Motion XML Export
  function exportAlightMotionXml() {
    var W = state.stageResolution.width;
    var H = state.stageResolution.height;
    var fps = state.fps;

    var xml = "<?xml version='1.0' encoding='UTF-8' ?>\n";
    xml += '<scene width="' + W + '" height="' + H + '" exportSize="' + W + ',' + H + '" fps="' + fps + '" duration="' + state.duration + '">\n';

    for (var l = 0; l < state.layers.length; l++) {
      var layer = state.layers[l];
      xml += '  <shape type="rect" label="' + (layer.name || 'Rectangle') + '">\n';
      xml += '    <property name="size" value="' + (layer.width || 600).toFixed(6) + ',' + (layer.height || 750).toFixed(6) + '"/>\n';
      xml += '    <property name="fillColor" value="' + (layer.color || '#e05336') + '"/>\n';

      // Transform
      xml += '    <transform>\n';

      // Translation
      var xKfs = layer.keyframes.x || [];
      var yKfs = layer.keyframes.y || [];
      xml += '      <translate>\n';
      if (xKfs.length > 0 || yKfs.length > 0) {
        var allTimes = Array.from(new Set(xKfs.map(function(k){return k.t;}).concat(yKfs.map(function(k){return k.t;})))).sort(function(a,b){return a-b;});
        for (var tIdx = 0; tIdx < allTimes.length; tIdx++) {
          var t = allTimes[tIdx];
          var evalState = evaluateLayerAtTime(layer, t);
          xml += '        <keyframe time="' + t.toFixed(6) + '" value="' + (W * 0.5 + evalState.x).toFixed(6) + ',' + (H * 0.5 + evalState.y).toFixed(6) + '"/>\n';
        }
      } else {
        xml += '        <keyframe time="0.000000" value="' + (W * 0.5 + layer.transform.x).toFixed(6) + ',' + (H * 0.5 + layer.transform.y).toFixed(6) + '"/>\n';
      }
      xml += '      </translate>\n';

      // 3D Z-Depth
      var zKfs = layer.keyframes.z || [];
      xml += '      <zDepth>\n';
      if (zKfs.length > 0) {
        for (var zIdx = 0; zIdx < zKfs.length; zIdx++) {
          xml += '        <keyframe time="' + zKfs[zIdx].t.toFixed(6) + '" value="' + zKfs[zIdx].val.toFixed(6) + '"/>\n';
        }
      } else {
        xml += '        <keyframe time="0.000000" value="' + (layer.transform.z || 0).toFixed(6) + '"/>\n';
      }
      xml += '      </zDepth>\n';

      // Scale
      var sKfs = layer.keyframes.scale || [];
      xml += '      <scale>\n';
      if (sKfs.length > 0) {
        for (var sIdx = 0; sIdx < sKfs.length; sIdx++) {
          var sc = sKfs[sIdx].val;
          xml += '        <keyframe time="' + sKfs[sIdx].t.toFixed(6) + '" value="' + (sc * layer.transform.scaleX).toFixed(6) + ',' + (sc * layer.transform.scaleY).toFixed(6) + '"/>\n';
        }
      } else {
        xml += '        <keyframe time="0.000000" value="' + (layer.transform.scale * layer.transform.scaleX).toFixed(6) + ',' + (layer.transform.scale * layer.transform.scaleY).toFixed(6) + '"/>\n';
      }
      xml += '      </scale>\n';

      // Rotation (2D + 3D Euler)
      var rotKfs = layer.keyframes.rotZ || [];
      xml += '      <rotate>\n';
      if (rotKfs.length > 0) {
        for (var rIdx = 0; rIdx < rotKfs.length; rIdx++) {
          xml += '        <keyframe time="' + rotKfs[rIdx].t.toFixed(6) + '" value="' + rotKfs[rIdx].val.toFixed(6) + '"/>\n';
        }
      } else {
        xml += '        <keyframe time="0.000000" value="' + (layer.transform.rotZ || 0).toFixed(6) + '"/>\n';
      }
      xml += '      </rotate>\n';

      xml += '    </transform>\n';

      // Effects
      var effs = layer.effects || [];
      for (var e = 0; e < effs.length; e++) {
        var eff = effs[e];
        if (!eff.enabled) continue;
        xml += '    <effect id="' + eff.id + '">\n';
        for (var pId in eff.params) {
          var kfList = (eff.keyframes && eff.keyframes[pId]) || [];
          if (kfList.length > 0) {
            xml += '      <property name="' + pId + '">\n';
            for (var pk = 0; pk < kfList.length; pk++) {
              xml += '        <keyframe time="' + kfList[pk].t.toFixed(6) + '" value="' + kfList[pk].val + '"/>\n';
            }
            xml += '      </property>\n';
          } else {
            xml += '      <property name="' + pId + '" value="' + eff.params[pId] + '"/>\n';
          }
        }
        xml += '    </effect>\n';
      }

      xml += '  </shape>\n';
    }

    xml += '</scene>\n';
    return xml;
  }

  // Alight Motion XML Import
  function importAlightMotionXml(xmlStr) {
    if (!xmlStr) return false;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(xmlStr, 'application/xml');
      var scene = doc.querySelector('scene');
      if (scene) {
        var w = parseInt(scene.getAttribute('width'), 10);
        var h = parseInt(scene.getAttribute('height'), 10);
        if (w && h) {
          state.stageResolution.width = w;
          state.stageResolution.height = h;
        }
        var dur = parseFloat(scene.getAttribute('duration'));
        if (dur) state.duration = dur;
      }

      var shapes = doc.querySelectorAll('shape');
      if (shapes.length > 0) {
        state.layers = [];
        for (var i = 0; i < shapes.length; i++) {
          var sh = shapes[i];
          var newLayer = {
            id: 'rect_' + (i + 1),
            name: sh.getAttribute('label') || ('Rectangle ' + (i + 1)),
            color: '#e05336',
            fillType: 'solid',
            width: 600,
            height: 750,
            opacity: 1.0,
            transform: { x: 0, y: 0, z: 0, rotZ: 0, rotX: 0, rotY: 0, scale: 1.0, scaleX: 1.0, scaleY: 1.0 },
            keyframes: { x: [], y: [], z: [], rotZ: [], rotX: [], rotY: [], scale: [], scaleX: [], scaleY: [], opacity: [] },
            effects: []
          };

          // Size
          var sizeProp = sh.querySelector('property[name="size"]');
          if (sizeProp && sizeProp.getAttribute('value')) {
            var sParts = sizeProp.getAttribute('value').split(',').map(Number);
            if (sParts.length >= 2) {
              newLayer.width = sParts[0];
              newLayer.height = sParts[1];
            }
          }

          // Effects
          var effNodes = sh.querySelectorAll('effect');
          for (var e = 0; e < effNodes.length; e++) {
            var eNode = effNodes[e];
            var eId = eNode.getAttribute('id');
            var effDef = AM_DB.find(function(item) { return item.id === eId; });
            var newEff = {
              instanceId: 'eff_' + Date.now() + '_' + e,
              id: eId,
              name: effDef ? effDef.name : eId,
              category: effDef ? effDef.category : 'Effect',
              enabled: true,
              params: {},
              keyframes: {}
            };
            var propNodes = eNode.querySelectorAll('property');
            for (var p = 0; p < propNodes.length; p++) {
              var pName = propNodes[p].getAttribute('name');
              var pVal = propNodes[p].getAttribute('value');
              if (pVal !== null) {
                newEff.params[pName] = isNaN(Number(pVal)) ? pVal : Number(pVal);
              }
            }
            newLayer.effects.push(newEff);
          }

          state.layers.push(newLayer);
        }
        state.selectedLayerId = state.layers[0].id;
      }

      syncInputsFromState();
      syncTimelineUI();
      renderEffectsStackUI();
      renderFrame(state.currentTime);
      return true;
    } catch(err) {
      console.warn('[XML GLSL] XML Import error:', err);
      return false;
    }
  }

  // GLSL Code Viewer Modal
  function openGlslViewerModal(effectId) {
    var effDef = AM_DB.find(function(e) { return e.id === effectId; });
    if (!effDef) return;

    var modal = document.getElementById('xmlglslCodeModal');
    if (!modal) return;

    var titleEl = document.getElementById('xmlglslModalTitle');
    var codeEl = document.getElementById('xmlglslModalCode');
    if (titleEl) titleEl.textContent = effDef.name + ' (' + effDef.id + ') — WebGL Fragment Shader';

    var fullShader = buildEffectFragmentShader(effDef);
    if (codeEl) codeEl.textContent = fullShader;

    modal.classList.add('visible');
  }

  // Direct Canvas Drag & Gizmo Manipulation
  function initCanvasInteraction() {
    var canvas = glRes.canvas;
    if (!canvas) return;

    canvas.addEventListener('mousedown', function(e) {
      if (e.button === 2 || (e.altKey && e.button === 0)) {
        // Orbit mode drag
        state.activeGizmoAction = 'orbit';
        state.dragStart.mouseX = e.clientX;
        state.dragStart.mouseY = e.clientY;
        state.dragStart.initPitch = state.cameraOrbit.pitch;
        state.dragStart.initYaw = state.cameraOrbit.yaw;
        e.preventDefault();
        return;
      }

      var layer = getActiveLayer();
      if (!layer) return;

      var cur = evaluateLayerAtTime(layer, state.currentTime);
      state.activeGizmoAction = 'translate';
      state.dragStart.mouseX = e.clientX;
      state.dragStart.mouseY = e.clientY;
      state.dragStart.initX = cur.x;
      state.dragStart.initY = cur.y;
      state.dragStart.initScale = cur.scale;
      state.dragStart.initRot = cur.rotZ;

      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', function(e) {
      if (!state.activeGizmoAction) return;

      var dx = e.clientX - state.dragStart.mouseX;
      var dy = e.clientY - state.dragStart.mouseY;

      if (state.activeGizmoAction === 'orbit') {
        state.cameraOrbit.yaw = state.dragStart.initYaw + dx * 0.5;
        state.cameraOrbit.pitch = Math.max(-89, Math.min(89, state.dragStart.initPitch - dy * 0.5));
        renderFrame(state.currentTime);
        return;
      }

      var layer = getActiveLayer();
      if (!layer) return;

      if (state.activeGizmoAction === 'translate') {
        // Adjust for canvas to project resolution ratio
        var scaleRatio = state.stageResolution.width / canvas.clientWidth;
        var newX = state.dragStart.initX + dx * scaleRatio;
        var newY = state.dragStart.initY - dy * scaleRatio;

        layer.transform.x = newX;
        layer.transform.y = newY;

        // If keyframing active on X / Y, update keyframe
        if (layer.keyframes.x) {
          var kfX = layer.keyframes.x.find(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });
          if (kfX) kfX.val = newX;
        }
        if (layer.keyframes.y) {
          var kfY = layer.keyframes.y.find(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });
          if (kfY) kfY.val = newY;
        }

        syncInputsFromState();
        renderFrame(state.currentTime);
      }
    });

    window.addEventListener('mouseup', function() {
      if (state.activeGizmoAction) {
        state.activeGizmoAction = null;
        if (canvas) canvas.style.cursor = 'crosshair';
      }
    });

    // Orbit Camera Zoom via Mouse Wheel
    canvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var defaultDist = (state.stageResolution.height / 2.0) / Math.tan((45 * Math.PI / 180) / 2.0);
      var curDist = state.cameraOrbit.distance || defaultDist;
      state.cameraOrbit.distance = Math.max(200, Math.min(8000, curDist + e.deltaY * 1.5));
      renderFrame(state.currentTime);
    }, { passive: false });

    // Prevent context menu on canvas for right-click orbit navigation
    canvas.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
  }

  // Initialize UI Bindings
  function bindUI() {
    var canvas = document.getElementById('glslXmlCanvas');
    if (canvas && !glRes.gl) {
      initGL(canvas);
      initCanvasInteraction();
    }

    // Playback Controls
    var playBtn = document.getElementById('xmlglslPlayBtn');
    if (playBtn) playBtn.addEventListener('click', togglePlayback);

    var stopBtn = document.getElementById('xmlglslStopBtn');
    if (stopBtn) stopBtn.addEventListener('click', function() {
      pausePlayback();
      state.currentTime = 0.0;
      syncTimelineUI();
      syncInputsFromState();
      renderFrame(0.0);
    });

    var stepBackBtn = document.getElementById('xmlglslStepBackBtn');
    if (stepBackBtn) stepBackBtn.addEventListener('click', function() {
      pausePlayback();
      state.currentTime = Math.max(0, state.currentTime - (1 / state.fps));
      syncTimelineUI();
      syncInputsFromState();
      renderFrame(state.currentTime);
    });

    var stepFwdBtn = document.getElementById('xmlglslStepFwdBtn');
    if (stepFwdBtn) stepFwdBtn.addEventListener('click', function() {
      pausePlayback();
      state.currentTime = Math.min(state.duration, state.currentTime + (1 / state.fps));
      syncTimelineUI();
      syncInputsFromState();
      renderFrame(state.currentTime);
    });

    // Timeline Scrubber Click & Drag
    var timelineRuler = document.getElementById('xmlglslTimelineBar');
    if (timelineRuler) {
      var isScrubbing = false;
      function handleScrub(e) {
        var rect = timelineRuler.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        state.currentTime = pct * state.duration;
        syncTimelineUI();
        syncInputsFromState();
        renderFrame(state.currentTime);
      }

      timelineRuler.addEventListener('mousedown', function(e) {
        isScrubbing = true;
        handleScrub(e);
      });

      window.addEventListener('mousemove', function(e) {
        if (isScrubbing) handleScrub(e);
      });

      window.addEventListener('mouseup', function() {
        if (isScrubbing) isScrubbing = false;
      });
    }

    // Duration Selector
    var durSelect = document.getElementById('xmlglslDurationSelect');
    if (durSelect) {
      durSelect.addEventListener('change', function() {
        state.duration = parseFloat(durSelect.value) || 2.0;
        syncTimelineUI();
        renderFrame(state.currentTime);
      });
    }

    // Easing Curve Selector
    var easingSelect = document.getElementById('xmlglslEasingSelect');
    if (easingSelect) {
      easingSelect.addEventListener('change', function() {
        state.activeEasing = easingSelect.value;
      });
    }

    // Camera Mode Switcher
    var camFrontBtn = document.getElementById('xmlglslCamFrontBtn');
    var camOrbitBtn = document.getElementById('xmlglslCamOrbitBtn');
    if (camFrontBtn && camOrbitBtn) {
      camFrontBtn.addEventListener('click', function() {
        state.cameraMode = 'front';
        camFrontBtn.classList.add('active');
        camOrbitBtn.classList.remove('active');
        renderFrame(state.currentTime);
      });
      camOrbitBtn.addEventListener('click', function() {
        state.cameraMode = 'orbit';
        camOrbitBtn.classList.add('active');
        camFrontBtn.classList.remove('active');
        renderFrame(state.currentTime);
      });
    }

    // Background Color Picker
    var bgPicker = document.getElementById('xmlglslBgColorPicker');
    if (bgPicker) {
      bgPicker.addEventListener('input', function() {
        state.canvasBgColor = bgPicker.value;
        renderFrame(state.currentTime);
      });
    }

    // Resolution Presets
    var resSelect = document.getElementById('xmlglslResSelect');
    if (resSelect) {
      resSelect.addEventListener('change', function() {
        var parts = resSelect.value.split('x').map(Number);
        if (parts.length === 2) {
          state.stageResolution.width = parts[0];
          state.stageResolution.height = parts[1];
          renderFrame(state.currentTime);
        }
      });
    }

    // Transform Property Controls (Input + Slider binding)
    function bindTransformProp(numId, sliderId, propName, isInt) {
      var num = document.getElementById(numId);
      var sld = document.getElementById(sliderId);
      if (!num || !sld) return;

      function update(val) {
        var layer = getActiveLayer();
        if (!layer) return;
        var numVal = isInt ? parseInt(val, 10) : parseFloat(val);
        if (isNaN(numVal)) return;

        if (propName === 'opacity') {
          layer.opacity = numVal / 100.0;
        } else {
          layer.transform[propName] = numVal;
        }

        // Auto-update keyframe if exists at current time
        var kfTrack = layer.keyframes[propName];
        if (kfTrack) {
          var kf = kfTrack.find(function(k) { return Math.abs(k.t - state.currentTime) < 0.03; });
          if (kf) kf.val = propName === 'opacity' ? numVal / 100.0 : numVal;
        }

        renderFrame(state.currentTime);
      }

      num.addEventListener('input', function() {
        if (document.activeElement === num) {
          sld.value = num.value;
          update(num.value);
        }
      });

      sld.addEventListener('input', function() {
        num.value = sld.value;
        update(sld.value);
      });
    }

    bindTransformProp('xgPosX', 'xgPosXSlider', 'x');
    bindTransformProp('xgPosY', 'xgPosYSlider', 'y');
    bindTransformProp('xgPosZ', 'xgPosZSlider', 'z');
    bindTransformProp('xgRotZ', 'xgRotZSlider', 'rotZ');
    bindTransformProp('xgRotX', 'xgRotXSlider', 'rotX');
    bindTransformProp('xgRotY', 'xgRotYSlider', 'rotY');
    bindTransformProp('xgScale', 'xgScaleSlider', 'scale');
    bindTransformProp('xgScaleX', 'xgScaleXSlider', 'scaleX');
    bindTransformProp('xgScaleY', 'xgScaleYSlider', 'scaleY');
    bindTransformProp('xgOpacity', 'xgOpacitySlider', 'opacity', true);

    // Dimensions & Fill
    var wInput = document.getElementById('xgWidth');
    if (wInput) wInput.addEventListener('input', function() {
      var layer = getActiveLayer();
      if (layer) { layer.width = parseFloat(wInput.value) || 200; renderFrame(state.currentTime); }
    });

    var hInput = document.getElementById('xgHeight');
    if (hInput) hInput.addEventListener('input', function() {
      var layer = getActiveLayer();
      if (layer) { layer.height = parseFloat(hInput.value) || 200; renderFrame(state.currentTime); }
    });

    var colorInput = document.getElementById('xgFillColor');
    if (colorInput) colorInput.addEventListener('input', function() {
      var layer = getActiveLayer();
      if (layer) { layer.color = colorInput.value; renderFrame(state.currentTime); }
    });

    var fillTypeSelect = document.getElementById('xgFillType');
    if (fillTypeSelect) fillTypeSelect.addEventListener('change', function() {
      var layer = getActiveLayer();
      if (layer) { layer.fillType = fillTypeSelect.value; renderFrame(state.currentTime); }
    });

    // Keyframe Toggle Buttons on Transform Controls
    document.querySelectorAll('.xg-kf-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var prop = btn.getAttribute('data-prop');
        var layer = getActiveLayer();
        if (layer && prop) {
          toggleKeyframeOnProperty(layer, prop, state.currentTime);
        }
      });
    });

    // Add Keyframe / Remove Keyframe Buttons on Transport
    var addKfBtn = document.getElementById('xmlglslAddKfBtn');
    if (addKfBtn) {
      addKfBtn.addEventListener('click', function() {
        var layer = getActiveLayer();
        if (layer) {
          toggleKeyframeOnProperty(layer, 'x', state.currentTime);
          toggleKeyframeOnProperty(layer, 'y', state.currentTime);
          toggleKeyframeOnProperty(layer, 'z', state.currentTime);
          toggleKeyframeOnProperty(layer, 'rotZ', state.currentTime);
        }
      });
    }

    // Jump Previous / Next Keyframe
    var prevKfBtn = document.getElementById('xmlglslPrevKfBtn');
    if (prevKfBtn) {
      prevKfBtn.addEventListener('click', function() {
        var layer = getActiveLayer();
        if (!layer) return;
        var allTimes = [];
        for (var p in layer.keyframes) {
          (layer.keyframes[p] || []).forEach(function(k) { allTimes.push(k.t); });
        }
        allTimes.sort(function(a, b) { return a - b; });
        var targetT = null;
        for (var i = allTimes.length - 1; i >= 0; i--) {
          if (allTimes[i] < state.currentTime - 0.02) { targetT = allTimes[i]; break; }
        }
        if (targetT !== null) {
          state.currentTime = targetT;
          syncTimelineUI();
          syncInputsFromState();
          renderFrame(state.currentTime);
        }
      });
    }

    var nextKfBtn = document.getElementById('xmlglslNextKfBtn');
    if (nextKfBtn) {
      nextKfBtn.addEventListener('click', function() {
        var layer = getActiveLayer();
        if (!layer) return;
        var allTimes = [];
        for (var p in layer.keyframes) {
          (layer.keyframes[p] || []).forEach(function(k) { allTimes.push(k.t); });
        }
        allTimes.sort(function(a, b) { return a - b; });
        var targetT = null;
        for (var i = 0; i < allTimes.length; i++) {
          if (allTimes[i] > state.currentTime + 0.02) { targetT = allTimes[i]; break; }
        }
        if (targetT !== null) {
          state.currentTime = targetT;
          syncTimelineUI();
          syncInputsFromState();
          renderFrame(state.currentTime);
        }
      });
    }

    // Effect Library Filtering & Add Action
    var effCategoryFilter = document.getElementById('xmlglslCategoryFilter');
    var effSearchInput = document.getElementById('xmlglslSearchEffect');
    var effSelect = document.getElementById('xmlglslEffectSelect');
    var addEffBtn = document.getElementById('xmlglslAddEffectBtn');

    if (effCategoryFilter) {
      effCategoryFilter.addEventListener('change', function() {
        populateEffectsLibrary(effCategoryFilter.value, effSearchInput ? effSearchInput.value : '');
      });
    }

    if (effSearchInput) {
      effSearchInput.addEventListener('input', function() {
        populateEffectsLibrary(effCategoryFilter ? effCategoryFilter.value : 'all', effSearchInput.value);
      });
    }

    if (addEffBtn && effSelect) {
      addEffBtn.addEventListener('click', function() {
        if (effSelect.value) {
          addEffectToActiveLayer(effSelect.value);
        }
      });
    }

    // Quick Add Effect Pills
    document.querySelectorAll('.xg-quick-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        var effId = pill.getAttribute('data-eff-id');
        if (effId) addEffectToActiveLayer(effId);
      });
    });

    // XML Export Button
    var exportBtn = document.getElementById('xmlglslExportXmlBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var xml = exportAlightMotionXml();
        var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'alight_motion_glsl_project.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // XML Import File Input
    var importInput = document.getElementById('xmlglslImportXmlInput');
    if (importInput) {
      importInput.addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(evt) {
          importAlightMotionXml(evt.target.result);
        };
        reader.readAsText(file);
      });
    }

    // Modal Close
    var modalClose = document.getElementById('xmlglslModalClose');
    var modal = document.getElementById('xmlglslCodeModal');
    if (modalClose && modal) {
      modalClose.addEventListener('click', function() {
        modal.classList.remove('visible');
      });
    }

    // Spacebar Play/Pause
    window.addEventListener('keydown', function(e) {
      var panel = document.getElementById('xmlglsl-panel');
      if (panel && panel.style.display !== 'none') {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          togglePlayback();
        }
      }
    });

    // Populate initial effect select dropdown
    populateEffectsLibrary('all', '');
  }

  // Studio Initialization Entrypoint
  function initXmlGlslStudio() {
    bindUI();
    syncInputsFromState();
    syncTimelineUI();
    renderEffectsStackUI();

    if (!glRes.animFrameId) {
      glRes.lastFrameTime = performance.now();
      glRes.animFrameId = requestAnimationFrame(playLoop);
    }
  }

  // Export module interface
  window.XmlGlslStudio = {
    state: state,
    M4: M4,
    init: initXmlGlslStudio,
    renderFrame: renderFrame,
    exportAlightMotionXml: exportAlightMotionXml,
    importAlightMotionXml: importAlightMotionXml,
    addEffectToActiveLayer: addEffectToActiveLayer
  };

  // Auto-init on DOMContentLoaded if active
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      var navBtn = document.getElementById('navTabXmlGlsl');
      if (navBtn && navBtn.classList.contains('active')) {
        initXmlGlslStudio();
      }
    });
  }

})(window, document);
