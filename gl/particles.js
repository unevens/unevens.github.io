// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

import * as fxs from "./fxs.js";

const twgl = fxs.twgl;
const gl = fxs.gl;
const isMobile = fxs.isMobile;

const particleVS = new fxs.Shader("particleQuad");

const simulations = ["gravity"];
const particles = ["uvDebug", "sdf_01"];
const simulationShaders = simulations.map((x) => new fxs.Shader(x));
const particleShaders = particles.map((x) => new fxs.Shader(x));
const simulationPrograms = simulationShaders.map((x) => new fxs.Program(fxs.screenVS, x));
const particlePrograms = particleShaders.map((x) => new fxs.Program(particleVS, x));

const simSide = isMobile ? 32 : 64;

let params = {
  simSize: [simSide, simSide],
  simulation: simulationShaders[0].name,
  particle: particleShaders[1].name,
  loopScreen: true,
  resolutionCoef: 1.0,

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

  particleSize: [0.05, 0.05],
  blinkSpeedMin: 1.0,
  blinkSpeedMax: 10.0,

  tonemap_params: {
    something: 0.0,
  },

  sdf_01_params: {
    hueVariation: 0.025,
    hueSpeed: 0.05,
    maxColorHsv: [1.0 / 6.0, 0.7, 1.0],
    minColorHsv: [5.0 / 6.0, 0.2, 0.33],
  },

  bloom_params: {
    numPasses: 4,
    amount: 2.25,
    threshold: 0.9,
    radius: 0.2,
    strength: 20,
  },
};

const numParticles = () => params.simSize[0] * params.simSize[1];

let simulation = "";
let particle = "";
let simulationProgram;
let particleProgram;
let loopingScreen = params.loopScreen;

function checkUpdatePrograms() {
  if (simulation != params.simulation || loopingScreen != params.loopScreen) {
    simulation = params.simulation;
    loopingScreen = params.loopScreen;

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
  new fxs.Framebuffer({ size: params.simSize, filter: gl.NEAREST, bits: 16 }),
  new fxs.Framebuffer({ size: params.simSize, filter: gl.NEAREST, bits: 16 }),
];

const simulationSize = new Float32Array(4);

function checkUpdateSimulationSize() {
  if (simulationSize[0] != params.simSize[0] || simulationSize[1] != params.simSize[1]) {
    simulationSize[0] = params.simSize[0];
    simulationSize[1] = params.simSize[1];
    simulationSize[2] = 1.0 / params.simSize[0];
    simulationSize[3] = 1.0 / params.simSize[1];
    for (const buffer of simBuffers) {
      buffer.resize(params.simSize);
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
    cellRadius: [0.5 / params.simSize[0], 0.5 / params.simSize[1]],
    noizAmount: [0.3, 0.01],
    noizSeed: [Math.sin(performance.now()), Math.cos(performance.now())],
  });
  fxs.quadVAO.draw();
}

///// DRAWING

const drawBuffer = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => params.resolutionCoef });
const viewportSize = Float32Array.from(fxs.viewportSize);
const mouse = Float32Array.from(fxs.mouse);
const ratioXonY = Float32Array.from([1, 1]);
const ratioYonX = Float32Array.from([1, 1]);
const sideThresh = Float32Array.from([1, 1]);

// const tempBuffer = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => params.resolutionCoef });

let bloom = new fxs.Bloom();

function onStart() {
  fxs.quadVAO.bind();
  initializeParticles();
  bloom.setParams(params.bloom_params);
}

function onNewFrame(time, deltaTime) {
  checkUpdatePrograms();
  for (let i = 0; i < 2; i++) {
    viewportSize[i] = fxs.viewportSize[i] * params.resolutionCoef;
    viewportSize[i + 2] = fxs.viewportSize[i + 2] / params.resolutionCoef;
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

  gl.disable(gl.BLEND);
  //simulation
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
  drawBuffer.bind();
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, viewportSize[0], viewportSize[1]);
  particleProgram.bind();

  particleProgram.setUniforms({
    simulation: simBuffers[1].textures[0],
    simulationSize,
    particleSize: params.particleSize,
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
  gl.disable(gl.DEPTH_TEST);

  bloom.apply(drawBuffer.textures[0]);
  bloom.addTo(drawBuffer.textures[0]);

  swapSimBuffers();
}

fxs.start(onStart, onNewFrame);