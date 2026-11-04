/**
 * Alight Motion Verified Effects Registry (192 Effects - Exact Specification)
 * Matches the official Alight Motion v5.0+ verified catalog across 12 categories:
 * Blur (20), Color & Light (32), Distortion & Warp (29), Procedural (24), 3D (20),
 * Move & Transform (15), Drawing & Edge (17), Matte, Mask & Key (7),
 * Opacity & Visibility (7), Repeat (7), Text (6), Other (8).
 */

(function () {
  'use strict';

  const VERIFIED_EFFECTS = [
    // =========================================================================
    // 1. BLUR — 20 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.boxblur3',
      name: 'Box Blur',
      category: 'Blur',
      desc: 'Blur layer by averaging surrounding texels.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.15, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'iterations', label: 'Iterations', type: 'spinner', default: 3, min: 1, max: 10, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.chromaticvortexblur',
      name: 'Chromatic Vortex Blur',
      category: 'Blur',
      desc: 'Rotational blur with color channel dispersion.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'dispersion', label: 'Dispersion', type: 'spinner', default: 0.1, min: 0.0, max: 0.5, step: 0.01 },
        { id: 'center', label: 'Center', type: 'point', default: [0.5, 0.5] }
      ]
    },
    {
      id: 'com.alightcreative.effects.chromaticzoomblur',
      name: 'Chromatic Zoom Blur',
      category: 'Blur',
      desc: 'Zoom blur with chromatic RGB splitting.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.25, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'split', label: 'Color Split', type: 'spinner', default: 0.08, min: 0.0, max: 0.3, step: 0.005 },
        { id: 'center', label: 'Center', type: 'point', default: [0.5, 0.5] }
      ]
    },
    {
      id: 'com.alightcreative.effects.directionalblur',
      name: 'Directional Blur',
      category: 'Blur',
      desc: 'Linear motion blur along a specified angle.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.15, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.gaussianblur',
      name: 'Gaussian Blur',
      category: 'Blur',
      desc: 'Smooth bell-curve Gaussian blur filter.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.innerblur',
      name: 'Inner Blur',
      category: 'Blur',
      desc: 'Blurs only the interior pixels of alpha silhouettes.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.1, min: 0.0, max: 0.5, step: 0.01 },
        { id: 'feather', label: 'Feather', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.lensblur2',
      name: 'Lens Blur',
      category: 'Blur',
      desc: 'Simulates camera lens bokeh depth of field.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'aspect', label: 'Aspect Ratio', type: 'spinner', default: 1.0, min: 0.5, max: 2.0, step: 0.05 },
        { id: 'brightness', label: 'Bokeh Brightness', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.linearstreaks',
      name: 'Linear Streaks',
      category: 'Blur',
      desc: 'Streaks pixels across linear ray traces.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'length', label: 'Length', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.maskblur',
      name: 'Mask Blur',
      category: 'Blur',
      desc: 'Softens edge boundaries according to layer mask.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.mosaic',
      name: 'Mosaic',
      category: 'Blur',
      desc: 'Pixelated mosaic block blur effect.',
      params: [
        { id: 'size', label: 'Block Size', type: 'spinner', default: 20.0, min: 2.0, max: 100.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.motionblur4',
      name: 'Motion Blur',
      category: 'Blur',
      desc: 'Dynamic velocity-based motion blur.',
      params: [
        { id: 'tune', label: 'Tune', type: 'spinner', default: 1.0, min: 0.0, max: 4.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.sharpen',
      name: 'Sharpen',
      category: 'Blur',
      desc: 'Enhances high-frequency edge contrast.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.5, min: 0.0, max: 2.0, step: 0.05 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 1.0, min: 0.5, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.spinblur2',
      name: 'Spin Blur',
      category: 'Blur',
      desc: 'Radial rotational spin blur around a center pivot.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 15.0, min: 0.0, max: 180.0, step: 1.0 },
        { id: 'center', label: 'Center', type: 'point', default: [0.5, 0.5] }
      ]
    },
    {
      id: 'com.alightcreative.effects.spinstreaks',
      name: 'Spin Streaks',
      category: 'Blur',
      desc: 'Spun radial streak rays.',
      params: [
        { id: 'count', label: 'Streaks Count', type: 'spinner', default: 8, min: 2, max: 32, step: 1 },
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.25, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.streakstrips',
      name: 'Streak Strips',
      category: 'Blur',
      desc: 'Segmented horizontal or vertical streak strips.',
      params: [
        { id: 'strips', label: 'Strips', type: 'spinner', default: 10, min: 2, max: 50, step: 1 },
        { id: 'shift', label: 'Shift', type: 'spinner', default: 0.1, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.swirlblur',
      name: 'Swirl Blur',
      category: 'Blur',
      desc: 'Vortical swirl combined with multi-tap blur.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.5, min: 0.1, max: 1.5, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.unsharpmask',
      name: 'Unsharp Mask',
      category: 'Blur',
      desc: 'High-contrast edge sharpening algorithm.',
      params: [
        { id: 'amount', label: 'Amount', type: 'spinner', default: 1.0, min: 0.0, max: 5.0, step: 0.1 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 2.0, min: 0.5, max: 10.0, step: 0.5 },
        { id: 'threshold', label: 'Threshold', type: 'spinner', default: 0.05, min: 0.0, max: 0.5, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.warpblur',
      name: 'Warp Blur',
      category: 'Blur',
      desc: 'Directional warp displacement blur.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'freq', label: 'Frequency', type: 'spinner', default: 2.0, min: 0.5, max: 10.0, step: 0.5 }
      ]
    },
    {
      id: 'com.alightcreative.effects.zoomblur3',
      name: 'Zoom Blur',
      category: 'Blur',
      desc: 'Radial zoom blur centered on focus point.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.15, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'center', label: 'Center', type: 'point', default: [0.5, 0.5] }
      ]
    },
    {
      id: 'com.alightcreative.effects.zoomstreaks',
      name: 'Zoom Streaks',
      category: 'Blur',
      desc: 'Long ray streaks radiating from focal center.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.35, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'rays', label: 'Ray Count', type: 'spinner', default: 16, min: 4, max: 64, step: 2 }
      ]
    },

    // =========================================================================
    // 2. COLOR & LIGHT — 32 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.brightcont2',
      name: 'Brightness / Contrast',
      category: 'Color & Light',
      desc: 'Adjust luminance and tonal contrast.',
      params: [
        { id: 'brightness', label: 'Brightness', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'contrast', label: 'Contrast', type: 'spinner', default: 0.0, min: -1.0, max: 2.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.bumpmap2',
      name: 'Bump Map',
      category: 'Color & Light',
      desc: 'Simulates embossed 3D surface relief.',
      params: [
        { id: 'height', label: 'Height', type: 'spinner', default: 0.1, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'angle', label: 'Light Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.cartoon',
      name: 'Cartoon',
      category: 'Color & Light',
      desc: 'Toon shading with quantized colors and black edges.',
      params: [
        { id: 'levels', label: 'Color Levels', type: 'spinner', default: 4, min: 2, max: 16, step: 1 },
        { id: 'edgeStrength', label: 'Edge Strength', type: 'spinner', default: 0.8, min: 0.0, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.colorbalance',
      name: 'Color Balance',
      category: 'Color & Light',
      desc: 'Fine-tune shadow, midtone, and highlight color balance.',
      params: [
        { id: 'red', label: 'Red / Cyan', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'green', label: 'Green / Magenta', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'blue', label: 'Blue / Yellow', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.colortemp',
      name: 'Color Temperature',
      category: 'Color & Light',
      desc: 'Warm or cool Kelvin temperature adjustment.',
      params: [
        { id: 'temp', label: 'Temperature (K)', type: 'spinner', default: 6500, min: 2000, max: 12000, step: 100 },
        { id: 'tint', label: 'Tint', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.colortune',
      name: 'Color Tune',
      category: 'Color & Light',
      desc: 'Targeted selective color tuning.',
      params: [
        { id: 'targetHue', label: 'Target Hue', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'shift', label: 'Shift Amount', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.colorize',
      name: 'Colorize',
      category: 'Color & Light',
      desc: 'Monochrome color tint overlay.',
      params: [
        { id: 'hue', label: 'Hue', type: 'spinner', default: 180.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.8, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.darkglow',
      name: 'Dark Glow',
      category: 'Color & Light',
      desc: 'Inverse vignette glow along darker boundaries.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'intensity', label: 'Intensity', type: 'spinner', default: 0.7, min: 0.0, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.exposure',
      name: 'Exposure / Gamma',
      category: 'Color & Light',
      desc: 'Photographic F-stop exposure and gamma curve.',
      params: [
        { id: 'exposure', label: 'Exposure', type: 'spinner', default: 0.0, min: -3.0, max: 3.0, step: 0.05 },
        { id: 'gamma', label: 'Gamma', type: 'spinner', default: 1.0, min: 0.2, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.fourcolorgradient',
      name: 'Four-color Gradient',
      category: 'Color & Light',
      desc: 'Smooth four-corner gradient wash.',
      params: [
        { id: 'c1', label: 'Color 1', type: 'color', default: '#ff4b4b' },
        { id: 'c2', label: 'Color 2', type: 'color', default: '#4b75ff' },
        { id: 'c3', label: 'Color 3', type: 'color', default: '#ffe24b' },
        { id: 'c4', label: 'Color 4', type: 'color', default: '#00d291' }
      ]
    },
    {
      id: 'com.alightcreative.effects.gradientmap',
      name: 'Gradient Map',
      category: 'Color & Light',
      desc: 'Remaps grayscale values to color ramp.',
      params: [
        { id: 'offset', label: 'Offset', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'blend', label: 'Blend', type: 'spinner', default: 1.0, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.gradientoverlay',
      name: 'Gradient Overlay',
      category: 'Color & Light',
      desc: 'Linear or radial gradient overlay layer.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 90.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'opacity', label: 'Opacity', type: 'spinner', default: 0.6, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.highlightsshadows',
      name: 'Highlights and Shadows',
      category: 'Color & Light',
      desc: 'Independent exposure control for shadows and highlights.',
      params: [
        { id: 'shadows', label: 'Shadows', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'highlights', label: 'Highlights', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hotcolor',
      name: 'Hot Color',
      category: 'Color & Light',
      desc: 'Saturates extreme highlights with high heat.',
      params: [
        { id: 'threshold', label: 'Threshold', type: 'spinner', default: 0.7, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'heat', label: 'Heat Strength', type: 'spinner', default: 1.2, min: 0.0, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hueshift',
      name: 'Hue Shift',
      category: 'Color & Light',
      desc: 'Rotates color hues around the HSV color wheel.',
      params: [
        { id: 'shift', label: 'Hue Degrees', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.invert',
      name: 'Invert',
      category: 'Color & Light',
      desc: 'Inverts RGB pixel values to photographic negative.',
      params: [
        { id: 'amount', label: 'Amount', type: 'spinner', default: 1.0, min: 0.0, max: 1.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.lightglow',
      name: 'Light Glow',
      category: 'Color & Light',
      desc: 'Soft diffuse glow for luminous areas.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.25, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'intensity', label: 'Intensity', type: 'spinner', default: 1.0, min: 0.0, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.longshadow',
      name: 'Long Shadow',
      category: 'Color & Light',
      desc: 'Extrudes flat graphic long drop shadow.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'length', label: 'Length', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'opacity', label: 'Shadow Alpha', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.palettemap',
      name: 'Palette Map',
      category: 'Color & Light',
      desc: 'Constrains colors to discrete retro palette steps.',
      params: [
        { id: 'palette', label: 'Preset', type: 'selector', default: 'retro', choices: ['retro', 'cyberpunk', 'sepia', 'neon'] }
      ]
    },
    {
      id: 'com.alightcreative.effects.posterize',
      name: 'Posterize',
      category: 'Color & Light',
      desc: 'Reduces color tonal steps for silkscreen look.',
      params: [
        { id: 'levels', label: 'Levels', type: 'spinner', default: 4, min: 2, max: 32, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.radialshadow',
      name: 'Radial Shadow',
      category: 'Color & Light',
      desc: 'Point light radial drop shadow projection.',
      params: [
        { id: 'lightPos', label: 'Light Position', type: 'point', default: [0.5, 0.2] },
        { id: 'length', label: 'Length', type: 'spinner', default: 0.4, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.rays',
      name: 'Rays',
      category: 'Color & Light',
      desc: 'Volumetric light rays and crepuscular beams.',
      params: [
        { id: 'origin', label: 'Origin', type: 'point', default: [0.5, 0.5] },
        { id: 'length', label: 'Ray Length', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'intensity', label: 'Intensity', type: 'spinner', default: 1.2, min: 0.0, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.replacecolor',
      name: 'Replace Color',
      category: 'Color & Light',
      desc: 'Replaces specific color range with new target tint.',
      params: [
        { id: 'fromColor', label: 'From Color', type: 'color', default: '#ff0000' },
        { id: 'toColor', label: 'To Color', type: 'color', default: '#00d291' },
        { id: 'tolerance', label: 'Tolerance', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.rgbgamma',
      name: 'RGB Gamma',
      category: 'Color & Light',
      desc: 'Per-channel red, green, blue gamma adjustment.',
      params: [
        { id: 'gammaR', label: 'Gamma R', type: 'spinner', default: 1.0, min: 0.2, max: 3.0, step: 0.05 },
        { id: 'gammaG', label: 'Gamma G', type: 'spinner', default: 1.0, min: 0.2, max: 3.0, step: 0.05 },
        { id: 'gammaB', label: 'Gamma B', type: 'spinner', default: 1.0, min: 0.2, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.rgbmixer',
      name: 'RGB Mixer',
      category: 'Color & Light',
      desc: 'Matrix channel mixer for full creative cross-talk.',
      params: [
        { id: 'mixR', label: 'Red Mix', type: 'spinner', default: 1.0, min: -2.0, max: 2.0, step: 0.05 },
        { id: 'mixG', label: 'Green Mix', type: 'spinner', default: 1.0, min: -2.0, max: 2.0, step: 0.05 },
        { id: 'mixB', label: 'Blue Mix', type: 'spinner', default: 1.0, min: -2.0, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.rgbsplit',
      name: 'RGB Split',
      category: 'Color & Light',
      desc: 'Horizontal and vertical chromatic channel separation.',
      params: [
        { id: 'distance', label: 'Distance', type: 'spinner', default: 0.02, min: 0.0, max: 0.2, step: 0.002 },
        { id: 'angle', label: 'Angle', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.satvib',
      name: 'Saturation / Vibrance',
      category: 'Color & Light',
      desc: 'Enhances or mutes color saturation and smart vibrance.',
      params: [
        { id: 'saturation', label: 'Saturation', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'vibrance', label: 'Vibrance', type: 'spinner', default: 1.0, min: 0.0, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.softglow',
      name: 'Soft Glow',
      category: 'Color & Light',
      desc: 'Dreamy soft bloom glow diffusion.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'brightness', label: 'Brightness', type: 'spinner', default: 0.4, min: 0.0, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.solidcolor',
      name: 'Solid Color',
      category: 'Color & Light',
      desc: 'Uniform solid color fill layer.',
      params: [
        { id: 'color', label: 'Color', type: 'color', default: '#00d291' },
        { id: 'alpha', label: 'Opacity', type: 'spinner', default: 1.0, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.spectralmap',
      name: 'Spectral Map',
      category: 'Color & Light',
      desc: 'Rainbow spectrum diffraction dispersion.',
      params: [
        { id: 'freq', label: 'Frequency', type: 'spinner', default: 1.5, min: 0.2, max: 5.0, step: 0.1 },
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.7, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.spotcolor',
      name: 'Spot Color',
      category: 'Color & Light',
      desc: 'Isolates single spot color while desaturating rest.',
      params: [
        { id: 'targetColor', label: 'Key Color', type: 'color', default: '#ff2020' },
        { id: 'tolerance', label: 'Tolerance', type: 'spinner', default: 0.25, min: 0.05, max: 0.8, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.threshold',
      name: 'Threshold',
      category: 'Color & Light',
      desc: 'Converts image into pure high-contrast black and white.',
      params: [
        { id: 'level', label: 'Threshold Level', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },

    // =========================================================================
    // 3. DISTORTION & WARP — 29 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.360-reorient-sphere',
      name: '360º Reorient Sphere',
      category: 'Distortion & Warp',
      desc: 'Spherical 360 equirectangular texture remapping.',
      params: [
        { id: 'rotateX', label: 'Pitch (X)', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'rotateY', label: 'Yaw (Y)', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'rotateZ', label: 'Roll (Z)', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.360viewer',
      name: '360º Viewer',
      category: 'Distortion & Warp',
      desc: 'Virtual camera viewport within panoramic 360 canvas.',
      params: [
        { id: 'fov', label: 'Field of View', type: 'spinner', default: 90.0, min: 30.0, max: 150.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.bendwarp',
      name: 'Bend',
      category: 'Distortion & Warp',
      desc: 'Curvature bend arc across cardinal origins.',
      params: [
        { id: 'amount', label: 'Angle', type: 'spinner', default: 45.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'offset', label: 'Origin Point', type: 'spinner', default: 0.0, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.circularripple2',
      name: 'Circular Ripple',
      category: 'Distortion & Warp',
      desc: 'Water droplet expanding ripple waves.',
      params: [
        { id: 'freq', label: 'Frequency', type: 'spinner', default: 5.0, min: 1.0, max: 20.0, step: 0.5 },
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.1, min: 0.0, max: 0.5, step: 0.01 },
        { id: 'phase', label: 'Phase', type: 'spinner', default: 0.0, min: 0.0, max: 10.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.curl',
      name: 'Curl',
      category: 'Distortion & Warp',
      desc: 'Spiraled curl distortion.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.5, min: 0.1, max: 2.0, step: 0.05 },
        { id: 'tightness', label: 'Tightness', type: 'spinner', default: 1.0, min: 0.1, max: 4.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.displacemap2',
      name: 'Displacement Map',
      category: 'Distortion & Warp',
      desc: 'Displaces pixels based on secondary luminance texture.',
      params: [
        { id: 'amountX', label: 'X Displacement', type: 'spinner', default: 0.05, min: -0.5, max: 0.5, step: 0.01 },
        { id: 'amountY', label: 'Y Displacement', type: 'spinner', default: 0.05, min: -0.5, max: 0.5, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.fractalwarp',
      name: 'Fractal Warp',
      category: 'Distortion & Warp',
      desc: 'Multiscale organic fractal distortion.',
      params: [
        { id: 'octaves', label: 'Octaves', type: 'spinner', default: 4, min: 1, max: 8, step: 1 },
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.15, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.glass2',
      name: 'Glass',
      category: 'Distortion & Warp',
      desc: 'Frosted glass refractive distortion.',
      params: [
        { id: 'refraction', label: 'Refraction', type: 'spinner', default: 0.1, min: 0.0, max: 0.5, step: 0.01 },
        { id: 'roughness', label: 'Roughness', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.gradientdisplacement',
      name: 'Gradient Displacement',
      category: 'Distortion & Warp',
      desc: 'Displaces along a linear gradient vector.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'amount', label: 'Amount', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hextilerotate',
      name: 'Hexagon Tile Rotate',
      category: 'Distortion & Warp',
      desc: 'Rotates individual hexagonal lattice cells.',
      params: [
        { id: 'size', label: 'Cell Size', type: 'spinner', default: 0.1, min: 0.02, max: 0.5, step: 0.01 },
        { id: 'angle', label: 'Tile Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hextileshift',
      name: 'Hexagon Tile Shift',
      category: 'Distortion & Warp',
      desc: 'Shifts hexagonal grid columns or rows.',
      params: [
        { id: 'size', label: 'Hex Size', type: 'spinner', default: 0.15, min: 0.05, max: 0.5, step: 0.01 },
        { id: 'shift', label: 'Offset Shift', type: 'spinner', default: 0.2, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hextiling',
      name: 'Hexagon Tiling',
      category: 'Distortion & Warp',
      desc: 'Honeycomb hexagonal tiling mosaic.',
      params: [
        { id: 'size', label: 'Grid Size', type: 'spinner', default: 0.1, min: 0.02, max: 0.5, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.pinchbulgeinside',
      name: 'Inner Pinch/Bulge',
      category: 'Distortion & Warp',
      desc: 'Inverted pinch and bulge within bounded radius.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: -0.5, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.4, min: 0.05, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.kaleidoscope',
      name: 'Kaleidoscope',
      category: 'Distortion & Warp',
      desc: 'Symmetric mirrored kaleidoscope sectors.',
      params: [
        { id: 'segments', label: 'Segments', type: 'spinner', default: 6, min: 2, max: 24, step: 1 },
        { id: 'rotation', label: 'Rotation', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.mirror',
      name: 'Mirror',
      category: 'Distortion & Warp',
      desc: 'Mirrors image across an adjustable axis.',
      params: [
        { id: 'angle', label: 'Axis Angle', type: 'spinner', default: 90.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'offset', label: 'Position', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.ominoglass',
      name: 'Omino Glass',
      category: 'Distortion & Warp',
      desc: 'Prismatic faceted glass refraction.',
      params: [
        { id: 'facets', label: 'Facets', type: 'spinner', default: 8, min: 3, max: 32, step: 1 },
        { id: 'dispersion', label: 'Dispersion', type: 'spinner', default: 0.15, min: 0.0, max: 0.5, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.pinchbulge2',
      name: 'Pinch/Bulge',
      category: 'Distortion & Warp',
      desc: 'Pinch or inflate sphere around center point.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.5, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.4, min: 0.05, max: 1.0, step: 0.02 },
        { id: 'center', label: 'Center', type: 'point', default: [0.5, 0.5] }
      ]
    },
    {
      id: 'com.alightcreative.effects.pixelate2',
      name: 'Pixelate',
      category: 'Distortion & Warp',
      desc: 'Pixel grid decimation filter.',
      params: [
        { id: 'size', label: 'Pixel Size', type: 'spinner', default: 16.0, min: 2.0, max: 120.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.polarcoordinates',
      name: 'Polar Coordinates',
      category: 'Distortion & Warp',
      desc: 'Transforms Cartesian coordinates to polar circular wrap.',
      params: [
        { id: 'mode', label: 'Mode', type: 'selector', default: 'rectToPolar', choices: ['rectToPolar', 'polarToRect'] }
      ]
    },
    {
      id: 'com.alightcreative.effects.displacemaprad',
      name: 'Polar Displacement Map',
      category: 'Distortion & Warp',
      desc: 'Displaces pixels in polar angle and radius.',
      params: [
        { id: 'angular', label: 'Angular Shift', type: 'spinner', default: 0.1, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'radial', label: 'Radial Shift', type: 'spinner', default: 0.1, min: -1.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.squeeze',
      name: 'Squeeze',
      category: 'Distortion & Warp',
      desc: 'Compresses or expands pixels along an axis.',
      params: [
        { id: 'amount', label: 'Amount', type: 'spinner', default: 0.3, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'angle', label: 'Angle', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.stretchsegment',
      name: 'Stretch Segment',
      category: 'Distortion & Warp',
      desc: 'Stretches a middle band of the frame.',
      params: [
        { id: 'start', label: 'Start Point', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'scale', label: 'Scale', type: 'spinner', default: 2.0, min: 0.5, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.swirl3',
      name: 'Swirl',
      category: 'Distortion & Warp',
      desc: 'Spins pixels into a whirlpool swirl.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 1.0, min: -5.0, max: 5.0, step: 0.1 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.45, min: 0.05, max: 1.5, step: 0.02 },
        { id: 'center', label: 'Center', type: 'point', default: [0.5, 0.5] }
      ]
    },
    {
      id: 'com.alightcreative.effects.tilerotate',
      name: 'Tile Rotate',
      category: 'Distortion & Warp',
      desc: 'Rotates repeating tile matrices.',
      params: [
        { id: 'count', label: 'Tiles Count', type: 'spinner', default: 3, min: 1, max: 12, step: 1 },
        { id: 'angle', label: 'Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.tileshift',
      name: 'Tile Shift',
      category: 'Distortion & Warp',
      desc: 'Offsets alternating tile rows.',
      params: [
        { id: 'tiles', label: 'Tiles', type: 'spinner', default: 4, min: 1, max: 16, step: 1 },
        { id: 'offset', label: 'Row Offset', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.tile',
      name: 'Tiles',
      category: 'Distortion & Warp',
      desc: 'Repeats layer across grid with optional mirror edges.',
      params: [
        { id: 'count', label: 'Count', type: 'spinner', default: 2.0, min: 1.0, max: 10.0, step: 0.1 },
        { id: 'mirror', label: 'Mirror Edges', type: 'switch', default: true }
      ]
    },
    {
      id: 'com.alightcreative.effects.turbulentdisplace',
      name: 'Turbulent Displace',
      category: 'Distortion & Warp',
      desc: 'Organic fluid turbulent displacement ripples.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.15, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'scale', label: 'Scale', type: 'spinner', default: 2.0, min: 0.2, max: 8.0, step: 0.1 },
        { id: 'evolution', label: 'Evolution', type: 'spinner', default: 0.0, min: 0.0, max: 20.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.vrcombined',
      name: 'VR Combined',
      category: 'Distortion & Warp',
      desc: 'VR panoramic stereo warp transformation.',
      params: [
        { id: 'ipd', label: 'Interpupillary Distance', type: 'spinner', default: 0.06, min: 0.0, max: 0.2, step: 0.005 }
      ]
    },
    {
      id: 'com.alightcreative.effects.wavewarp2',
      name: 'Wave Warp',
      category: 'Distortion & Warp',
      desc: 'Sine wave sinusoidal ripples across surface.',
      params: [
        { id: 'angle', label: 'Angle', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'wavelength', label: 'Wavelength', type: 'spinner', default: 0.2, min: 0.02, max: 1.0, step: 0.01 },
        { id: 'amplitude', label: 'Amplitude', type: 'spinner', default: 0.05, min: 0.0, max: 0.3, step: 0.005 },
        { id: 'phase', label: 'Phase', type: 'spinner', default: 0.0, min: 0.0, max: 10.0, step: 0.1 }
      ]
    },

    // =========================================================================
    // 4. PROCEDURAL — 24 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.blocknoise2',
      name: 'Block Noise',
      category: 'Procedural',
      desc: 'Glitch digital block noise generator.',
      params: [
        { id: 'scale', label: 'Block Scale', type: 'spinner', default: 0.08, min: 0.01, max: 0.5, step: 0.01 },
        { id: 'density', label: 'Density', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.checker2',
      name: 'Checker',
      category: 'Procedural',
      desc: 'Classic checkerboard pattern generator.',
      params: [
        { id: 'size', label: 'Tile Size', type: 'spinner', default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
        { id: 'color1', label: 'Color 1', type: 'color', default: '#ffffff' },
        { id: 'color2', label: 'Color 2', type: 'color', default: '#1a1a24' }
      ]
    },
    {
      id: 'com.alightcreative.effects.clouds3',
      name: 'Clouds',
      category: 'Procedural',
      desc: 'Procedural Perlin atmospheric cloud texture.',
      params: [
        { id: 'scale', label: 'Scale', type: 'spinner', default: 2.0, min: 0.5, max: 8.0, step: 0.1 },
        { id: 'contrast', label: 'Contrast', type: 'spinner', default: 1.2, min: 0.5, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.contourstrips',
      name: 'Contour Strips',
      category: 'Procedural',
      desc: 'Topographic contour line ridges.',
      params: [
        { id: 'frequency', label: 'Frequency', type: 'spinner', default: 10.0, min: 1.0, max: 40.0, step: 1.0 },
        { id: 'width', label: 'Line Width', type: 'spinner', default: 0.3, min: 0.05, max: 0.9, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.dots2',
      name: 'Dots',
      category: 'Procedural',
      desc: 'Halftone dot grid matrix.',
      params: [
        { id: 'spacing', label: 'Spacing', type: 'spinner', default: 0.05, min: 0.01, max: 0.2, step: 0.005 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.4, min: 0.05, max: 0.9, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.energybeam',
      name: 'Energy Beam',
      category: 'Procedural',
      desc: 'Luminous laser energy beam projection.',
      params: [
        { id: 'width', label: 'Beam Width', type: 'spinner', default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
        { id: 'color', label: 'Beam Color', type: 'color', default: '#00d291' }
      ]
    },
    {
      id: 'com.alightcreative.effects.fractalridges',
      name: 'Fractal Ridges',
      category: 'Procedural',
      desc: 'Sharp multi-fractal ridge noise.',
      params: [
        { id: 'octaves', label: 'Octaves', type: 'spinner', default: 4, min: 1, max: 8, step: 1 },
        { id: 'sharpness', label: 'Sharpness', type: 'spinner', default: 2.0, min: 1.0, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.grid2',
      name: 'Grid',
      category: 'Procedural',
      desc: 'Vector grid line array overlay.',
      params: [
        { id: 'spacing', label: 'Spacing', type: 'spinner', default: 0.1, min: 0.02, max: 0.5, step: 0.01 },
        { id: 'lineWidth', label: 'Line Width', type: 'spinner', default: 2.0, min: 0.5, max: 10.0, step: 0.5 },
        { id: 'color', label: 'Line Color', type: 'color', default: '#ffffff' }
      ]
    },
    {
      id: 'com.alightcreative.effects.grunge',
      name: 'Grunge',
      category: 'Procedural',
      desc: 'Dirty textured grunge distress patina.',
      params: [
        { id: 'intensity', label: 'Intensity', type: 'spinner', default: 0.6, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'scale', label: 'Scale', type: 'spinner', default: 1.5, min: 0.5, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hexagonarray',
      name: 'Hexagon Array',
      category: 'Procedural',
      desc: 'Hexagonal honeycomb lattice array.',
      params: [
        { id: 'size', label: 'Hex Size', type: 'spinner', default: 0.08, min: 0.02, max: 0.3, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.iridescence',
      name: 'Iridescence',
      category: 'Procedural',
      desc: 'Soap-bubble oil sheen iridescent reflections.',
      params: [
        { id: 'scale', label: 'Scale', type: 'spinner', default: 2.0, min: 0.5, max: 6.0, step: 0.1 },
        { id: 'blend', label: 'Blend', type: 'spinner', default: 0.8, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.lensflare',
      name: 'Lens Flare',
      category: 'Procedural',
      desc: 'Optical camera lens flare elements and halos.',
      params: [
        { id: 'lightPos', label: 'Source Pos', type: 'point', default: [0.3, 0.3] },
        { id: 'brightness', label: 'Brightness', type: 'spinner', default: 1.2, min: 0.2, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.lightning',
      name: 'Lightning',
      category: 'Procedural',
      desc: 'Electric lightning bolt branching discharge.',
      params: [
        { id: 'branches', label: 'Branches', type: 'spinner', default: 4, min: 1, max: 12, step: 1 },
        { id: 'glow', label: 'Glow Width', type: 'spinner', default: 0.1, min: 0.01, max: 0.4, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.noise',
      name: 'Noise',
      category: 'Procedural',
      desc: 'Analog film grain noise texture.',
      params: [
        { id: 'amount', label: 'Amount', type: 'spinner', default: 0.25, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'color', label: 'Colored Noise', type: 'switch', default: false }
      ]
    },
    {
      id: 'com.alightcreative.effects.ominodiffusion',
      name: 'Omino Diffusion+',
      category: 'Procedural',
      desc: 'Reaction-diffusion organic biologic patterns.',
      params: [
        { id: 'speed', label: 'Diffusion Speed', type: 'spinner', default: 1.0, min: 0.1, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.radialrays',
      name: 'Radial Rays',
      category: 'Procedural',
      desc: 'Radial burst sunray lines.',
      params: [
        { id: 'rays', label: 'Ray Count', type: 'spinner', default: 24, min: 4, max: 120, step: 2 },
        { id: 'angle', label: 'Rotation', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.ribbon',
      name: 'Ribbon',
      category: 'Procedural',
      desc: 'Wavy ribbon banners and flowing streamers.',
      params: [
        { id: 'width', label: 'Ribbon Width', type: 'spinner', default: 0.15, min: 0.02, max: 0.5, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.simplestarfield',
      name: 'Simple Starfield',
      category: 'Procedural',
      desc: 'Static deep space star points.',
      params: [
        { id: 'density', label: 'Density', type: 'spinner', default: 0.5, min: 0.05, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.star',
      name: 'Star',
      category: 'Procedural',
      desc: 'Parametric glowing star graphic.',
      params: [
        { id: 'points', label: 'Points', type: 'spinner', default: 5, min: 3, max: 16, step: 1 },
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.25, min: 0.05, max: 0.8, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.starfield',
      name: 'Starfield',
      category: 'Procedural',
      desc: '3D warp-speed traveling starfield flight.',
      params: [
        { id: 'speed', label: 'Travel Speed', type: 'spinner', default: 1.5, min: 0.1, max: 5.0, step: 0.1 },
        { id: 'stars', label: 'Star Count', type: 'spinner', default: 200, min: 50, max: 1000, step: 25 }
      ]
    },
    {
      id: 'com.alightcreative.effects.stripes',
      name: 'Stripes',
      category: 'Procedural',
      desc: 'Parallel zebra stripes at any angle.',
      params: [
        { id: 'count', label: 'Stripes Count', type: 'spinner', default: 12, min: 2, max: 80, step: 1 },
        { id: 'angle', label: 'Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'width', label: 'Stripe Width', type: 'spinner', default: 0.5, min: 0.05, max: 0.95, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.turbulence',
      name: 'Turbulence',
      category: 'Procedural',
      desc: 'Continuous fluid flow turbulence.',
      params: [
        { id: 'freq', label: 'Frequency', type: 'spinner', default: 2.0, min: 0.2, max: 8.0, step: 0.1 },
        { id: 'complexity', label: 'Complexity', type: 'spinner', default: 3, min: 1, max: 6, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.volumetricclouds',
      name: 'Volumetric Clouds',
      category: 'Procedural',
      desc: 'Multi-layer deep ray-marched clouds.',
      params: [
        { id: 'density', label: 'Density', type: 'spinner', default: 0.7, min: 0.1, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.voronoicells',
      name: 'Voronoi Cells',
      category: 'Procedural',
      desc: 'Cellular Voronoi crystal facets.',
      params: [
        { id: 'scale', label: 'Cell Scale', type: 'spinner', default: 8.0, min: 2.0, max: 30.0, step: 1.0 },
        { id: 'jitter', label: 'Jitter', type: 'spinner', default: 0.8, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },

    // =========================================================================
    // 5. 3D — 20 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.box',
      name: 'Box',
      category: '3D',
      desc: '3D textured cuboid mesh.',
      params: [
        { id: 'rotX', label: 'Rotate X', type: 'spinner', default: 25.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'rotY', label: 'Rotate Y', type: 'spinner', default: 35.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.cube2',
      name: 'Cube',
      category: '3D',
      desc: 'Rotating 3D six-sided textured cube.',
      params: [
        { id: 'size', label: 'Cube Size', type: 'spinner', default: 0.5, min: 0.1, max: 1.5, step: 0.05 },
        { id: 'rotX', label: 'Pitch', type: 'spinner', default: 30.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'rotY', label: 'Yaw', type: 'spinner', default: 45.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.cylinder',
      name: 'Cylinder',
      category: '3D',
      desc: 'Wraps layer around 3D cylindrical surface.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.4, min: 0.1, max: 1.2, step: 0.02 },
        { id: 'rotY', label: 'Rotation', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.ellipsoid',
      name: 'Ellipsoid',
      category: '3D',
      desc: '3D stretched oval ellipsoid projection.',
      params: [
        { id: 'scaleZ', label: 'Z Depth', type: 'spinner', default: 1.0, min: 0.2, max: 3.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.flip3',
      name: 'Flip Layer',
      category: '3D',
      desc: 'Rotates layer in 3D perspective around X or Y axis.',
      params: [
        { id: 'angle', label: 'Flip Angle', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 },
        { id: 'axis', label: 'Flip Axis', type: 'selector', default: 'horizontal', choices: ['horizontal', 'vertical'] }
      ]
    },
    {
      id: 'com.alightcreative.effects.heart3d',
      name: 'Heart',
      category: '3D',
      desc: 'Extruded 3D geometric heart.',
      params: [
        { id: 'depth', label: 'Depth', type: 'spinner', default: 0.3, min: 0.05, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hexagonalprism',
      name: 'Hexagonal Prism',
      category: '3D',
      desc: 'Six-sided prism polygon column.',
      params: [
        { id: 'depth', label: 'Depth', type: 'spinner', default: 0.4, min: 0.1, max: 1.5, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.hollowbox',
      name: 'Hollow Box',
      category: '3D',
      desc: 'Project 304 hollow camera cube container.',
      params: [
        { id: 'thickness', label: 'Wall Thickness', type: 'spinner', default: 0.1, min: 0.01, max: 0.4, step: 0.01 },
        { id: 'depth', label: 'Depth', type: 'spinner', default: 1.0, min: 0.2, max: 3.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.octahedron',
      name: 'Octahedron',
      category: '3D',
      desc: 'Eight-faced dual polyhedral crystal.',
      params: [
        { id: 'size', label: 'Size', type: 'spinner', default: 0.5, min: 0.1, max: 1.2, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.pagecurl',
      name: 'Page Curl',
      category: '3D',
      desc: '3D paper page peeling curl with realistic underside.',
      params: [
        { id: 'progress', label: 'Curl Progress', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'angle', label: 'Curl Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.pyramid',
      name: 'Pyramid',
      category: '3D',
      desc: 'Four-sided 3D pyramid volume.',
      params: [
        { id: 'height', label: 'Height', type: 'spinner', default: 0.8, min: 0.2, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.rasterextrude',
      name: 'Raster Extrude',
      category: '3D',
      desc: 'Extrudes 2D silhouette into 3D isometric block.',
      params: [
        { id: 'depth', label: 'Extrude Depth', type: 'spinner', default: 20.0, min: 2.0, max: 100.0, step: 1.0 },
        { id: 'angle', label: 'Extrude Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.ring3d',
      name: 'Ring',
      category: '3D',
      desc: '3D annular ring mesh.',
      params: [
        { id: 'innerRadius', label: 'Inner Radius', type: 'spinner', default: 0.3, min: 0.1, max: 0.8, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.spherize',
      name: 'Spherize',
      category: '3D',
      desc: 'Pushes planar graphics onto a 3D hemisphere.',
      params: [
        { id: 'strength', label: 'Strength', type: 'spinner', default: 0.6, min: -1.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.starpolyhedron',
      name: 'Star Polyhedron',
      category: '3D',
      desc: 'Stellated polyhedral star crystal.',
      params: [
        { id: 'stellation', label: 'Stellation', type: 'spinner', default: 1.5, min: 0.5, max: 3.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.starprism',
      name: 'Star Prism',
      category: '3D',
      desc: 'Extruded star shape column.',
      params: [
        { id: 'points', label: 'Points', type: 'spinner', default: 5, min: 3, max: 12, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.threeaxiscross',
      name: 'Three-axis Cross',
      category: '3D',
      desc: '3D coordinate cross planes intersecting.',
      params: [
        { id: 'armLength', label: 'Arm Length', type: 'spinner', default: 0.5, min: 0.1, max: 1.5, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.torus',
      name: 'Torus',
      category: '3D',
      desc: '3D doughnut torus ring geometry.',
      params: [
        { id: 'majorR', label: 'Major Radius', type: 'spinner', default: 0.4, min: 0.1, max: 1.0, step: 0.02 },
        { id: 'minorR', label: 'Tube Radius', type: 'spinner', default: 0.1, min: 0.02, max: 0.3, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.triangularprism',
      name: 'Triangular Prism',
      category: '3D',
      desc: 'Three-sided prism triangular extrusion.',
      params: [
        { id: 'depth', label: 'Depth', type: 'spinner', default: 0.5, min: 0.1, max: 1.5, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.tunnel',
      name: 'Tunnel',
      category: '3D',
      desc: 'Infinite 3D tube flythrough camera tunnel.',
      params: [
        { id: 'speed', label: 'Fly Speed', type: 'spinner', default: 1.0, min: 0.1, max: 5.0, step: 0.1 },
        { id: 'turns', label: 'Twist', type: 'spinner', default: 0.5, min: 0.0, max: 3.0, step: 0.1 }
      ]
    },

    // =========================================================================
    // 6. MOVE & TRANSFORM — 15 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.autoshake',
      name: 'Auto-Shake',
      category: 'Move & Transform',
      desc: 'Procedural continuous handheld camera shake.',
      params: [
        { id: 'magnitude', label: 'Magnitude', type: 'spinner', default: 15.0, min: 1.0, max: 100.0, step: 1.0 },
        { id: 'freq', label: 'Frequency', type: 'spinner', default: 4.0, min: 0.5, max: 20.0, step: 0.5 }
      ]
    },
    {
      id: 'com.alightcreative.effects.growparts',
      name: 'Grow Parts',
      category: 'Move & Transform',
      desc: 'Animates growth of layer segmented quadrants.',
      params: [
        { id: 'grow', label: 'Growth', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.morphpath',
      name: 'Morph Path',
      category: 'Move & Transform',
      desc: 'Smooth interpolation between vector path contours.',
      params: [
        { id: 'morph', label: 'Morph State', type: 'spinner', default: 0.0, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.movealongpath',
      name: 'Move Along Path',
      category: 'Move & Transform',
      desc: 'Animates layer anchor along custom spline path.',
      params: [
        { id: 'distance', label: 'Path Progress', type: 'spinner', default: 0.0, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.offset',
      name: 'Offset',
      category: 'Move & Transform',
      desc: 'Pixel translation offset with seamless edge wrap.',
      params: [
        { id: 'x', label: 'Offset X', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 },
        { id: 'y', label: 'Offset Y', type: 'spinner', default: 0.0, min: -1.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.oscillate',
      name: 'Oscillate',
      category: 'Move & Transform',
      desc: 'Sine wave position or angle oscillation.',
      params: [
        { id: 'freq', label: 'Frequency (Hz)', type: 'spinner', default: 2.0, min: 0.1, max: 10.0, step: 0.1 },
        { id: 'magnitude', label: 'Magnitude', type: 'spinner', default: 30.0, min: 0.0, max: 200.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.pulsesize',
      name: 'Pulse Size',
      category: 'Move & Transform',
      desc: 'Heartbeat scale rhythm pulse.',
      params: [
        { id: 'speed', label: 'Pulse Speed', type: 'spinner', default: 2.0, min: 0.5, max: 10.0, step: 0.2 },
        { id: 'scale', label: 'Peak Scale', type: 'spinner', default: 1.25, min: 1.0, max: 2.5, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.randomdisplacement',
      name: 'Random Displacement',
      category: 'Move & Transform',
      desc: 'Randomized jitter displacement along axes.',
      params: [
        { id: 'amount', label: 'Amount', type: 'spinner', default: 20.0, min: 0.0, max: 100.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.randomjitter',
      name: 'Random Jitter',
      category: 'Move & Transform',
      desc: 'Rapid high-frequency twitch jitter.',
      params: [
        { id: 'jitter', label: 'Jitter Strength', type: 'spinner', default: 10.0, min: 0.0, max: 50.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.rastertransform',
      name: 'Raster Transform',
      category: 'Move & Transform',
      desc: 'Transforms pixel raster buffer with GPU filtering.',
      params: [
        { id: 'scale', label: 'Scale', type: 'spinner', default: 1.0, min: 0.1, max: 4.0, step: 0.05 },
        { id: 'rot', label: 'Rotation', type: 'spinner', default: 0.0, min: -180.0, max: 180.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.scaleassist',
      name: 'Scale Assist',
      category: 'Move & Transform',
      desc: 'Maintains pixel aspect ratios across resizing.',
      params: [
        { id: 'ratio', label: 'Aspect Lock', type: 'switch', default: true }
      ]
    },
    {
      id: 'com.alightcreative.effects.shakeparts',
      name: 'Shake Parts',
      category: 'Move & Transform',
      desc: 'Independently shakes separate parts of silhouette.',
      params: [
        { id: 'intensity', label: 'Shake Intensity', type: 'spinner', default: 1.0, min: 0.1, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.spin',
      name: 'Spin',
      category: 'Move & Transform',
      desc: 'Continuous 360 degree rotational spin.',
      params: [
        { id: 'rpm', label: 'Revolutions / Sec', type: 'spinner', default: 1.0, min: -10.0, max: 10.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.stretchaxis',
      name: 'Stretch Axis',
      category: 'Move & Transform',
      desc: 'Non-uniform stretch along arbitrary rotated angle.',
      params: [
        { id: 'scale', label: 'Stretch Scale', type: 'spinner', default: 1.5, min: 0.2, max: 5.0, step: 0.05 },
        { id: 'angle', label: 'Axis Angle', type: 'spinner', default: 0.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.swing',
      name: 'Swing',
      category: 'Move & Transform',
      desc: 'Pendulum swinging arc around an anchor pivot.',
      params: [
        { id: 'angle', label: 'Swing Arc', type: 'spinner', default: 20.0, min: 1.0, max: 90.0, step: 1.0 },
        { id: 'freq', label: 'Frequency', type: 'spinner', default: 1.5, min: 0.2, max: 6.0, step: 0.1 }
      ]
    },

    // =========================================================================
    // 7. DRAWING & EDGE — 17 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.halftonedotscmyk',
      name: 'CMYK Halftone Dots',
      category: 'Drawing & Edge',
      desc: 'Print press CMYK rosette screen angle halftone.',
      params: [
        { id: 'dotSize', label: 'Dot Size', type: 'spinner', default: 12.0, min: 2.0, max: 50.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.contourgradient',
      name: 'Contour Gradient',
      category: 'Drawing & Edge',
      desc: 'Gradient fill along boundary edge contours.',
      params: [
        { id: 'width', label: 'Width', type: 'spinner', default: 0.2, min: 0.02, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.contourlines',
      name: 'Contour Lines',
      category: 'Drawing & Edge',
      desc: 'Thin line strokes tracing luminance contours.',
      params: [
        { id: 'spacing', label: 'Spacing', type: 'spinner', default: 0.08, min: 0.01, max: 0.3, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.drawingprogress',
      name: 'Drawing Progress',
      category: 'Drawing & Edge',
      desc: 'Animates vector outline being drawn with pen stroke.',
      params: [
        { id: 'progress', label: 'Stroke Progress', type: 'spinner', default: 1.0, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.edgeglow',
      name: 'Edge Glow',
      category: 'Drawing & Edge',
      desc: 'High-intensity neon luminescence on boundary edges.',
      params: [
        { id: 'radius', label: 'Glow Radius', type: 'spinner', default: 0.2, min: 0.01, max: 0.8, step: 0.01 },
        { id: 'color', label: 'Glow Color', type: 'color', default: '#00e5a3' }
      ]
    },
    {
      id: 'com.alightcreative.effects.electricedges',
      name: 'Electric Edges',
      category: 'Drawing & Edge',
      desc: 'Crackling electric spark discharge along outlines.',
      params: [
        { id: 'intensity', label: 'Discharge', type: 'spinner', default: 1.2, min: 0.2, max: 4.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.findedges',
      name: 'Find Edges',
      category: 'Drawing & Edge',
      desc: 'Sobel operator boundary edge extraction.',
      params: [
        { id: 'invert', label: 'Invert', type: 'switch', default: false },
        { id: 'threshold', label: 'Threshold', type: 'spinner', default: 0.1, min: 0.0, max: 0.8, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.glow',
      name: 'Glow',
      category: 'Drawing & Edge',
      desc: 'Standard Alight Motion diffuse glow filter.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.25, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'color', label: 'Color', type: 'color', default: '#ffffff' },
        { id: 'alpha', label: 'Alpha', type: 'spinner', default: 0.8, min: 0.0, max: 2.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.glowscan',
      name: 'Glow Scan',
      category: 'Drawing & Edge',
      desc: 'Sweeps glowing highlight scan beam across contours.',
      params: [
        { id: 'position', label: 'Scan Pos', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'width', label: 'Beam Width', type: 'spinner', default: 0.15, min: 0.02, max: 0.5, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.halftonedots',
      name: 'Halftone Dots',
      category: 'Drawing & Edge',
      desc: 'Monochrome halftone dot raster screen.',
      params: [
        { id: 'size', label: 'Dot Size', type: 'spinner', default: 10.0, min: 2.0, max: 60.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.halftonelines',
      name: 'Halftone Lines',
      category: 'Drawing & Edge',
      desc: 'Engraving linocut halftone lines.',
      params: [
        { id: 'lines', label: 'Line Density', type: 'spinner', default: 40, min: 5, max: 120, step: 2 },
        { id: 'angle', label: 'Angle', type: 'spinner', default: 45.0, min: 0.0, max: 360.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.innerglow',
      name: 'Inner Glow',
      category: 'Drawing & Edge',
      desc: 'Glow diffusion directed toward layer interior.',
      params: [
        { id: 'radius', label: 'Radius', type: 'spinner', default: 0.2, min: 0.01, max: 0.6, step: 0.01 },
        { id: 'color', label: 'Color', type: 'color', default: '#ffe24b' }
      ]
    },
    {
      id: 'com.alightcreative.effects.roughenedges',
      name: 'Roughen Edges',
      category: 'Drawing & Edge',
      desc: 'Perlin noise erosion for ragged torn-paper edges.',
      params: [
        { id: 'roughness', label: 'Roughness', type: 'spinner', default: 0.3, min: 0.0, max: 1.0, step: 0.02 },
        { id: 'scale', label: 'Noise Scale', type: 'spinner', default: 3.0, min: 0.5, max: 10.0, step: 0.2 }
      ]
    },
    {
      id: 'com.alightcreative.effects.smoothbevel',
      name: 'Smooth Bevel',
      category: 'Drawing & Edge',
      desc: 'Rounded 3D bevel and emboss highlight edge.',
      params: [
        { id: 'depth', label: 'Depth', type: 'spinner', default: 5.0, min: 1.0, max: 25.0, step: 0.5 }
      ]
    },
    {
      id: 'com.alightcreative.effects.smoothedges',
      name: 'Smooth Edges',
      category: 'Drawing & Edge',
      desc: 'Anti-aliased boundary softening.',
      params: [
        { id: 'feather', label: 'Feather Width', type: 'spinner', default: 2.0, min: 0.5, max: 10.0, step: 0.5 }
      ]
    },
    {
      id: 'com.alightcreative.effects.strokecolor',
      name: 'Stroke Color',
      category: 'Drawing & Edge',
      desc: 'Adds outer or center stroke outline with tint.',
      params: [
        { id: 'width', label: 'Width', type: 'spinner', default: 4.0, min: 0.5, max: 30.0, step: 0.5 },
        { id: 'color', label: 'Stroke Color', type: 'color', default: '#000000' }
      ]
    },
    {
      id: 'com.alightcreative.effects.stroketaper',
      name: 'Stroke Taper',
      category: 'Drawing & Edge',
      desc: 'Tapers stroke thickness at start and end points.',
      params: [
        { id: 'startTaper', label: 'Start Taper', type: 'spinner', default: 0.2, min: 0.0, max: 0.5, step: 0.02 },
        { id: 'endTaper', label: 'End Taper', type: 'spinner', default: 0.2, min: 0.0, max: 0.5, step: 0.02 }
      ]
    },

    // =========================================================================
    // 8. MATTE, MASK & KEY — 7 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.chromakey-adv',
      name: 'Advanced Chroma Key',
      category: 'Matte, Mask & Key',
      desc: 'Multi-point spill suppression and shadow chroma keyer.',
      params: [
        { id: 'keyColor', label: 'Key Color', type: 'color', default: '#00ff00' },
        { id: 'threshold', label: 'Threshold', type: 'spinner', default: 0.4, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'spill', label: 'Spill Suppression', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.chromakey',
      name: 'Chroma Key',
      category: 'Matte, Mask & Key',
      desc: 'Removes green or blue background screen color.',
      params: [
        { id: 'keyColor', label: 'Key Color', type: 'color', default: '#00ff00' },
        { id: 'threshold', label: 'Threshold', type: 'spinner', default: 0.35, min: 0.05, max: 0.9, step: 0.01 },
        { id: 'feather', label: 'Feather', type: 'spinner', default: 0.05, min: 0.0, max: 0.3, step: 0.005 }
      ]
    },
    {
      id: 'com.alightcreative.effects.lumakey',
      name: 'Luma Key',
      category: 'Matte, Mask & Key',
      desc: 'Keys out pixels based on high or low luminance.',
      params: [
        { id: 'cutoff', label: 'Cutoff', type: 'spinner', default: 0.1, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'feather', label: 'Feather', type: 'spinner', default: 0.05, min: 0.0, max: 0.3, step: 0.005 }
      ]
    },
    {
      id: 'com.alightcreative.effects.mattechoker',
      name: 'Matte Choker',
      category: 'Matte, Mask & Key',
      desc: 'Erodes or dilates alpha matte boundary edges.',
      params: [
        { id: 'choke', label: 'Choke Amount', type: 'spinner', default: 0.0, min: -20.0, max: 20.0, step: 0.5 }
      ]
    },
    {
      id: 'com.alightcreative.effects.solidmatte',
      name: 'Solid Matte',
      category: 'Matte, Mask & Key',
      desc: 'Generates silhouette matte fill from alpha transparency.',
      params: [
        { id: 'color', label: 'Matte Color', type: 'color', default: '#ffffff' }
      ]
    },
    {
      id: 'com.alightcreative.effects.vignette',
      name: 'Vignette',
      category: 'Matte, Mask & Key',
      desc: 'Classic lens vignette shading falloff.',
      params: [
        { id: 'size', label: 'Vignette Size', type: 'spinner', default: 0.7, min: 0.1, max: 1.5, step: 0.02 },
        { id: 'roundness', label: 'Roundness', type: 'spinner', default: 1.0, min: 0.2, max: 2.0, step: 0.05 },
        { id: 'feather', label: 'Feather', type: 'spinner', default: 0.5, min: 0.05, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.wipe2',
      name: 'Wipe',
      category: 'Matte, Mask & Key',
      desc: 'Linear angle directional transition wipe.',
      params: [
        { id: 'start', label: 'Start Point', type: 'spinner', default: 0.0, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'end', label: 'End Point', type: 'spinner', default: 1.0, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'angle', label: 'Angle', type: 'spinner', default: 90.0, min: 0.0, max: 360.0, step: 1.0 },
        { id: 'feather', label: 'Feather', type: 'spinner', default: 0.0, min: 0.0, max: 0.5, step: 0.01 }
      ]
    },

    // =========================================================================
    // 9. OPACITY & VISIBILITY — 7 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.blink',
      name: 'Blink',
      category: 'Opacity & Visibility',
      desc: 'Stroboscopic blinking visibility flash.',
      params: [
        { id: 'freq', label: 'Frequency (Hz)', type: 'spinner', default: 4.0, min: 0.5, max: 24.0, step: 0.5 }
      ]
    },
    {
      id: 'com.alightcreative.effects.blockdissolve',
      name: 'Block Dissolve',
      category: 'Opacity & Visibility',
      desc: 'Pixelated block mosaic transition dissolve.',
      params: [
        { id: 'amount', label: 'Dissolve', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'blockSize', label: 'Block Size', type: 'spinner', default: 20.0, min: 4.0, max: 80.0, step: 2.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.dissolve',
      name: 'Dissolve',
      category: 'Opacity & Visibility',
      desc: 'Random noise dither transition dissolve.',
      params: [
        { id: 'amount', label: 'Amount', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.fadeinout',
      name: 'Fade In/Out',
      category: 'Opacity & Visibility',
      desc: 'Automatic head and tail alpha opacity ramps.',
      params: [
        { id: 'inDuration', label: 'In Duration (s)', type: 'spinner', default: 0.5, min: 0.0, max: 3.0, step: 0.05 },
        { id: 'outDuration', label: 'Out Duration (s)', type: 'spinner', default: 0.5, min: 0.0, max: 3.0, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.feather',
      name: 'Feather',
      category: 'Opacity & Visibility',
      desc: 'Softens and blurs outer alpha transparency edges.',
      params: [
        { id: 'strength', label: 'Feather Strength', type: 'spinner', default: 0.15, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.flicker',
      name: 'Flicker',
      category: 'Opacity & Visibility',
      desc: 'Random lightbulb flicker in opacity.',
      params: [
        { id: 'speed', label: 'Flicker Speed', type: 'spinner', default: 8.0, min: 1.0, max: 30.0, step: 1.0 },
        { id: 'magnitude', label: 'Magnitude', type: 'spinner', default: 0.4, min: 0.0, max: 1.0, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.pulseopacity',
      name: 'Pulse Opacity',
      category: 'Opacity & Visibility',
      desc: 'Smooth periodic sine wave opacity modulation.',
      params: [
        { id: 'speed', label: 'Pulse Speed', type: 'spinner', default: 2.0, min: 0.2, max: 8.0, step: 0.1 },
        { id: 'minAlpha', label: 'Min Opacity', type: 'spinner', default: 0.2, min: 0.0, max: 0.9, step: 0.05 }
      ]
    },

    // =========================================================================
    // 10. REPEAT — 7 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.repeat.grid',
      name: 'Grid Repeat',
      category: 'Repeat',
      desc: 'Repeats layer across 2D grid matrix with cell spacing.',
      params: [
        { id: 'rows', label: 'Rows', type: 'spinner', default: 3, min: 1, max: 12, step: 1 },
        { id: 'cols', label: 'Columns', type: 'spinner', default: 3, min: 1, max: 12, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.linearrepeat',
      name: 'Linear Repeat',
      category: 'Repeat',
      desc: 'Clones layer along linear translation vector.',
      params: [
        { id: 'copies', label: 'Copies', type: 'spinner', default: 4, min: 1, max: 20, step: 1 },
        { id: 'spacing', label: 'Spacing', type: 'spinner', default: 50.0, min: 5.0, max: 300.0, step: 5.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.radialrepeat',
      name: 'Radial Repeat',
      category: 'Repeat',
      desc: 'Arranges repeating clones in a circular ring.',
      params: [
        { id: 'count', label: 'Clone Count', type: 'spinner', default: 6, min: 2, max: 32, step: 1 },
        { id: 'radius', label: 'Ring Radius', type: 'spinner', default: 120.0, min: 20.0, max: 500.0, step: 5.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.repeat',
      name: 'Repeat',
      category: 'Repeat',
      desc: 'Standard layer clone multiplier.',
      params: [
        { id: 'count', label: 'Count', type: 'spinner', default: 3, min: 1, max: 15, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.repeatalongpath',
      name: 'Repeat Along Path',
      category: 'Repeat',
      desc: 'Evenly distributes clones along motion spline.',
      params: [
        { id: 'copies', label: 'Copies', type: 'spinner', default: 5, min: 2, max: 25, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.scatterfield',
      name: 'Scatter Field',
      category: 'Repeat',
      desc: 'Randomly scatters clone particles across surface.',
      params: [
        { id: 'density', label: 'Density', type: 'spinner', default: 20, min: 5, max: 100, step: 5 },
        { id: 'seed', label: 'Random Seed', type: 'spinner', default: 1, min: 1, max: 999, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.scatterrepeat',
      name: 'Scatter Repeat',
      category: 'Repeat',
      desc: 'Duplicated clones with random scale and rotation variance.',
      params: [
        { id: 'count', label: 'Count', type: 'spinner', default: 8, min: 2, max: 40, step: 1 },
        { id: 'rotJitter', label: 'Rot Jitter', type: 'spinner', default: 45.0, min: 0.0, max: 180.0, step: 5.0 }
      ]
    },

    // =========================================================================
    // 11. TEXT — 6 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.countupdown',
      name: 'Count Up/Down',
      category: 'Text',
      desc: 'Animated digital number ticker from start to end value.',
      params: [
        { id: 'startVal', label: 'Start Value', type: 'spinner', default: 0, min: 0, max: 100000, step: 1 },
        { id: 'endVal', label: 'End Value', type: 'spinner', default: 100, min: 0, max: 100000, step: 1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.textprogress',
      name: 'Text Progress',
      category: 'Text',
      desc: 'Typewriter text reveal per character or word.',
      params: [
        { id: 'progress', label: 'Reveal %', type: 'spinner', default: 1.0, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'cursor', label: 'Show Cursor', type: 'switch', default: true }
      ]
    },
    {
      id: 'com.alightcreative.effects.textrandomizer',
      name: 'Text Randomizer',
      category: 'Text',
      desc: 'Decryption glyph random character scrambling reveal.',
      params: [
        { id: 'scramble', label: 'Scramble %', type: 'spinner', default: 0.5, min: 0.0, max: 1.0, step: 0.01 }
      ]
    },
    {
      id: 'com.alightcreative.effects.textspacing',
      name: 'Text Spacing',
      category: 'Text',
      desc: 'Animated letter kerning and line spacing tracking.',
      params: [
        { id: 'letterSpacing', label: 'Letter Spacing', type: 'spinner', default: 0.0, min: -20.0, max: 80.0, step: 1.0 },
        { id: 'lineSpacing', label: 'Line Spacing', type: 'spinner', default: 1.2, min: 0.5, max: 3.0, step: 0.1 }
      ]
    },
    {
      id: 'com.alightcreative.effects.texttransform',
      name: 'Text Transform',
      category: 'Text',
      desc: 'Per-character offset, wave motion, and scale transforms.',
      params: [
        { id: 'offsetWave', label: 'Wave Height', type: 'spinner', default: 10.0, min: 0.0, max: 60.0, step: 1.0 }
      ]
    },
    {
      id: 'com.alightcreative.effects.timecode',
      name: 'Timecode',
      category: 'Text',
      desc: 'Live SMPTE format running timecode display.',
      params: [
        { id: 'format', label: 'Format', type: 'selector', default: 'HH:MM:SS:FF', choices: ['HH:MM:SS:FF', 'MM:SS', 'Frames'] }
      ]
    },

    // =========================================================================
    // 12. OTHER — 8 Effects
    // =========================================================================
    {
      id: 'com.alightcreative.effects.channelremaphsv',
      name: 'Channel Remap (HSV)',
      category: 'Other',
      desc: 'Rebinds Hue, Saturation, Value channel destinations.',
      params: [
        { id: 'hSource', label: 'Hue Source', type: 'selector', default: 'h', choices: ['h', 's', 'v', '1', '0'] },
        { id: 'sSource', label: 'Sat Source', type: 'selector', default: 's', choices: ['s', 'h', 'v', '1', '0'] },
        { id: 'vSource', label: 'Val Source', type: 'selector', default: 'v', choices: ['v', 'h', 's', '1', '0'] }
      ]
    },
    {
      id: 'com.alightcreative.effects.channelremaprgb',
      name: 'Channel Remap (RGB)',
      category: 'Other',
      desc: 'Reassigns Red, Green, Blue, Alpha channel routings.',
      params: [
        { id: 'r', label: 'R ->', type: 'selector', default: 'r', choices: ['r', 'g', 'b', 'a', '0', '1'] },
        { id: 'g', label: 'G ->', type: 'selector', default: 'g', choices: ['r', 'g', 'b', 'a', '0', '1'] },
        { id: 'b', label: 'B ->', type: 'selector', default: 'b', choices: ['r', 'g', 'b', 'a', '0', '1'] }
      ]
    },
    {
      id: 'com.alightcreative.effects.copybackground',
      name: 'Copy Background',
      category: 'Other',
      desc: 'Captures layers beneath into a sampleable background texture.',
      params: [
        { id: 'active', label: 'Active', type: 'switch', default: true }
      ]
    },
    {
      id: 'com.alightcreative.effects.echokeyframes',
      name: 'Echo Keyframes',
      category: 'Other',
      desc: 'Time-delayed ghostly trail echo repetitions.',
      params: [
        { id: 'echoes', label: 'Echo Count', type: 'spinner', default: 3, min: 1, max: 10, step: 1 },
        { id: 'decay', label: 'Decay Factor', type: 'spinner', default: 0.5, min: 0.1, max: 0.95, step: 0.05 }
      ]
    },
    {
      id: 'com.alightcreative.effects.fillbehind',
      name: 'Fill Behind',
      category: 'Other',
      desc: 'Paints backdrop color behind transparent layer boundary.',
      params: [
        { id: 'color', label: 'Backdrop Color', type: 'color', default: '#000000' }
      ]
    },
    {
      id: 'com.alightcreative.effects.magnifybackground',
      name: 'Magnify Background',
      category: 'Other',
      desc: 'Magnifies and lenses underlying composition background.',
      params: [
        { id: 'zoom', label: 'Magnification', type: 'spinner', default: 2.0, min: 1.0, max: 5.0, step: 0.1 },
        { id: 'radius', label: 'Lens Radius', type: 'spinner', default: 0.35, min: 0.05, max: 0.8, step: 0.02 }
      ]
    },
    {
      id: 'com.alightcreative.effects.parentinghelper',
      name: 'Parenting Helper',
      category: 'Other',
      desc: 'Hierarchical joint parenting coordinate constraint helper.',
      params: [
        { id: 'inheritScale', label: 'Inherit Scale', type: 'switch', default: true },
        { id: 'inheritRot', label: 'Inherit Rotation', type: 'switch', default: true }
      ]
    },
    {
      id: 'com.alightcreative.effects.timequantization',
      name: 'Time Quantization',
      category: 'Other',
      desc: 'Simulates stepped retro stop-motion framerates (e.g. 12fps).',
      params: [
        { id: 'fps', label: 'Target FPS', type: 'spinner', default: 12.0, min: 1.0, max: 30.0, step: 1.0 }
      ]
    }
  ];

  var root = (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
  root.AM_VERIFIED_EFFECTS = VERIFIED_EFFECTS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AM_VERIFIED_EFFECTS };
  }
})();
