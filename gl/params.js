import * as fxs from "./fxs.js";
const themeNames = ["neon_hole", "holy", "virtual_flux", "index", "fountain"];
const simulations = ["single_attractor", "twin_attractor", "mouse_spawner"];
const texParticleConfigs = [
    { name: "leaves_atlas_02_512_2x2", cols: 2, rows: 2 },
    { name: "seeds_atlas_512_5x2", cols: 5, rows: 2 },
];
const particles = [
    "sticky_starlight", "circle", "square", "circle_and_square", "droplet", "uvDebug",
    ...texParticleConfigs.map(cfg => `tex_${cfg.name}`),
];
const blend_modes = ["alpha_mask", "alpha_blend", "additive"];
const interactions = ["random_walk", "on_click", "follow_mouse"];

let getThemeData = () => { };
let setThemeData = (data) => { };
let currentLayer = 0;

// ── global (non-serialized) ───────────────────────────────────────────────────
let maxParticlesPerLayer = fxs.isMobile ? 1024 : 4096;

function getMaxParticlesPerLayer() {
    return maxParticlesPerLayer;
}

function getParams() {
    const themeData = getThemeData();
    return themeData.layers[currentLayer];
}

function setParams(params) {
    getThemeData().layers[currentLayer] = params;
}

// ── undo ──────────────────────────────────────────────────────────────────────

const undoHistory = [];
const MAX_UNDO = 50;
let isUndoing = false;

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function snapshotBeforeEdit() {
    if (isUndoing) return;
    const themeData = getThemeData();
    if (!themeData?.layers) return;
    undoHistory.push({ themeData: deepClone(themeData), currentLayer });
    if (undoHistory.length > MAX_UNDO) undoHistory.shift();
    updateLayerControls();
}

function undo() {
    if (undoHistory.length === 0) return;
    isUndoing = true;
    const snapshot = undoHistory.pop();
    currentLayer = snapshot.currentLayer;
    setThemeDataAndUpdateUi(snapshot.themeData);
    isUndoing = false;
    updateLayerControls();
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        undo();
    }
});

// ── label helpers ─────────────────────────────────────────────────────────────

function formatLabel(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
}

function toTitleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function sectionTitle(key, getJson) {
    const label = toTitleCase(formatLabel(key));
    if (key === 'bloom') return 'FX: Bloom';
    if (key === getJson()['simulation']) return 'Simulation: ' + label;
    if (key === getJson()['particle']) return 'Particle: ' + label;
    return label;
}

// ── tooltips ──────────────────────────────────────────────────────────────────

let tooltipEl = null;
let tooltipShowTimer = null;
const TOOLTIP_DELAY_MS = 250;

function ensureTooltipEl() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'param-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipEl);
    return tooltipEl;
}

function positionTooltip(anchor) {
    const el = tooltipEl;
    el.style.left = '0px';
    el.style.top = '0px';
    const a = anchor.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const margin = 8;
    let left = a.left - t.width - margin;
    if (left < margin) left = Math.min(a.right + margin, window.innerWidth - t.width - margin);
    let top = a.top + (a.height - t.height) / 2;
    top = Math.max(margin, Math.min(top, window.innerHeight - t.height - margin));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
}

function showTooltipFor(anchor, text) {
    const el = ensureTooltipEl();
    el.textContent = text;
    el.classList.add('param-tooltip--visible');
    positionTooltip(anchor);
}

function hideTooltip() {
    clearTimeout(tooltipShowTimer);
    tooltipShowTimer = null;
    if (tooltipEl) tooltipEl.classList.remove('param-tooltip--visible');
}

function attachTooltip(anchor, text) {
    if (!text) return;
    anchor.dataset.tooltip = text;
    anchor.addEventListener('mouseenter', () => {
        clearTimeout(tooltipShowTimer);
        tooltipShowTimer = setTimeout(() => showTooltipFor(anchor, text), TOOLTIP_DELAY_MS);
    });
    anchor.addEventListener('mouseleave', hideTooltip);
    anchor.addEventListener('mousedown', hideTooltip);
}

// ── parameter classes ─────────────────────────────────────────────────────────

class NumParameter {
    constructor(options) {
        this.min = options.min;
        this.max = options.max;
        this.value = options.value;
        this.step = options.step || 0.001;
        this.onChanged = options.onChanged || null;
        this.description = options.description || '';
    }

    addToUi(getJson, key, paramDiv) {
        paramDiv.className = 'param-row';
        if (this.description) attachTooltip(paramDiv, this.description);

        const label = document.createElement('div');
        label.className = 'param-label';
        label.textContent = formatLabel(key);
        paramDiv.appendChild(label);

        const controls = document.createElement('div');
        controls.className = 'param-controls';
        paramDiv.appendChild(controls);

        const slider = document.createElement('input');
        controls.appendChild(slider);

        const numInputBox = document.createElement('input');
        controls.appendChild(numInputBox);

        const reset = document.createElement('button');
        controls.appendChild(reset);

        slider.type = 'range';
        slider.className = 'param-slider';
        slider.min = this.min;
        slider.max = this.max;
        slider.step = this.step;
        slider.value = getJson()[key];
        slider.addEventListener('mousedown', snapshotBeforeEdit);
        slider.addEventListener('touchstart', snapshotBeforeEdit, { passive: true });
        slider.oninput = () => {
            getJson()[key] = slider.value;
            numInputBox.value = slider.value;
            if (this.onChanged) this.onChanged(slider.value);
        };

        numInputBox.type = 'number';
        numInputBox.className = 'param-number';
        numInputBox.value = getJson()[key];
        numInputBox.addEventListener('focus', snapshotBeforeEdit);
        numInputBox.oninput = () => {
            getJson()[key] = numInputBox.value;
            slider.value = numInputBox.value;
            if (this.onChanged) this.onChanged(numInputBox.value);
        };

        const defaultValue = getJson()[key];
        reset.className = 'param-reset';
        reset.title = 'Reset';
        reset.innerHTML = '<i class="fas fa-undo"></i>';
        reset.onclick = () => {
            snapshotBeforeEdit();
            numInputBox.value = defaultValue;
            slider.value = defaultValue;
            getJson()[key] = defaultValue;
            if (this.onChanged) this.onChanged(defaultValue);
        };
    }
}

class StringParameter {
    constructor(options) {
        this.values = options.values;
        this.index = options.index;
        this.forceRefresh = options.forceRefresh || false;
        this.onChanged = options.onChanged || null;
        this.description = options.description || '';
    }

    addToUi(getJson, key, paramDiv) {
        paramDiv.className = 'param-row';
        if (this.description) attachTooltip(paramDiv, this.description);

        const label = document.createElement('div');
        label.className = 'param-label';
        label.textContent = formatLabel(key);
        paramDiv.appendChild(label);

        const controls = document.createElement('div');
        controls.className = 'param-controls';
        paramDiv.appendChild(controls);

        const select = document.createElement('select');
        select.className = 'param-select';
        controls.appendChild(select);

        for (let optionText of this.values) {
            let option = document.createElement("option");
            option.value = optionText;
            option.text = optionText;
            select.appendChild(option);
        }
        select.value = getJson()[key];
        select.onchange = () => {
            snapshotBeforeEdit();
            getJson()[key] = select.value;
            if (this.onChanged) this.onChanged(select.value);
            if (this.forceRefresh) {
                cleanupUi();
                initializeUiFromParams();
            }
        };

        const reset = document.createElement('button');
        reset.className = 'param-reset';
        reset.title = 'Reset';
        reset.innerHTML = '<i class="fas fa-undo"></i>';
        controls.appendChild(reset);

        const defaultValue = getJson()[key];
        reset.onclick = () => {
            snapshotBeforeEdit();
            getJson()[key] = defaultValue;
            select.value = defaultValue;
            if (this.onChanged) this.onChanged(defaultValue);
            if (this.forceRefresh) {
                cleanupUi();
                initializeUiFromParams();
            }
        };
    }
}

// ── parameter definitions ─────────────────────────────────────────────────────

const descriptions = {
    simulation: "Which physics drives the particles in this layer.",
    particle: "Visual shape used to draw each particle.",
    alignment: "Particle orientation: 'standard' is fixed, 'velocity' rotates each particle to face its movement direction.",
    blend_mode: "How overlapping particles compose: alpha_mask is opaque, alpha_blend is standard transparency, additive accumulates light (good for glow).",
    interaction: "Source of the interaction point: follow_mouse tracks the cursor live, on_click only updates while pressed, random_walk drifts on its own.",
    randomWalkSpeed: "Speed at which the interaction point drifts when 'random_walk' is selected.",
    numParticles: "Number of particles in this layer (capped by max particles per layer).",
    particleHeight: "Vertical size of each particle, as a fraction of the screen height.",
    particleAspectRatio: "Particle width-to-height ratio (1 = square).",
    sideThreshold: "Distance from screen center where the border policy kicks in. Smaller values confine particles to a smaller central area.",
    interactionStartX: "Initial horizontal position of the interaction point at startup, in normalized [0..1] coordinates.",
    interactionStartY: "Initial vertical position of the interaction point at startup, in normalized [0..1] coordinates.",
    timeDialation: "Simulation speed multiplier: 0 pauses, 1 is real-time, higher accelerates time.",
    borderPolicy: "What happens when particles cross the side threshold: 'wrap' teleports them to the opposite edge, 'bounce' reflects them.",
    // forces
    attractToTwin: "Strength and sign of the force pulling each particle toward its randomly paired twin. Negative values repel.",
    attractToTwinPower: "Falloff exponent of the twin force with distance — higher values make the force more localised.",
    attractTwinByVelocity: "Modulates the twin force by the twin's velocity, blending steady and chaotic dynamics.",
    attractToTouch: "Strength and sign of the force pulling particles toward the interaction point. Negative values repel.",
    attractToTouchPower: "Falloff exponent of the interaction force with distance — higher values make the force more localised.",
    twinChangePeriod: "How often (in seconds) each particle is re-paired with a new random twin.",
    maxForce: "Hard cap on per-frame acceleration magnitude — prevents runaway speeds.",
    dragCoef: "Velocity-squared drag — slows fast-moving particles.",
    noizForce: "Amount of random per-frame noise injected into particle motion.",
    pulseCoef: "Strength of an oscillating pulse force applied along each particle's id-based direction.",
    pulseFreq: "Frequency of the pulse oscillation.",
    sideForce: "Inward push applied at the side threshold (bounce mode only).",
    hardSide: "Bounce hardness: 0 is a soft cushion, 1 is a fully rigid wall.",
    touchObstacleRadius: "If non-zero, the interaction point becomes a circular obstacle of this radius that particles cannot enter.",
    touchObstacleRepulsion: "How strongly particles are flung outward when escaping the obstacle.",
    // mouse spawner
    burstPercentage: "Average fraction of the particle pool that should be alive at once (1 keeps every slot active).",
    burstInterval: "Time between successive emission bursts.",
    lifetimeMin: "Minimum particle lifetime — each spawn picks a random duration in [min, max].",
    lifetimeMax: "Maximum particle lifetime — each spawn picks a random duration in [min, max].",
    spawnSpeedMin: "Minimum initial speed for newly spawned particles.",
    spawnSpeedMax: "Maximum initial speed for newly spawned particles.",
    // coloring
    hueVariation: "Per-particle random hue spread around the base tint.",
    hueSpeed: "Speed at which the global hue oscillates over time.",
    tint: "Base hue [0..1] (HSV color wheel position).",
    tintVariation: "Range over which the base hue oscillates over time.",
    saturation: "Average color saturation.",
    saturationVariation: "Per-particle random saturation spread.",
    lightness: "Average color lightness.",
    lightnessVariation: "Per-particle random lightness spread.",
    thickness: "Outline thickness of the particle's SDF shape.",
    falloff: "Softness of the outline edge: 0 is hard, 1 is fully feathered.",
    blinkSpeedMin: "Minimum per-particle blink speed.",
    blinkSpeedMax: "Maximum per-particle blink speed.",
    radiusPulseFreq: "Frequency of the per-particle radius pulsation.",
    radiusPulsePercentage: "How small the radius gets at the bottom of the pulse: 0 collapses to a point, 1 disables the pulse.",
    // droplet
    radius_1: "Radius of the larger circle of the droplet (uneven capsule shape).",
    radius_2: "Radius of the smaller circle of the droplet.",
    height: "Distance between the two droplet centers (length of the body).",
    // tex particle
    texSaturation: "Texture color saturation: 0 grayscales the texture, 1 keeps original colors.",
    tintAmount: "Mix between the original texture color (0) and the per-particle generated tint (1).",
    brightness: "Multiplier on the texture output brightness.",
    // bloom
    numPasses: "Number of separable blur passes — more passes produce a wider, softer glow.",
    amount: "How much bloom is mixed into the final image.",
    radius: "Blur radius (in pixels) of each pass.",
    strength: "Number of taps per blur pass — affects quality and softness of the blur kernel.",
};

// Per-particle 'threshold' is an alpha discard cutoff; bloom 'threshold' is a brightness cutoff.
// Disambiguate by passing distinct strings explicitly where relevant.
const ALPHA_CUTOFF_DESC = "Alpha cutoff — pixels below this are discarded entirely.";
const BLOOM_THRESHOLD_DESC = "Brightness cutoff — only pixels above this contribute to the bloom.";

const paramInitializer = {

    simulation: new StringParameter({ values: simulations, index: 0, forceRefresh: true, description: descriptions.simulation }),
    particle: new StringParameter({ values: particles, index: 0, forceRefresh: true, description: descriptions.particle }),
    alignment: new StringParameter({ values: ["standard", "velocity"], index: 0, description: descriptions.alignment }),
    blend_mode: new StringParameter({ values: blend_modes, index: 0, description: descriptions.blend_mode }),
    interaction: new StringParameter({ values: interactions, index: 0, description: descriptions.interaction }),
    randomWalkSpeed: new NumParameter({ min: 0, max: .1, value: 0, step: 0.000001, description: descriptions.randomWalkSpeed }),
    numParticles: new NumParameter({ min: 1, max: 4096, value: 4096, step: 1, description: descriptions.numParticles }),
    particleHeight: new NumParameter({ min: .01, max: .2, value: 0.05, step: 0.001, description: descriptions.particleHeight }),
    particleAspectRatio: new NumParameter({ min: .1, max: 10, value: 1, description: descriptions.particleAspectRatio }),
    sideThreshold: new NumParameter({ min: .1, max: 10, value: 1, description: descriptions.sideThreshold }),
    interactionStartX: new NumParameter({ min: 0, max: 1, value: .5, description: descriptions.interactionStartX }),
    interactionStartY: new NumParameter({ min: 0, max: 1, value: 0, description: descriptions.interactionStartY }),
    timeDialation: new NumParameter({ min: 0, max: 100, value: 1, onChanged: (value) => { fxs.setTimeDialationCoef(value); }, description: descriptions.timeDialation }),
    borderPolicy: new StringParameter({ values: ["wrap", "bounce"], index: 0, description: descriptions.borderPolicy }),

    twin_attractor: {
        attractToTwin: new NumParameter({ min: -1, max: 1, value: -0.005, description: descriptions.attractToTwin }),
        attractToTwinPower: new NumParameter({ min: .2, max: 16, value: 4.0, description: descriptions.attractToTwinPower }),
        attractTwinByVelocity: new NumParameter({ min: 0.0, max: 1, value: 0.0, description: descriptions.attractTwinByVelocity }),
        attractToTouch: new NumParameter({ min: -.1, max: .1, value: 0.0, description: descriptions.attractToTouch }),
        attractToTouchPower: new NumParameter({ min: .2, max: 16, value: 4.0, description: descriptions.attractToTouchPower }),
        twinChangePeriod: new NumParameter({ min: 0, max: 100, value: 4.0, description: descriptions.twinChangePeriod }),
        maxForce: new NumParameter({ min: .05, max: 1, value: 0.25, description: descriptions.maxForce }),
        dragCoef: new NumParameter({ min: .0, max: 4, value: 1, description: descriptions.dragCoef }),
        noizForce: new NumParameter({ min: .0, max: 4, value: .8, description: descriptions.noizForce }),
        pulseCoef: new NumParameter({ min: .001, max: 4, value: .1, description: descriptions.pulseCoef }),
        pulseFreq: new NumParameter({ min: .001, max: 4, value: .1, description: descriptions.pulseFreq }),
        sideForce: new NumParameter({ min: .01, max: 4, value: 1.5, description: descriptions.sideForce }),
        hardSide: new NumParameter({ min: .001, max: 4, value: .05, description: descriptions.hardSide }),
        touchObstacleRadius: new NumParameter({ min: 0.0, max: 1.0, value: 0.0, description: descriptions.touchObstacleRadius }),
        touchObstacleRepulsion: new NumParameter({ min: 0.0, max: 200.0, value: 80.0, description: descriptions.touchObstacleRepulsion }),
    },
    single_attractor: {
        attractToTouch: new NumParameter({ min: -.1, max: .1, value: 0.005, description: descriptions.attractToTouch }),
        attractToTouchPower: new NumParameter({ min: .2, max: 16, value: 4.0, description: descriptions.attractToTouchPower }),
        maxForce: new NumParameter({ min: .05, max: 1, value: 0.25, description: descriptions.maxForce }),
        dragCoef: new NumParameter({ min: .0, max: 4, value: 1, description: descriptions.dragCoef }),
        noizForce: new NumParameter({ min: .0, max: 4, value: .8, description: descriptions.noizForce }),
        pulseCoef: new NumParameter({ min: .001, max: 4, value: .1, description: descriptions.pulseCoef }),
        pulseFreq: new NumParameter({ min: .001, max: 4, value: .1, description: descriptions.pulseFreq }),
        sideForce: new NumParameter({ min: .01, max: 4, value: 1.5, description: descriptions.sideForce }),
        hardSide: new NumParameter({ min: .001, max: 4, value: .05, description: descriptions.hardSide }),
        touchObstacleRadius: new NumParameter({ min: 0.0, max: 1.0, value: 0.0, description: descriptions.touchObstacleRadius }),
        touchObstacleRepulsion: new NumParameter({ min: 0.0, max: 50.0, value: 10.0, description: descriptions.touchObstacleRepulsion }),
    },
    mouse_spawner: {
        burstPercentage: new NumParameter({ min: 0.0, max: 1.0, value: 1.0, description: descriptions.burstPercentage }),
        burstInterval: new NumParameter({ min: 0.005, max: 5, value: 0.05, description: descriptions.burstInterval }),
        lifetimeMin: new NumParameter({ min: 0.05, max: 30, value: 1.0, description: descriptions.lifetimeMin }),
        lifetimeMax: new NumParameter({ min: 0.05, max: 30, value: 3.0, description: descriptions.lifetimeMax }),
        spawnSpeedMin: new NumParameter({ min: 0.0, max: 4, value: 0.1, description: descriptions.spawnSpeedMin }),
        spawnSpeedMax: new NumParameter({ min: 0.0, max: 4, value: 0.4, description: descriptions.spawnSpeedMax }),
        attractToTouch: new NumParameter({ min: -.1, max: .1, value: 0.0, description: descriptions.attractToTouch }),
        attractToTouchPower: new NumParameter({ min: .2, max: 16, value: 4.0, description: descriptions.attractToTouchPower }),
        maxForce: new NumParameter({ min: .05, max: 1, value: 0.25, description: descriptions.maxForce }),
        dragCoef: new NumParameter({ min: .0, max: 4, value: 1, description: descriptions.dragCoef }),
        noizForce: new NumParameter({ min: .0, max: 4, value: .8, description: descriptions.noizForce }),
        pulseCoef: new NumParameter({ min: .001, max: 4, value: .1, description: descriptions.pulseCoef }),
        pulseFreq: new NumParameter({ min: .001, max: 4, value: .1, description: descriptions.pulseFreq }),
        sideForce: new NumParameter({ min: .01, max: 4, value: 1.5, description: descriptions.sideForce }),
        hardSide: new NumParameter({ min: .001, max: 4, value: .05, description: descriptions.hardSide }),
        touchObstacleRadius: new NumParameter({ min: 0.0, max: 1.0, value: 0.0, description: descriptions.touchObstacleRadius }),
        touchObstacleRepulsion: new NumParameter({ min: 0.0, max: 50.0, value: 10.0, description: descriptions.touchObstacleRepulsion }),
    },

    sticky_starlight: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025, description: descriptions.hueVariation }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05, description: descriptions.hueSpeed }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0, description: descriptions.tint }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0, description: descriptions.tintVariation }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45, description: descriptions.saturation }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25, description: descriptions.saturationVariation }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0, description: descriptions.lightness }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0, description: descriptions.lightnessVariation }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1, description: descriptions.thickness }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5, description: descriptions.falloff }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1, description: ALPHA_CUTOFF_DESC }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4, description: descriptions.blinkSpeedMin }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10, description: descriptions.blinkSpeedMax }),
    },

    droplet: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025, description: descriptions.hueVariation }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05, description: descriptions.hueSpeed }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0, description: descriptions.tint }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0, description: descriptions.tintVariation }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45, description: descriptions.saturation }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25, description: descriptions.saturationVariation }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0, description: descriptions.lightness }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0, description: descriptions.lightnessVariation }),
        thickness: new NumParameter({ min: 0, max: 1, value: .122, description: descriptions.thickness }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5, description: descriptions.falloff }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1, description: ALPHA_CUTOFF_DESC }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4, description: descriptions.blinkSpeedMin }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10, description: descriptions.blinkSpeedMax }),
        radius_1: new NumParameter({ min: 0.001, max: 1, value: .333, description: descriptions.radius_1 }),
        radius_2: new NumParameter({ min: 0.001, max: 1, value: .133, description: descriptions.radius_2 }),
        height: new NumParameter({ min: 0.01, max: 1, value: .85, description: descriptions.height }),
    },

    circle: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025, description: descriptions.hueVariation }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05, description: descriptions.hueSpeed }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0, description: descriptions.tint }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0, description: descriptions.tintVariation }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45, description: descriptions.saturation }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25, description: descriptions.saturationVariation }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0, description: descriptions.lightness }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0, description: descriptions.lightnessVariation }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1, description: descriptions.thickness }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5, description: descriptions.falloff }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1, description: ALPHA_CUTOFF_DESC }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4, description: descriptions.blinkSpeedMin }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10, description: descriptions.blinkSpeedMax }),
        radiusPulseFreq: new NumParameter({ min: 0, max: 10, value: .2, description: descriptions.radiusPulseFreq }),
        radiusPulsePercentage: new NumParameter({ min: 0.001, max: 1, value: .3, description: descriptions.radiusPulsePercentage }),
    },

    square: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025, description: descriptions.hueVariation }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05, description: descriptions.hueSpeed }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0, description: descriptions.tint }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0, description: descriptions.tintVariation }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45, description: descriptions.saturation }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25, description: descriptions.saturationVariation }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0, description: descriptions.lightness }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0, description: descriptions.lightnessVariation }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1, description: descriptions.thickness }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5, description: descriptions.falloff }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1, description: ALPHA_CUTOFF_DESC }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4, description: descriptions.blinkSpeedMin }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10, description: descriptions.blinkSpeedMax }),
        radiusPulseFreq: new NumParameter({ min: 0, max: 10, value: .2, description: descriptions.radiusPulseFreq }),
        radiusPulsePercentage: new NumParameter({ min: 0.001, max: 1, value: .3, description: descriptions.radiusPulsePercentage }),
    },

    circle_and_square: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025, description: descriptions.hueVariation }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05, description: descriptions.hueSpeed }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0, description: descriptions.tint }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0, description: descriptions.tintVariation }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45, description: descriptions.saturation }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25, description: descriptions.saturationVariation }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0, description: descriptions.lightness }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0, description: descriptions.lightnessVariation }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1, description: descriptions.thickness }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5, description: descriptions.falloff }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1, description: ALPHA_CUTOFF_DESC }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4, description: descriptions.blinkSpeedMin }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10, description: descriptions.blinkSpeedMax }),
        radiusPulseFreq: new NumParameter({ min: 0, max: 10, value: .2, description: descriptions.radiusPulseFreq }),
        radiusPulsePercentage: new NumParameter({ min: 0.001, max: 1, value: .3, description: descriptions.radiusPulsePercentage }),
    },

    bloom: {
        numPasses: new NumParameter({ min: 0, max: 16, value: 4, step: 1, description: descriptions.numPasses }),
        amount: new NumParameter({ min: 0., max: 8, value: 1.8, description: descriptions.amount }),
        threshold: new NumParameter({ min: 0., max: 1, value: 0.7, description: BLOOM_THRESHOLD_DESC }),
        radius: new NumParameter({ min: 0., max: 4, value: 4, description: descriptions.radius }),
        strength: new NumParameter({ min: .1, max: 50, value: 20, description: descriptions.strength }),
    },

    ...Object.fromEntries(texParticleConfigs.map(cfg => [`tex_${cfg.name}`, {
        hueVariation: new NumParameter({ min: 0, max: 1, value: 0.025, description: descriptions.hueVariation }),
        hueSpeed: new NumParameter({ min: 0, max: 1, value: 0.05, description: descriptions.hueSpeed }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0, description: descriptions.tint }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0, description: descriptions.tintVariation }),
        saturation: new NumParameter({ min: 0, max: 1, value: 0.45, description: descriptions.saturation }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: 0.25, description: descriptions.saturationVariation }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4, description: descriptions.blinkSpeedMin }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10, description: descriptions.blinkSpeedMax }),
        texSaturation: new NumParameter({ min: 0, max: 1, value: 1, description: descriptions.texSaturation }),
        tintAmount: new NumParameter({ min: 0, max: 1, value: 0, description: descriptions.tintAmount }),
        brightness: new NumParameter({ min: 0, max: 5, value: 1, description: descriptions.brightness }),
        threshold: new NumParameter({ min: 0, max: 1, value: 0.05, step: 0.001, description: ALPHA_CUTOFF_DESC }),
    }])),
};

// ── param object initialisation ───────────────────────────────────────────────

function initParamObj(paramInit) {
    let obj = {};
    for (let key in paramInit) {
        if (paramInit[key] instanceof NumParameter) {
            obj[key] = paramInit[key].value;
        } else if (paramInit[key] instanceof StringParameter) {
            obj[key] = paramInit[key].values[paramInit[key].index];
        } else if (typeof paramInit[key] === "boolean") {
            obj[key] = paramInit[key];
        } else if (paramInit[key] instanceof Object) {
            obj[key] = initParamObj(paramInit[key]);
        }
    }
    return obj;
}

// ── UI ────────────────────────────────────────────────────────────────────────

const paramsContainer = document.getElementById('params');
let themeSelect;
let currentThemeName = themeNames[0];

function cleanupUi() {
    while (paramsContainer.firstChild) {
        paramsContainer.removeChild(paramsContainer.lastChild);
    }
}

function makeGroup(title, container) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'param-group';
    container.appendChild(groupDiv);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'param-section';
    titleDiv.textContent = title;
    groupDiv.appendChild(titleDiv);

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'param-group__body';
    groupDiv.appendChild(bodyDiv);

    return bodyDiv;
}

function addParamsToUi(getJson, getInit, container = paramsContainer) {
    const isTopLevel = container === paramsContainer;
    const flatContainer = isTopLevel
        ? makeGroup('Main Settings', container)
        : container;

    for (let key in getInit()) {
        const init = getInit()[key];
        if (typeof init === "boolean") {
            const jsonValue = getJson()[key] || init;
            getJson()[key] = getJson()[key] || jsonValue;

            const paramDiv = document.createElement('div');
            paramDiv.className = 'param-row';

            const label = document.createElement('div');
            label.className = 'param-label';
            label.textContent = formatLabel(key);
            paramDiv.appendChild(label);

            const controls = document.createElement('div');
            controls.className = 'param-controls';
            paramDiv.appendChild(controls);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'param-checkbox';
            checkbox.checked = getJson()[key];
            checkbox.onchange = () => {
                snapshotBeforeEdit();
                getJson()[key] = checkbox.checked;
            };
            controls.appendChild(checkbox);

            const reset = document.createElement('button');
            reset.className = 'param-reset';
            reset.title = 'Reset';
            reset.innerHTML = '<i class="fas fa-undo"></i>';
            reset.onclick = () => {
                snapshotBeforeEdit();
                checkbox.checked = jsonValue;
                getJson()[key] = jsonValue;
            };
            controls.appendChild(reset);

            flatContainer.appendChild(paramDiv);
        }
        else if (init.addToUi) {
            const paramDiv = document.createElement('div');
            flatContainer.appendChild(paramDiv);
            init.addToUi(getJson, key, paramDiv);
        }
        else if (getInit()[key] instanceof Object) {
            let skip = true;
            if (key == 'bloom' || key == getJson()["particle"] || key == getJson()["simulation"])
                skip = false;
            if (skip)
                continue;

            const bodyDiv = makeGroup(sectionTitle(key, getJson), container);

            const jsonValue = getJson()[key] || {};
            const getSubObj = () => { return jsonValue; }
            const getSubInit = () => { return getInit()[key]; }
            addParamsToUi(getSubObj, getSubInit, bodyDiv);
        }
    }
}

// ── layer controls ────────────────────────────────────────────────────────────

function updateLayerControls() {
    const layerSelect = document.getElementById('layer-select');
    if (!layerSelect) return;
    const themeData = getThemeData();
    if (!themeData?.layers) return;
    const layers = themeData.layers;

    layerSelect.innerHTML = '';
    layers.forEach((_, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.text = `Layer ${i + 1}`;
        layerSelect.appendChild(opt);
    });
    layerSelect.value = currentLayer;

    const removeBtn = document.getElementById('remove-layer');
    if (removeBtn) removeBtn.disabled = layers.length <= 1;

    const undoBtn = document.getElementById('undo-edit');
    if (undoBtn) undoBtn.disabled = undoHistory.length === 0;
}

function switchToLayer(index) {
    currentLayer = Math.max(0, Math.min(index, getThemeData().layers.length - 1));
    cleanupUi();
    initializeUiFromParams();
}

function addLayer() {
    snapshotBeforeEdit();
    const themeData = deepClone(getThemeData());
    themeData.layers.push(deepClone(themeData.layers[currentLayer]));
    currentLayer = themeData.layers.length - 1;
    setThemeDataAndUpdateUi(themeData);
}

function removeLayer() {
    if (getThemeData().layers.length <= 1) return;
    snapshotBeforeEdit();
    const themeData = deepClone(getThemeData());
    themeData.layers.splice(currentLayer, 1);
    currentLayer = Math.min(currentLayer, themeData.layers.length - 1);
    setThemeDataAndUpdateUi(themeData);
}

// ── theme / params I/O ────────────────────────────────────────────────────────

function downloadJson(obj, name) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + JSON.stringify(obj));
    element.setAttribute('download', name + ".json");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function initializeUiFromParams() {
    addParamsToUi(getParams, () => paramInitializer);
    updateLayerControls();
}

function readParamsFile(readFile) {
    var reader = new FileReader();
    reader.readAsText(readFile, "UTF-8");
    reader.onload = loadedParams;
    reader.onerror = errorHandler;
}

function readThemeFile(readFile) {
    var reader = new FileReader();
    reader.readAsText(readFile, "UTF-8");
    reader.onload = loadedTheme;
    reader.onerror = errorHandler;
}

function overrideObj(src, dst) {
    for (let key in dst) {
        if (!src[key])
            continue;
        if (dst[key] instanceof Object) {
            if (src[key] instanceof Object) {
                overrideObj(src[key], dst[key]);
            } else {
                dst[key] = src[key];
            }
        } else {
            dst[key] = src[key];
        }
    }
}

function initParams(params, init) {
    for (let key in init) {
        if (!params[key]) {
            params[key] = init[key];
        } else if (init[key] instanceof Object) {
            if (params[key] instanceof Object) {
                initParams(params[key], init[key]);
            } else {
                params[key] = init[key];
            }
        }
    }
}

function applyLoadedParams(newParams) {
    overrideObj(newParams, getParams())
    cleanupUi();
    initializeUiFromParams();
}

function loadedParams(evt) {
    snapshotBeforeEdit();
    const newParams = JSON.parse(evt.target.result);
    applyLoadedParams(newParams);
    currentThemeName = "";
    if (themeSelect) themeSelect.value = "";
}

function setThemeDataAndUpdateUi(themeData) {
    const initializer = getInitializedParams();
    for (let layer of themeData.layers) {
        initParams(layer, initializer);
    }
    setThemeData(themeData);
    currentLayer = Math.max(0, Math.min(currentLayer, themeData.layers.length - 1));
    cleanupUi();
    initializeUiFromParams();
}

function loadedTheme(evt) {
    snapshotBeforeEdit();
    const newThemeData = JSON.parse(evt.target.result);
    setThemeDataAndUpdateUi(newThemeData);
    currentThemeName = "";
    if (themeSelect) themeSelect.value = "";
}

function errorHandler(evt) {
    if (evt.target.error.name == "NotReadableError") {
        console.log("The file could not be read");
    }
    alert("Failed to load file");
}

function registerThemeDataInterface(themeDataGetter, themeDataSetter) {
    getThemeData = themeDataGetter;
    setThemeData = themeDataSetter;
}

function getInitializedParams() {
    return initParamObj(paramInitializer);
}

let onThemeChanged = [];
function addToOnThemeChangedDelegate(f) {
    onThemeChanged.push(f);
}

function setBuiltinTheme(themeName) {
    if (themeName == "") return;
    const url = "../themes/" + themeName + ".json";
    try {
        fetch(url).then((response) => {
            if (response.ok) {
                response.json().then((themeData) => {
                    setThemeDataAndUpdateUi(themeData);
                    currentThemeName = themeName;
                    if (themeSelect) themeSelect.value = themeName;
                    for (let f of onThemeChanged) f();
                });
            }
        });
    } catch (error) {
        console.error(error.message);
    }
}

// ── global params UI ─────────────────────────────────────────────────────────

function buildGlobalParamsUi() {
    const container = document.getElementById('global-params');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'param-row';
    attachTooltip(row, "Hard cap on the per-layer particle pool size — limits how many particles each layer can ever simulate at once. Reduce on slower devices.");
    container.appendChild(row);

    const label = document.createElement('div');
    label.className = 'param-label';
    label.textContent = 'max particles per layer';
    row.appendChild(label);

    const controls = document.createElement('div');
    controls.className = 'param-controls';
    row.appendChild(controls);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'param-slider';
    slider.min = 1;
    slider.max = 4096;
    slider.step = 1;
    slider.value = maxParticlesPerLayer;
    controls.appendChild(slider);

    const numBox = document.createElement('input');
    numBox.type = 'number';
    numBox.className = 'param-number';
    numBox.value = maxParticlesPerLayer;
    controls.appendChild(numBox);

    slider.oninput = () => {
        maxParticlesPerLayer = parseInt(slider.value);
        numBox.value = slider.value;
    };
    numBox.oninput = () => {
        const v = Math.max(1, Math.min(4096, parseInt(numBox.value) || 1));
        maxParticlesPerLayer = v;
        slider.value = v;
    };
}

// ── wire up controls ──────────────────────────────────────────────────────────

buildGlobalParamsUi();

const layerSelectEl = document.getElementById('layer-select');
if (layerSelectEl) {
    layerSelectEl.onchange = () => switchToLayer(parseInt(layerSelectEl.value));
}

const addLayerBtn = document.getElementById('add-layer');
if (addLayerBtn) addLayerBtn.onclick = addLayer;

const removeLayerBtn = document.getElementById('remove-layer');
if (removeLayerBtn) removeLayerBtn.onclick = removeLayer;

const undoEditBtn = document.getElementById('undo-edit');
if (undoEditBtn) undoEditBtn.onclick = undo;

const saveParams = document.getElementById('saveParams');
if (saveParams) {
    saveParams.onclick = () => downloadJson(getParams(), "zenbox_layer");

    const loadParams = document.getElementById('loadParams');
    loadParams.type = "file";
    loadParams.innerText = "Load Configuration";
    loadParams.accept = ".json";
    loadParams.addEventListener("input", () => {
        if (loadParams.files.length >= 1) readParamsFile(loadParams.files[0]);
    });
}

const saveTheme = document.getElementById('saveScene');
if (saveTheme) {
    saveTheme.onclick = () => downloadJson(getThemeData(), "zenbox_scene");
}

const loadTheme = document.getElementById('loadScene');
if (loadTheme) {
    loadTheme.type = "file";
    loadTheme.innerText = "Load Configuration";
    loadTheme.accept = ".json";
    loadTheme.addEventListener("input", () => {
        if (loadTheme.files.length >= 1) readThemeFile(loadTheme.files[0]);
    });
}

themeSelect = document.getElementById('zenbox-theme');
if (themeSelect) {
    for (let optionText of themeNames) {
        let option = document.createElement("option");
        option.value = optionText;
        option.text = optionText;
        themeSelect.appendChild(option);
    }
    themeSelect.value = currentThemeName;
    themeSelect.onchange = () => setBuiltinTheme(themeSelect.value);
}


export {
    registerThemeDataInterface,
    simulations,
    themeNames,
    particles,
    blend_modes,
    texParticleConfigs,
    setBuiltinTheme,
    addToOnThemeChangedDelegate,
    getInitializedParams,
    getMaxParticlesPerLayer
}
