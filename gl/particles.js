// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

import * as fxs from "./fxs.js";
import * as AA from "./smaa.js";
import { handleParameters, simulations, particles, blend_modes } from "./params.js";
const twgl = fxs.twgl;
const gl = fxs.gl;
const isMobile = fxs.isMobile;

const fpsDiv = document.getElementById("fps");

const particleVS = new fxs.Shader("particleQuad");
const simulationShaders = simulations.map((x) => new fxs.Shader(x));
const particleShaders = particles.map((x) => new fxs.Shader(x));
const simulationPrograms = simulationShaders.map((x) => new fxs.Program(fxs.screenVS, x));
const particlePrograms = particleShaders.map((x) => new fxs.Program(particleVS, x));
const resolutionCoef = 1.0;

const simSide = isMobile ? 32 : 64;
const simSize = [simSide, simSide];

const settings = {
  simSize: [simSide, simSide],
  loopScreen: true,
}

let params = {};

handleParameters(() => params, (p) => { params = p; });

const numParticles = () => Math.min(params.numParticles, simSize[0] * simSize[1]);

let simulation = "";
let particle = "";
let simulationProgram;
let particleProgram;
let loopingScreen = settings.loopScreen;

function checkUpdatePrograms() {
  if (simulation != params.simulation || loopingScreen != settings.loopScreen) {
    simulation = params.simulation;
    loopingScreen = settings.loopScreen;

    simulationProgram = simulationPrograms.find((p) => p.fs.name == simulation);
    const loopMacro = "PERIODIC " + (loopingScreen ? "1" : "0");
    simulationProgram.setMacro(loopMacro);
  }
  if (particle != params.particle) {
    particle = params.particle;
    particleProgram = particlePrograms.find((p) => p.fs.name == particle);
  }
}

const initSimFS = new fxs.Shader("initSim");
const initSimProgram = new fxs.Program(fxs.screenVS, initSimFS);

///// SIMULATION

const simBuffers = [
  new fxs.Framebuffer({ size: simSize, filter: gl.NEAREST, bits: 16 }),
  new fxs.Framebuffer({ size: simSize, filter: gl.NEAREST, bits: 16 }),
];

const simulationSize = new Float32Array(4);

function checkUpdateSimulationSize() {
  if (simulationSize[0] != simSize[0] || simulationSize[1] != simSize[1]) {
    simulationSize[0] = simSize[0];
    simulationSize[1] = simSize[1];
    simulationSize[2] = 1.0 / simSize[0];
    simulationSize[3] = 1.0 / simSize[1];
    for (const buffer of simBuffers) {
      buffer.resize(simSize);
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
    cellRadius: [0.5 / simSize[0], 0.5 / simSize[1]],
    noizAmount: [0.3, 0.01],
    noizSeed: [Math.sin(performance.now()), Math.cos(performance.now())],
  });
  fxs.quadVAO.draw();
}

///// DRAWING
const fbos = [];
for (let i = 0; i < 2; i++) {
  fbos[i] = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => resolutionCoef });
}
const viewportSize = Float32Array.from(fxs.viewportSize);
const interactionPoint = Float32Array.from(fxs.mouse);
const ratioXonY = Float32Array.from([1, 1]);
const ratioYonX = Float32Array.from([1, 1]);
const sideThresh = Float32Array.from([1, 1]);

// const tempBuffer = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => resolutionCoef });

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
}

function onNewFrame(time, deltaTime) {
  if (pause) {
    deltaTime = 0;
  }
  checkUpdatePrograms();
  for (let i = 0; i < 2; i++) {
    viewportSize[i] = fxs.viewportSize[i] * resolutionCoef;
    viewportSize[i + 2] = fxs.viewportSize[i + 2] / resolutionCoef;
  }

  const wideScreen = viewportSize[0] > viewportSize[1];
  ratioXonY[1] = viewportSize[3] * viewportSize[0];
  ratioYonX[0] = viewportSize[2] * viewportSize[1];
  let sideThresholdBase = params.sideThreshold;
  if (wideScreen) {
    sideThresh[0] = ratioXonY[1] - ratioXonY[0] * (1.0 - sideThresholdBase);
    sideThresh[1] = sideThresholdBase;
  } else {
    sideThresh[0] = sideThresholdBase;
    sideThresh[1] = ratioYonX[0] - ratioYonX[1] * (1.0 - sideThresholdBase);
  }

  if (params.interaction == "random_walk") {
    interactionPoint[0] = Math.min(1.0, Math.max(0.0, interactionPoint[0] + params.randomWalkSpeed * (2.0 * Math.random() - 1.0)));
    interactionPoint[1] = Math.min(1.0, Math.max(0.0, interactionPoint[1] + params.randomWalkSpeed * (2.0 * Math.random() - 1.0)));

  } else {
    if (params.interaction == "follow_mouse") {
      fxs.SetUpdateMouseOnlyOnClick(false);
    } else if (params.interaction == "on_click") {
      fxs.SetUpdateMouseOnlyOnClick(true);
    }
    if (wideScreen) {
      interactionPoint[0] = 0.5 + (fxs.mouse[0] - 0.5) * ratioXonY[1];
      interactionPoint[1] = fxs.mouse[1];
    } else {
      interactionPoint[0] = fxs.mouse[0];
      interactionPoint[1] = 0.5 + (fxs.mouse[1] - 0.5) * ratioYonX[0];
    }
  }

  //simulation
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  checkUpdateSimulationSize();
  simBuffers[1].bind();
  simulationProgram.bind();
  simulationProgram.setUniforms({
    stateTexture: simBuffers[0].textures[0],
    attractor: interactionPoint,
    dt: deltaTime,
    time,
    sideThresh,
  });

  const simParams = params[simulation];
  if (simParams) {
    simulationProgram.setUniforms(simParams);
  }
  fxs.quadVAO.draw();

  //draw
  fbos[0].bind();
  gl.viewport(0, 0, viewportSize[0], viewportSize[1]);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (params.blend_mode === "alpha_blend") {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  } else if (params.blend_mode === "additive") {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  } else if (params.blend_mode === "alpha_mask") {
    gl.enable(gl.DEPTH_TEST);
  }

  particleProgram.bind();
  particleProgram.setUniforms({
    simulation: simBuffers[1].textures[0],
    simulationSize,
    particleSize: [params.particleHeight * params.particleAspectRatio, params.particleHeight],
    ratio: wideScreen ? ratioYonX : ratioXonY,
    time,
  });
  const particleParams = params[particle];
  if (particleParams) {
    particleProgram.setUniforms(particleParams);
  }
  fxs.quadVAO.drawInstanced(numParticles());

  if (params.blend_mode === "alpha_blend") {
    gl.disable(gl.BLEND);
  } else if (params.blend_mode === "additive") {
    gl.disable(gl.BLEND);
  } else if (params.blend_mode === "alpha_mask") {
    gl.disable(gl.DEPTH_TEST);
  }

  bloom.setParams(params.bloom);
  bloom.apply(fbos[0].textures[0]);

  if (doAA) {
    bloom.addTo(fbos[0].textures[0], fbos[1]);
    smaa.apply(fbos[1].textures[0]);
  } else {
    bloom.addTo(fbos[0].textures[0]);
  }

  swapSimBuffers();
  if (fpsDiv && !fpsDiv.hidden) {
    fpsDiv.innerText = "dt = " + (deltaTime * 1000).toFixed(4) + "ms";
  }
}

fxs.start(onStart, onNewFrame);