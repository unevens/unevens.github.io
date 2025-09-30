const themes = ["index", "festival-starfield", "additive_dark"];
const simulations = ["single_attractor", "twin_attractor"];
const particles = ["sticky_starlight", "uvDebug"];
const blend_modes = ["alpha_mask", "alpha_blend", "additive"];
const interactions = ["follow_mouse", "on_click", "random_walk"];

let setParams = () => { };
let getParams = () => { };

class NumParameter {
    constructor(options) {
        this.min = options.min;
        this.max = options.max;
        this.value = options.value;
        this.step = options.step || 0.001;
    }

    addToUi(getJson, key, paramDiv) {
        const jsonValue = getJson()[key] || this.value;
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
        slider.value = jsonValue;
        slider.oninput = () => {
            jsonValue = slider.value;
            numInputBox.value = slider.value;
            console.log(key + " slider.oninput " + slider.value);
        };
        numInputBox.type = 'number';
        numInputBox.value = jsonValue;
        numInputBox.style = "width:60px"
        numInputBox.oninput = () => {
            jsonValue = numInputBox.value;
            slider.value = numInputBox.value;
            console.log(key + " numInputBox.oninput " + numInputBox.value);
        };
        const defaultValue = jsonValue;
        reset.innerHTML = '<i class="fas fa-undo"></i>'
        reset.onclick = () => {
            numInputBox.value = defaultValue;
            slider.value = defaultValue;
            jsonValue = defaultValue;
            console.log("reset.onclick " + numInputBox.value);
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
        const jsonValue = getJson()[key] || this.value;
        paramDiv.innerText = key;
        paramDiv.style = "font-size: xx-small"
        const select = document.createElement('select');
        paramDiv.appendChild(select);
        console.log("adding select for " + key + " with default " + jsonValue)
        for (let optionText of this.values) {
            let option = document.createElement("option");
            option.value = optionText;
            option.text = optionText;
            select.appendChild(option);
        }
        select.value = jsonValue;
        select.onchange = () => {
            jsonValue = select.value;
            console.log(key + " select.onchange " + select.value);
            if (this.onChanged) {
                this.onChanged();
            }
            if (this.forceRefresh) {
                cleanupUi();
                initializeUi();
            }
        };
        const reset = document.createElement('button');
        paramDiv.appendChild(reset);
        reset.innerHTML = '<i class="fas fa-undo"></i>'
        reset.onclick = () => {
            jsonValue = jsonValue;
            select.value = jsonValue;
            console.log(key + " reset.onclick " + select.value);
            if (this.onChanged) {
                this.onChanged();
            }
            if (this.forceRefresh) {
                cleanupUi();
                initializeUi();
            }
        };
    }
}

const paramInitializer = {

    simulation: new StringParameter({ values: simulations, index: 0, forceRefresh: true }),
    particle: new StringParameter({ values: particles, index: 0, forceRefresh: true }),
    blend_mode: new StringParameter({ values: blend_modes, index: 0 }),
    interaction: new StringParameter({ values: interactions, index: 0 }),
    randomWalkSpeed: new NumParameter({ min: 0, max: .1, value: 0, step: 0.000001 }),
    numParticles: new NumParameter({ min: 1, max: 4096, value: 4096, step: 1 }),
    particleHeight: new NumParameter({ min: .01, max: .2, value: 0.05, step: 0.001 }),
    particleAspectRatio: new NumParameter({ min: .1, max: 10, value: 1 }),
    sideThreshold: new NumParameter({ min: .1, max: 10, value: 1 }),

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
let currentTheme = themes[0];

function cleanupUi() {
    while (paramsContainer.firstChild) {
        paramsContainer.removeChild(paramsContainer.lastChild);
    }
}

function addParamsToUi(getJson, getInit, skipUi) {
    skipUi = skipUi || false;
    for (let key in getInit()) {
        const init = getInit()[key];
        if (typeof init === "boolean") {
            const jsonValue = getJson()[key] || init;
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
            console.log("keyyy "+key );
            let skip = true;
            if (key == 'bloom' || key == getJson()["particle"] || key == getJson()["simulation"])
                skip = false;
            const titleDiv = document.createElement('div');
            titleDiv.innerText = key;
            titleDiv.style = "font-weight: bold"
            paramsContainer.appendChild(titleDiv);
            const jsonValue = getJson()[key] || {};
            const getSubObj = () => { return jsonValue; }
            const getSubInit = () => { return getInit()[key]; }
            addParamsToUi(getSubObj, getSubInit, skip); //yes, yes, this is bad
        }
    }
}

function downloadParams(obj) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + JSON.stringify(obj));
    element.setAttribute('download', "unevens_net.json");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function initializeUi() {
    addParamsToUi(() => getParams(), () => paramInitializer);
    console.log("init params", getParams());
}

function readTextFile(readFile) {
    var reader = new FileReader();
    reader.readAsText(readFile, "UTF-8");
    reader.onload = loaded;
    reader.onerror = errorHandler;
}

function applyParams(newParams) {
    setParams(newParams);
    console.log(newParams);
    cleanupUi();
    initializeUi();
}

function loaded(evt) {
    const newParams = JSON.parse(evt.target.result);
    applyParams(newParams);
    currentTheme = "";
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



function createUi(paramGetter, paramSetter) {
    getParams = paramGetter;
    setParams = paramSetter;
    setParams(initParamObj(paramInitializer));
    initializeUi();

    const saveParams = document.getElementById('saveParams');
    saveParams.onclick = () => {
        downloadParams(getParams());
    };

    const loadParams = document.getElementById('loadParams');
    loadParams.type = "file";
    loadParams.innerText = "Load Configuration"
    loadParams.accept = ".json"
    loadParams.addEventListener("input", () => {
        if (loadParams.files.length >= 1) {
            console.log("File selected: ", loadParams.files[0]);
            readTextFile(loadParams.files[0]);
        }
    });


    themeSelect = document.getElementById('zenbox-theme');
    for (let optionText of themes) {
        let option = document.createElement("option");
        option.value = optionText;
        option.text = optionText;
        themeSelect.appendChild(option);
    }
    themeSelect.value = currentTheme;
    themeSelect.onchange = () => {
        console.log("themeSelect .onchange " + themeSelect.value);
        setTheme(themeSelect.value);
    };

}

function setTheme(theme) {
    if (theme == "") {
        return;
    }
    const url = "../themes/" + theme + ".json";
    try {
        fetch(url).then((response) => {
            if (response.ok) {
                response.json().then(
                    (themeData) => {
                        applyParams(themeData);
                        currentTheme = theme;
                        if (themeSelect) {
                            themeSelect.value = theme;
                        }
                    }
                );
            }
        });
    } catch (error) {
        console.error(error.message);
    }
}





export {
    createUi,
    simulations,
    particles,
    blend_modes,
    setTheme
}