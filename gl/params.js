import * as fxs from "./fxs.js";
const themeNames = ["neon_hole", "holy", "virtual_flux", "index"];
const simulations = ["single_attractor", "twin_attractor"];
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

// ── parameter classes ─────────────────────────────────────────────────────────

class NumParameter {
    constructor(options) {
        this.min = options.min;
        this.max = options.max;
        this.value = options.value;
        this.step = options.step || 0.001;
        this.onChanged = options.onChanged || null;
    }

    addToUi(getJson, key, paramDiv) {
        paramDiv.className = 'param-row';

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
    }

    addToUi(getJson, key, paramDiv) {
        paramDiv.className = 'param-row';

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

const paramInitializer = {

    simulation: new StringParameter({ values: simulations, index: 0, forceRefresh: true }),
    particle: new StringParameter({ values: particles, index: 0, forceRefresh: true }),
    alignment: new StringParameter({ values: ["standard", "velocity"], index: 0 }),
    blend_mode: new StringParameter({ values: blend_modes, index: 0 }),
    interaction: new StringParameter({ values: interactions, index: 0 }),
    randomWalkSpeed: new NumParameter({ min: 0, max: .1, value: 0, step: 0.000001 }),
    numParticles: new NumParameter({ min: 1, max: 4096, value: 4096, step: 1 }),
    particleHeight: new NumParameter({ min: .01, max: .2, value: 0.05, step: 0.001 }),
    particleAspectRatio: new NumParameter({ min: .1, max: 10, value: 1 }),
    sideThreshold: new NumParameter({ min: .1, max: 10, value: 1 }),
    interactionStartX: new NumParameter({ min: 0, max: 1, value: .5 }),
    interactionStartY: new NumParameter({ min: 0, max: 1, value: 0 }),
    timeDialation: new NumParameter({ min: 0, max: 100, value: 1, onChanged: (value) => { fxs.setTimeDialationCoef(value); } }),
    borderPolicy: new StringParameter({ values: ["wrap", "bounce"], index: 0 }),

    twin_attractor: {
        attractToTwin: new NumParameter({ min: -1, max: 1, value: -0.005 }),
        attractToTwinPower: new NumParameter({ min: .2, max: 16, value: 4.0 }),
        attractTwinByVelocity: new NumParameter({ min: 0.0, max: 1, value: 0.0 }),
        attractToTouch: new NumParameter({ min: -.1, max: .1, value: 0.0 }),
        attractToTouchPower: new NumParameter({ min: .2, max: 16, value: 4.0 }),
        twinChangePeriod: new NumParameter({ min: 0, max: 100, value: 4.0 }),
        maxForce: new NumParameter({ min: .05, max: 1, value: 0.25 }),
        dragCoef: new NumParameter({ min: .0, max: 4, value: 1 }),
        noizForce: new NumParameter({ min: .0, max: 4, value: .8 }),
        pulseCoef: new NumParameter({ min: .001, max: 4, value: .1 }),
        pulseFreq: new NumParameter({ min: .001, max: 4, value: .1 }),
        sideForce: new NumParameter({ min: .01, max: 4, value: 1.5 }),
        hardSide: new NumParameter({ min: .001, max: 4, value: .05 }),
        touchObstacleRadius: new NumParameter({ min: 0.0, max: 1.0, value: 0.0 }),
        touchObstacleRepulsion: new NumParameter({ min: 0.0, max: 200.0, value: 80.0 }),
    },
    single_attractor: {
        attractToTouch: new NumParameter({ min: -.1, max: .1, value: 0.005 }),
        attractToTouchPower: new NumParameter({ min: .2, max: 16, value: 4.0 }),
        maxForce: new NumParameter({ min: .05, max: 1, value: 0.25 }),
        dragCoef: new NumParameter({ min: .0, max: 4, value: 1 }),
        noizForce: new NumParameter({ min: .0, max: 4, value: .8 }),
        pulseCoef: new NumParameter({ min: .001, max: 4, value: .1 }),
        pulseFreq: new NumParameter({ min: .001, max: 4, value: .1 }),
        sideForce: new NumParameter({ min: .01, max: 4, value: 1.5 }),
        hardSide: new NumParameter({ min: .001, max: 4, value: .05 }),
        touchObstacleRadius: new NumParameter({ min: 0.0, max: 1.0, value: 0.0 }),
        touchObstacleRepulsion: new NumParameter({ min: 0.0, max: 50.0, value: 10.0 }),
    },

    sticky_starlight: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025 }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05 }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0 }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0 }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45 }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25 }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0 }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0 }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1 }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5 }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
    },

    droplet: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025 }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05 }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0 }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0 }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45 }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25 }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0 }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0 }),
        thickness: new NumParameter({ min: 0, max: 1, value: .122 }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5 }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
        radius_1: new NumParameter({ min: 0.001, max: 1, value: .333 }),
        radius_2: new NumParameter({ min: 0.001, max: 1, value: .133 }),
        height: new NumParameter({ min: 0.01, max: 1, value: .85 }),
    },

    circle: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025 }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05 }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0 }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0 }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45 }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25 }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0 }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0 }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1 }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5 }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
        radiusPulseFreq: new NumParameter({ min: 0, max: 10, value: .2 }),
        radiusPulsePercentage: new NumParameter({ min: 0.001, max: 1, value: .3 }),
    },

    square: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025 }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05 }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0 }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0 }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45 }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25 }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0 }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0 }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1 }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5 }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
        radiusPulseFreq: new NumParameter({ min: 0, max: 10, value: .2 }),
        radiusPulsePercentage: new NumParameter({ min: 0.001, max: 1, value: .3 }),
    },

    circle_and_square: {
        hueVariation: new NumParameter({ min: .0, max: 1, value: 0.025 }),
        hueSpeed: new NumParameter({ min: .0, max: 1, value: 0.05 }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0 }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0 }),
        saturation: new NumParameter({ min: 0, max: 1, value: .45 }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: .25 }),
        lightness: new NumParameter({ min: 0, max: 1, value: 1.33 / 2.0 }),
        lightnessVariation: new NumParameter({ min: 0, max: 1, value: (1. - .33) / 2.0 }),
        thickness: new NumParameter({ min: 0, max: 1, value: .1 }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5 }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
        radiusPulseFreq: new NumParameter({ min: 0, max: 10, value: .2 }),
        radiusPulsePercentage: new NumParameter({ min: 0.001, max: 1, value: .3 }),
    },

    bloom: {
        numPasses: new NumParameter({ min: 0, max: 16, value: 4, step: 1 }),
        amount: new NumParameter({ min: 0., max: 8, value: 1.8 }),
        threshold: new NumParameter({ min: 0., max: 1, value: 0.7 }),
        radius: new NumParameter({ min: 0., max: 4, value: 4 }),
        strength: new NumParameter({ min: .1, max: 50, value: 20 }),
    },

    ...Object.fromEntries(texParticleConfigs.map(cfg => [`tex_${cfg.name}`, {
        hueVariation: new NumParameter({ min: 0, max: 1, value: 0.025 }),
        hueSpeed: new NumParameter({ min: 0, max: 1, value: 0.05 }),
        tint: new NumParameter({ min: 0, max: 1, value: 3.0 / 6.0 }),
        tintVariation: new NumParameter({ min: 0, max: 1, value: 2.0 / 6.0 }),
        saturation: new NumParameter({ min: 0, max: 1, value: 0.45 }),
        saturationVariation: new NumParameter({ min: 0, max: 1, value: 0.25 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
        texSaturation: new NumParameter({ min: 0, max: 1, value: 1 }),
        tintAmount: new NumParameter({ min: 0, max: 1, value: 0 }),
        brightness: new NumParameter({ min: 0, max: 5, value: 1 }),
        threshold: new NumParameter({ min: 0, max: 1, value: 0.05, step: 0.001 }),
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
