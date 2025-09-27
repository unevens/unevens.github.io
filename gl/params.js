
function handleParameters(getParams, setParams) {

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

    const exportInportDiv = document.getElementById('saveload');

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
            // The file could not be read
        }
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
    handleParameters
}