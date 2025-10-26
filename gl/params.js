import * as fxs from "./fxs.js";
const themeNames = ["neon_hole", "holy", "virtual_flux", "index"];
const simulations = ["single_attractor", "twin_attractor"];
const particles = ["sticky_starlight", "circle", "square", "circle_and_square", "droplet", "uvDebug"];
const blend_modes = ["alpha_mask", "alpha_blend", "additive"];
const interactions = ["random_walk", "on_click", "follow_mouse"];

let getThemeData = () => { };
let setThemeData = (data) => { };
let currentLayer = 0;

function getParams() {
    const themeData = getThemeData();
    return themeData.layers[currentLayer];
}

function setParams(params) {
    getThemeData().layers[currentLayer] = params;
}

class NumParameter {
    constructor(options) {
        this.min = options.min;
        this.max = options.max;
        this.value = options.value;
        this.step = options.step || 0.001;
        this.onChanged = options.onChanged || null;
    }

    addToUi(getJson, key, paramDiv) {
        paramDiv.innerText = key;
        paramDiv.style = "font-size: xx-small"
        const slider = document.createElement('input');
        paramDiv.appendChild(slider);
        const numInputBox = document.createElement('input');
        paramDiv.appendChild(numInputBox);
        const reset = document.createElement('button');
        paramDiv.appendChild(reset);

        slider.type = 'range';
        slider.min = this.min;
        slider.max = this.max;
        slider.step = this.step;
        slider.value = getJson()[key];
        slider.oninput = () => {
            getJson()[key] = slider.value;
            numInputBox.value = slider.value;
            console.log(key + " slider.oninput " + slider.value);
            if (this.onChanged) {
                this.onChanged(slider.value);
            }
        };
        numInputBox.type = 'number';
        numInputBox.value = getJson()[key];
        numInputBox.style = "width:60px"
        numInputBox.oninput = () => {
            getJson()[key] = numInputBox.value;
            slider.value = numInputBox.value;
            console.log(key + " numInputBox.oninput " + numInputBox.value);
            if (this.onChanged) {
                this.onChanged(numInputBox.value);
            }
        };
        const defaultValue = getJson()[key];
        reset.innerHTML = '<i class="fas fa-undo"></i>'
        reset.onclick = () => {
            numInputBox.value = defaultValue;
            slider.value = defaultValue;
            getJson()[key] = defaultValue;
            console.log("reset.onclick " + numInputBox.value);
            if (this.onChanged) {
                this.onChanged(defaultValue);
            }
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
        paramDiv.innerText = key;
        paramDiv.style = "font-size: xx-small"
        const select = document.createElement('select');
        paramDiv.appendChild(select);
        console.log("adding select for " + key + " with default " + getJson()[key])
        for (let optionText of this.values) {
            let option = document.createElement("option");
            option.value = optionText;
            option.text = optionText;
            select.appendChild(option);
        }
        select.value = getJson()[key];
        select.onchange = () => {
            getJson()[key] = select.value;
            console.log(key + " select.onchange " + select.value);
            if (this.onChanged) {
                this.onChanged(select.value);
            }
            if (this.forceRefresh) {
                cleanupUi();
                initializeUiFromParams();
            }
        };
        const reset = document.createElement('button');
        paramDiv.appendChild(reset);
        reset.innerHTML = '<i class="fas fa-undo"></i>'
        const defaultValue = getJson()[key];
        reset.onclick = () => {
            getJson()[key] = defaultValue;
            select.value = defaultValue;
            console.log(key + " reset.onclick " + select.value);
            if (this.onChanged) {
                this.onChanged(defaultValue);
            }
            if (this.forceRefresh) {
                cleanupUi();
                initializeUiFromParams();
            }
        };
    }
}

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
        threshold: new NumParameter({ min: 0, max: .01, value: .0001 }),
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
        threshold: new NumParameter({ min: 0, max: .01, value: .0001 }),
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
        threshold: new NumParameter({ min: 0, max: .01, value: .0001 }),
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
        threshold: new NumParameter({ min: 0, max: .01, value: .0001 }),
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
        threshold: new NumParameter({ min: 0, max: .01, value: .0001 }),
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
};

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
        else if (paramInit[key] instanceof Object) {
            obj[key] = initParamObj(paramInit[key]);
        }
    }
    return obj;
}

const paramsContainer = document.getElementById('params');
let themeSelect;
let currentThemeName = themeNames[0];

function cleanupUi() {
    while (paramsContainer.firstChild) {
        paramsContainer.removeChild(paramsContainer.lastChild);
    }
}

function addParamsToUi(getJson, getInit) {
    for (let key in getInit()) {
        const init = getInit()[key];
        if (typeof init === "boolean") {
            const jsonValue = getJson()[key] || init;
            getJson()[key] = getJson()[key] || jsonValue;
            const paramDiv = document.createElement('div');
            paramDiv.innerText = key;
            paramDiv.style = "font-size: xx-small"
            const numInputBox = document.createElement('input');
            numInputBox.type = 'checkbox';
            numInputBox.value = getJson()[key];
            numInputBox.oninput = () => {
                getJson()[key] = numInputBox.value;
                console.log(key + " numInputBox.oninput " + numInputBox.value);
            };
            paramDiv.appendChild(numInputBox);
            const reset = document.createElement('button');
            reset.innerHTML = '<i class="fas fa-undo"></i>'
            reset.onclick = () => {
                numInputBox.value = jsonValue;
                getJson()[key] = jsonValue;
                console.log("reset.onclick " + numInputBox.value);
            };
            paramDiv.appendChild(reset);
            paramsContainer.appendChild(paramDiv);
        }
        else if (init.addToUi) {
            const paramDiv = document.createElement('div');
            paramsContainer.appendChild(paramDiv);
            init.addToUi(getJson, key, paramDiv);
        }
        else if (getInit()[key] instanceof Object) {
            let skip = true;
            if (key == 'bloom' || key == getJson()["particle"] || key == getJson()["simulation"])
                skip = false;
            console.log("skip? " + key + " = " + skip);
            if (skip)
                continue;
            const titleDiv = document.createElement('div');
            titleDiv.innerText = key;
            titleDiv.style = "font-weight: bold"
            paramsContainer.appendChild(titleDiv);
            const jsonValue = getJson()[key] || {};
            const getSubObj = () => { return jsonValue; }
            const getSubInit = () => { return getInit()[key]; }
            addParamsToUi(getSubObj, getSubInit); //yes, yes, this is bad
        }
    }
}

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
    const newParams = JSON.parse(evt.target.result);
    applyLoadedParams(newParams);
    currentThemeName = "";
    if (themeSelect) {
        themeSelect.value = "";
    }
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
    const newThemeData = JSON.parse(evt.target.result);
    setThemeDataAndUpdateUi(newThemeData);
    currentThemeName = "";
    if (themeSelect) {
        themeSelect.value = "";
    }
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
    if (themeName == "") {
        return;
    }
    const url = "../themes/" + themeName + ".json";
    try {
        fetch(url).then((response) => {
            if (response.ok) {
                response.json().then(
                    (themeData) => {
                        setThemeDataAndUpdateUi(themeData);
                        currentThemeName = themeName;
                        if (themeSelect) {
                            themeSelect.value = themeName;
                        }
                        for (let f of onThemeChanged) {
                            f();
                        }
                    }
                );
            }
        });
    } catch (error) {
        console.error(error.message);
    }
}

const saveParams = document.getElementById('saveParams');
if (saveParams) {
    saveParams.onclick = () => {
        downloadJson(getParams(), "zenbox_layer");
    };

    const loadParams = document.getElementById('loadParams');
    loadParams.type = "file";
    loadParams.innerText = "Load Configuration"
    loadParams.accept = ".json"
    loadParams.addEventListener("input", () => {
        if (loadParams.files.length >= 1) {
            console.log("File selected: ", loadParams.files[0]);
            readParamsFile(loadParams.files[0]);
        }
    });
}



const saveTheme = document.getElementById('saveScene');
if (saveTheme) {
    saveTheme.onclick = () => {
        downloadJson(getThemeData(), "zenbox_scene");
    };
}


const loadTheme = document.getElementById('loadScene');
if (loadTheme) {
    loadTheme.type = "file";
    loadTheme.innerText = "Load Configuration"
    loadTheme.accept = ".json"
    loadTheme.addEventListener("input", () => {
        if (loadTheme.files.length >= 1) {
            console.log("File selected: ", loadTheme.files[0]);
            readThemeFile(loadTheme.files[0]);
        }
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
    themeSelect.onchange = () => {
        console.log("themeSelect .onchange " + themeSelect.value);
        setBuiltinTheme(themeSelect.value);
    };
}


export {
    registerThemeDataInterface,
    simulations,
    particles,
    blend_modes,
    setBuiltinTheme,
    addToOnThemeChangedDelegate,
    getInitializedParams
}