// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

import * as fxs from "./fxs.js";

const twgl = fxs.twgl;
const gl = fxs.gl;
const isMobile = fxs.isMobile;

const simulationShaders = ["gravity"].map((x) => new fxs.Shader(x));
const particleShaders = ["uvDebug", "sdf_01"].map((x) => new fxs.Shader(x));

const simSide = isMobile ? 32 : 64;

let params = {
  simSize: [simSide, simSide],
  simulationFS: simulationShaders[0].name,
  particleFS: particleShaders[1].name,

  resolutionCoef: 1.0,

  gravity_params: {
    attractToTouch: 0.005,
    attractToTouchPower: 4.0,
    maxForce: 0.25,
    dragCoef: 1.0,
    noizForce: 0.8,
    pulseCoef: 0.1,
    pulseFreq: 0.1,
    sideThreshold: 1.0,
    sideForce: 1.5,
    hardSide: 0.05
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

  bloom_params:{
    resolutionCoef: 0.5,
    kernelSize: 4
  }

};

const numParticles = () => params.simSize[0] * params.simSize[1];

///// PROGRAMS
const devFS = new fxs.Shader("dev");
let devProgram;

const particleVS = new fxs.Shader("particleQuad");
const initSimFS = new fxs.Shader("initSim");
let initSimProgram;

let simulationFS = "";
let particleFS = "";
let simulationProgram;
let particleProgram;

function checkUpdatePrograms() {
  if (simulationFS.name != params.simulationFS) {
    simulationFS = simulationShaders.find((x) => x.name == params.simulationFS);
    simulationProgram = fxs.createProgram(fxs.screenVS.code, simulationFS.code);
  }
  if (particleFS.name != params.particleFS) {
    particleFS = particleShaders.find((x) => x.name == params.particleFS);
    particleProgram = fxs.createProgram(particleVS.code, particleFS.code);
  }
}

const tonemapShader = new fxs.Shader("tonemap");

let tonemapProgram;
let blurProgram;
let postProcessProgram;


function initializePrograms() {
  tonemapProgram = fxs.createProgram(fxs.screenVS.code, tonemapShader.code);
  initSimProgram = fxs.createProgram(fxs.screenVS.code, initSimFS.code);
  devProgram = fxs.createProgram(fxs.screenVS.code, devFS.code);
}

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
  gl.useProgram(initSimProgram.program);
  twgl.setUniforms(initSimProgram, {
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

const tempBuffer = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => params.resolutionCoef });


function onStart() {
  fxs.quadVAO.bind();
  initializePrograms();
  initializeParticles();
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
    sideThresh[1] = ratioXonY[0] - ratioXonY[1] * (1.0 - sideThresholdBase);
  }

  gl.disable(gl.BLEND);
  //simulation
  checkUpdateSimulationSize();
  simBuffers[1].bind();
  gl.useProgram(simulationProgram.program);
  twgl.setUniforms(simulationProgram, {
    stateTexture: simBuffers[0].textures[0],
    attractor: mouse,
    dt: deltaTime,
    time,
    sideThresh
  });

  const simParams = params[simulationFS.name + "_params"];
  if (simParams) {
    twgl.setUniforms(simulationProgram, simParams);
  }
  fxs.quadVAO.draw();

  //draw
  drawBuffer.bind();
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, viewportSize[0], viewportSize[1]);
  gl.useProgram(particleProgram.program);

  twgl.setUniforms(particleProgram, {
    simulation: simBuffers[1].textures[0],
    simulationSize,
    particleSize: params.particleSize,
    ratio: wideScreen ? ratioYonX : ratioXonY,
    time,
    blinkSpeedMin: params.blinkSpeedMin,
    blinkSpeedMax: params.blinkSpeedMax,
  });
  const particleParams = params[particleFS.name + "_params"];
  if (particleParams) {
    twgl.setUniforms(particleProgram, particleParams);
  }
  fxs.quadVAO.drawInstanced(numParticles());
  gl.disable(gl.DEPTH_TEST);

  //post process to-do

  twgl.bindFramebufferInfo(gl, null);

  // gl.useProgram(tonemapProgram.program);
  // twgl.setUniforms(tonemapProgram, params.tonemap_params);
  // twgl.setUniforms(tonemapProgram, {
  //   hdrTexture: tempBuffer.textures[0],
  // });

  gl.useProgram(fxs.copyProgram.program);
  twgl.setUniforms(fxs.copyProgram, {
    srcTexture: drawBuffer.textures[0],
  });

  fxs.quadVAO.draw();

  gl.useProgram(devProgram.program);
  fxs.quadVAO.draw();
  
  swapSimBuffers();
}

fxs.start(onStart, onNewFrame);
