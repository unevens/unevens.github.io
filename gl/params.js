const simulations = ["gravity"];
const particles = ["sticky_starlight", "uvDebug"];

class NumParameter {
    constructor(options) {
        this.min = options.min;
        this.max = options.max;
        this.value = options.value;
        this.step = options.step || 0;
    }
}

class StringParameter {
    constructor(options) {
        this.values = options.values;
        this.index = options.index;
    }
}

let paramInitializer = {

    simulation: new StringParameter({ values: simulations, index: 0 }),
    particle: new StringParameter({ values: particles, index: 0 }),
    use_alpha_blend: false,
    numParticles: new NumParameter({ min: 1, max: 4096, value: 4096 }),
    particleHeight: new NumParameter({ min: .01, max: .2, value: 0.03 }),
    particleAspectRatio: new NumParameter({ min: .1, max: 10, value: 1 }),
    sideThreshold: new NumParameter({ min: .1, max: 10, value: 1 }),

    gravity: {
        forceCoef: new NumParameter({ min: 0, max: .1, value: 0.005 }),
        forcePow: new NumParameter({ min: .2, max: 16, value: 4.0 }),
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
        thickness: new NumParameter({ min: 0, max: 1, value: .05 }),
        falloff: new NumParameter({ min: 0, max: 1, value: .5 }),
        threshold: new NumParameter({ min: 0, max: .01, value: .0001 }),
        threshold: new NumParameter({ min: 0, max: 20, value: 1 }),
        blinkSpeedMin: new NumParameter({ min: 0.1, max: 30, value: 4 }),
        blinkSpeedMax: new NumParameter({ min: 0.1, max: 30, value: 10 }),
    },

    bloom: {
        numPasses: new NumParameter({ min: 0, max: 16, value: 4, step: 1 }),
        amount: new NumParameter({ min: 0., max: 8, value: 1.5 }),
        threshold: new NumParameter({ min: 0., max: 1, value: .5 }),
        radius: new NumParameter({ min: 0., max: 4, value: 0.95 }),
        strength: new NumParameter({ min: .1, max: 50, value: 10 }),
    },
};

function initParamObj(paramInit) {
    let obj = {};
    for (let key in paramInit) {
        if (paramInit[key] instanceof NumParameter) {
            obj[key] = paramInit[key].value;
        } else if (paramInit[key] instanceof StringParameter) {
            obj[key] = paramInit[key].values[paramInit[key].index];
        }else if (typeof paramInit[key] === "boolean") {
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


function handleParameters(getParams, setParams) {
    setParams(initParamObj(paramInitializer));
    console.log("yooo")
    console.log(getParams())
    const paramsContainer = document.getElementById('params');

    function cleanupUi() {
        while (paramsContainer.firstChild) {
            paramsContainer.removeChild(paramsContainer.lastChild);
        }
    }

    function addParamsToUi(getObj) {
        for (let key in getObj()) {
            if (getObj()[key] instanceof Object) {
                const titleDiv = document.createElement('div');
                titleDiv.innerText = key;
                titleDiv.style = "font-weight: bold"
                paramsContainer.appendChild(titleDiv);
                const getSubObj = () => { return getObj()[key]; }
                addParamsToUi(getSubObj); //yes, yes, this is bad
            }
            else if (getObj()[key] instanceof Array) {
                const paramDiv = document.createElement('div');
                paramDiv.innerText = key;
                paramDiv.style = "font-size: xx-small"
                const textBoxs = []
                for (let i = 0; i < getObj()[key].length; ++i) {
                    const index = i;
                    const numInputBox = document.createElement('input');
                    numInputBox.type = 'number';
                    numInputBox.value = getObj()[key][index];
                    textBoxs.push(numInputBox);
                    numInputBox.oninput = () => {
                        getObj()[key] = numInputBox.value;
                        console.log("array " + key + " index " + index + " value " + numInputBox.value);
                    };
                    paramDiv.appendChild(numInputBox);
                }
                const reset = document.createElement('button');
                reset.innerHTML = '<i class="fas fa-undo"></i>'
                reset.onclick = () => {
                    for (let numInputBox in textBoxs) {
                        numInputBox.value = defaultValue;
                    }
                    getObj()[key] = defaultValue;
                    console.log("reset.onclick " + key + " to " + numInputBox.value);
                };
                paramDiv.appendChild(reset);
            }
            else if (typeof getObj()[key] === "boolean") {
                const paramDiv = document.createElement('div');
                paramDiv.innerText = key;
                paramDiv.style = "font-size: xx-small"
                const numInputBox = document.createElement('input');
                numInputBox.type = 'checkbox';
                numInputBox.value = getObj()[key];
                numInputBox.oninput = () => {
                    getObj()[key] = numInputBox.value;
                    console.log("numInputBox.oninput " + numInputBox.value);
                };
                paramDiv.appendChild(numInputBox);
                const defaultValue = getObj()[key];
                const reset = document.createElement('button');
                reset.innerHTML = '<i class="fas fa-undo"></i>'
                reset.onclick = () => {
                    numInputBox.value = defaultValue;
                    getObj()[key] = defaultValue;
                    console.log("reset.onclick " + numInputBox.value);
                };
                paramDiv.appendChild(reset);
                paramsContainer.appendChild(paramDiv);
            }
            else {
                const paramDiv = document.createElement('div');
                paramDiv.innerText = key;
                paramDiv.style = "font-size: xx-small"
                const numInputBox = document.createElement('input');
                numInputBox.type = 'number';
                numInputBox.value = getObj()[key];
                numInputBox.oninput = () => {
                    getObj()[key] = numInputBox.value;
                    console.log("numInputBox.oninput " + numInputBox.value);
                };
                paramDiv.appendChild(numInputBox);
                const defaultValue = getObj()[key];
                const reset = document.createElement('button');
                reset.innerHTML = '<i class="fas fa-undo"></i>'
                reset.onclick = () => {
                    numInputBox.value = defaultValue;
                    getObj()[key] = defaultValue;
                    console.log("reset.onclick " + numInputBox.value);
                };
                paramDiv.appendChild(reset);
                paramsContainer.appendChild(paramDiv);
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
        addParamsToUi(() => getParams());
    }

    initializeUi();

    const saveParams = document.getElementById('saveParams');
    saveParams.onclick = () => {
        downloadParams(getParams());
    };

    function readTextFile(readFile) {
        var reader = new FileReader();
        reader.readAsText(readFile, "UTF-8");
        reader.onload = loaded;
        reader.onerror = errorHandler;
    }

    function loaded(evt) {
        const newParams = JSON.parse(evt.target.result);
        setParams(newParams);
        console.log(newParams);
        cleanupUi();
        initializeUi();
    }

    function errorHandler(evt) {
        if (evt.target.error.name == "NotReadableError") {
            console.log("The file could not be read");
        }
        alert("Failed to load file");
    }

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

}

export {
    handleParameters,
    NumParameter,
    simulations,
    particles
}