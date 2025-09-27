// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

import * as fxs from "./fxs.js";
import * as AA from "./smaa.js";

const twgl = fxs.twgl;
const gl = fxs.gl;
const isMobile = fxs.isMobile;

const particleVS = new fxs.Shader("particleQuad");

const simulations = ["gravity"];
const particles = ["uvDebug", "sticky_starlight"];
const simulationShaders = simulations.map((x) => new fxs.Shader(x));
const particleShaders = particles.map((x) => new fxs.Shader(x));
const simulationPrograms = simulationShaders.map((x) => new fxs.Program(fxs.screenVS, x));
const particlePrograms = particleShaders.map((x) => new fxs.Program(particleVS, x));

const simSide = isMobile ? 32 : 64;

const settings = {
  simSize: [simSide, simSide],
  simulation: simulationShaders[0].name,
  particle: particleShaders[1].name,
  loopScreen: true,
  resolutionCoef: 1.0,
}

let params = {

  use_alpha_blend: false,

  gravity_params: {
    forceCoef: 0.005,
    forcePow: 4.0,
    maxForce: 0.25,
    dragCoef: 1.0,
    noizForce: 0.8,
    pulseCoef: 0.1,
    pulseFreq: 0.1,
    sideThreshold: 1.0,
    sideForce: 1.5,
    hardSide: 0.05,
  },

  particleHeight: 0.05,
  particleAspectRatio: 1,
  blinkSpeedMin: 1.0,
  blinkSpeedMax: 10.0,

  tonemap_params: {
    something: 0.0,
  },

  sticky_starlight_params: {
    hueVariation: 0.025,
    hueSpeed: 0.05,
    maxColorHsv: [1.0 / 6.0, 0.7, 1.0],
    minColorHsv: [5.0 / 6.0, 0.2, 0.33],
    thickness: .05,
    falloff: .5,
    threshold: 0.0001,
  },

  bloom_params: {
    numPasses: 4,
    amount: 1.8,
    threshold: 0.5,
    radius: 0.95,
    strength: 10,
  },
};

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

function downloadParams(sim, obj) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + JSON.stringify(obj));
  element.setAttribute('download', "unevens_" + sim + ".json");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function initializeUi() {
  addParamsToUi(() => params);
}

initializeUi();

const exportInportDiv = document.getElementById('saveload');

const saveParams = document.getElementById('saveParams');
saveParams.onclick = () => {
  downloadParams(settings.particle + "_" + settings.simulation, params);
};

function readTextFile(readFile) {
  var reader = new FileReader();
  reader.readAsText(readFile, "UTF-8");
  reader.onload = loaded;
  reader.onerror = errorHandler;
}

function loaded(evt) {
  params = JSON.parse(evt.target.result);
  console.log(params);
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
loadParams.innerText="Load Configuration"
loadParams.accept = ".json"
loadParams.addEventListener("input", () => {
  if (loadParams.files.length >= 1) {
    console.log("File selected: ", loadParams.files[0]);
    readTextFile(loadParams.files[0]);
  }
});



const numParticles = () => settings.simSize[0] * settings.simSize[1];

let simulation = "";
let particle = "";
let simulationProgram;
let particleProgram;
let loopingScreen = settings.loopScreen;

function checkUpdatePrograms() {
  if (simulation != settings.simulation || loopingScreen != settings.loopScreen) {
    simulation = settings.simulation;
    loopingScreen = settings.loopScreen;

    simulationProgram = simulationPrograms.find((p) => p.fs.name == simulation);
    const loopMacro = "PERIODIC " + (loopingScreen ? "1" : "0");
    simulationProgram.setMacro(loopMacro);
  }
  if (particle != settings.particle) {
    particle = settings.particle;
    particleProgram = particlePrograms.find((p) => p.fs.name == particle);
  }
}

const initSimFS = new fxs.Shader("initSim");
const initSimProgram = new fxs.Program(fxs.screenVS, initSimFS);

///// SIMULATION

const simBuffers = [
  new fxs.Framebuffer({ size: settings.simSize, filter: gl.NEAREST, bits: 16 }),
  new fxs.Framebuffer({ size: settings.simSize, filter: gl.NEAREST, bits: 16 }),
];

const simulationSize = new Float32Array(4);

function checkUpdateSimulationSize() {
  if (simulationSize[0] != settings.simSize[0] || simulationSize[1] != settings.simSize[1]) {
    simulationSize[0] = settings.simSize[0];
    simulationSize[1] = settings.simSize[1];
    simulationSize[2] = 1.0 / settings.simSize[0];
    simulationSize[3] = 1.0 / settings.simSize[1];
    for (const buffer of simBuffers) {
      buffer.resize(settings.simSize);
    }
  }
}

function swapSimBuffers() {
  const temp = simBuffers[0];
  simBuffers[0] = simBuffers[1];
  simBuffers[1] = temp;
}

function initializeParticles() {
  checkUpdateSimulationSize();
  simBuffers[0].bind();
  initSimProgram.bind();
  initSimProgram.setUniforms({
    cellRadius: [0.5 / settings.simSize[0], 0.5 / settings.simSize[1]],
    noizAmount: [0.3, 0.01],
    noizSeed: [Math.sin(performance.now()), Math.cos(performance.now())],
  });
  fxs.quadVAO.draw();
}

///// DRAWING
const fbos = [];
for (let i = 0; i < 2; i++) {
  fbos[i] = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => settings.resolutionCoef });
}
const viewportSize = Float32Array.from(fxs.viewportSize);
const mouse = Float32Array.from(fxs.mouse);
const ratioXonY = Float32Array.from([1, 1]);
const ratioYonX = Float32Array.from([1, 1]);
const sideThresh = Float32Array.from([1, 1]);

// const tempBuffer = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => settings.resolutionCoef });

let bloom = new fxs.Bloom();
let smaa = new AA.Smaa({ preset: "ultra", edge_channel: "color" });
smaa.debug = 0;

let doAA = true;
let pause = false;

document.addEventListener("keydown", (e) => {
  if (e.key == "k") {
    doAA = !doAA;
    console.log(`SMAA ${doAA}`);
  }
  if (e.key == "l") {
    pause = !pause;
    console.log(`pause ${pause}`);
  }
});



function onStart() {
  fxs.quadVAO.bind();
  initializeParticles();
  bloom.setParams(params.bloom_params);
}

function onNewFrame(time, deltaTime) {
  if (pause) {
    deltaTime = 0;
  }
  checkUpdatePrograms();
  for (let i = 0; i < 2; i++) {
    viewportSize[i] = fxs.viewportSize[i] * settings.resolutionCoef;
    viewportSize[i + 2] = fxs.viewportSize[i + 2] / settings.resolutionCoef;
  }

  const wideScreen = viewportSize[0] > viewportSize[1];
  ratioXonY[1] = viewportSize[3] * viewportSize[0];
  ratioYonX[0] = viewportSize[2] * viewportSize[1];
  let sideThresholdBase = params.gravity_params.sideThreshold;
  if (wideScreen) {
    mouse[0] = 0.5 + (fxs.mouse[0] - 0.5) * ratioXonY[1];
    mouse[1] = fxs.mouse[1];
    sideThresh[0] = ratioXonY[1] - ratioXonY[0] * (1.0 - sideThresholdBase);
    sideThresh[1] = sideThresholdBase;
  } else {
    mouse[0] = fxs.mouse[0];
    mouse[1] = 0.5 + (fxs.mouse[1] - 0.5) * ratioYonX[0];
    sideThresh[0] = sideThresholdBase;
    sideThresh[1] = ratioYonX[0] - ratioYonX[1] * (1.0 - sideThresholdBase);
  }

  //simulation
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  checkUpdateSimulationSize();
  simBuffers[1].bind();
  simulationProgram.bind();
  simulationProgram.setUniforms({
    stateTexture: simBuffers[0].textures[0],
    attractor: mouse,
    dt: deltaTime,
    time,
    sideThresh,
  });

  const simParams = params[simulation + "_params"];
  if (simParams) {
    simulationProgram.setUniforms(simParams);
  }
  fxs.quadVAO.draw();

  //draw
  fbos[0].bind();
  gl.viewport(0, 0, viewportSize[0], viewportSize[1]);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (params.use_alpha_blend) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  } else {
    gl.enable(gl.DEPTH_TEST);
  }

  particleProgram.bind();
  particleProgram.setUniforms({
    simulation: simBuffers[1].textures[0],
    simulationSize,
    particleSize: [params.particleHeight * params.particleAspectRatio, params.particleHeight],
    ratio: wideScreen ? ratioYonX : ratioXonY,
    time,
    blinkSpeedMin: params.blinkSpeedMin,
    blinkSpeedMax: params.blinkSpeedMax,
  });
  const particleParams = params[particle + "_params"];
  if (particleParams) {
    particleProgram.setUniforms(particleParams);
  }
  fxs.quadVAO.drawInstanced(numParticles());

  if (params.use_alpha_blend) {
    gl.disable(gl.BLEND);
  } else {
    gl.disable(gl.DEPTH_TEST);
  }


  bloom.apply(fbos[0].textures[0]);

  if (doAA) {
    bloom.addTo(fbos[0].textures[0], fbos[1]);
    smaa.apply(fbos[1].textures[0]);
  } else {
    bloom.addTo(fbos[0].textures[0]);
  }


  // if (doAA) {
  //   smaa.apply(fbos[0].textures[0], fbos[1]);
  //   bloom.addTo(fbos[1].textures[0]);
  // } else {
  //   bloom.addTo(fbos[0].textures[0]);
  // }

  // if (doAA) {
  //   smaa.apply(fbos[0].textures[0]);
  // } else {
  //   twgl.bindFramebufferInfo(gl, null);
  //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //   fxs.copyProgram.bind();
  //   fxs.copyProgram.setUniforms({
  //     srcTexture: fbos[0].textures[0],
  //   });
  //   fxs.quadVAO.draw();
  // }


  swapSimBuffers();
}

fxs.start(onStart, onNewFrame);