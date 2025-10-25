// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

import * as fxs from "./fxs.js";
import * as AA from "./smaa.js";
import { setBuiltinTheme, simulations, particles, addToOnThemeChangedDelegate, registerThemeDataInterface } from "./params.js";
const gl = fxs.gl;
const isMobile = fxs.isMobile;

const particleVS = new fxs.Shader("particleQuad");
const particleVelAlignedVS = new fxs.Shader("particleQuadVelAligned");
const initSimFS = new fxs.Shader("initSim");
const initSimProgram = new fxs.Program(fxs.screenVS, initSimFS);
const simulationShaders = simulations.map((x) => new fxs.Shader(x));
const particleShaders = particles.map((x) => new fxs.Shader(x));
const simulationPrograms = simulationShaders.map((x) => new fxs.Program(fxs.screenVS, x));
const particlePrograms = particleShaders.map((x) => new fxs.Program(particleVS, x));
const particleProgramsVelAligned = particleShaders.map((x) => new fxs.Program(particleVelAlignedVS, x));

const simSide = isMobile ? 32 : 64; //mah

const settings = {
  simSize: [simSide, simSide],
  resolutionCoef: 1.0,
};

let bloom = new fxs.Bloom();
let smaa = new AA.Smaa({ preset: "ultra", edge_channel: "color" });
smaa.debug = 0;

let pause = false;
let doAA = true;
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

class ParticleLayer {

  constructor(options) {
    console.log("ParticleLayer ctor", options);

    this.params = options.params;
    console.log(this.params);
    this.simulation = "";
    this.particle = "";
    this.alignment = "";
    this.simulationProgram = null;
    this.particleProgram = null;
    this.borderPolicy = this.params.borderPolicy || "wrap";
    this.simulationSize = new Float32Array(4);
    this.simBuffers = [
      new fxs.Framebuffer({ size: settings.simSize, filter: gl.NEAREST, bits: 16 }),
      new fxs.Framebuffer({ size: settings.simSize, filter: gl.NEAREST, bits: 16 }),
    ];

    ///// DRAWING
    this.fbos = options.fbos;
    for (let i = 0; i < 2; i++) {
      this.fbos[i] = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => settings.resolutionCoef });
    }
    this.viewportSize = Float32Array.from(fxs.viewportSize);
    this.interactionPoint = Float32Array.from(fxs.mouse);
    this.ratioXonY = Float32Array.from([1, 1]);
    this.ratioYonX = Float32Array.from([1, 1]);
    this.sideThresh = Float32Array.from([1, 1]);
  }

  numParticles() { return Math.min(this.params.numParticles, settings.simSize[0] * settings.simSize[1]); }

  checkUpdatePrograms() {
    if (this.simulation != this.params.simulation || this.borderPolicy != this.params.borderPolicy) {
      this.simulation = this.params.simulation;
      this.borderPolicy = this.params.borderPolicy;
      this.simulationProgram = simulationPrograms.find((p) => p.fs.name == this.simulation);
      const loopMacro = "PERIODIC " + (this.borderPolicy == "wrap" ? "1" : "0");
      this.simulationProgram.setMacro(loopMacro);
    }
    if (this.particle != this.params.particle || this.alignment != this.params.alignment) {
      this.particle = this.params.particle;
      this.alignment = this.params.alignment;
      let programs = particlePrograms;
      if (this.params.alignment == "velocity") {
        programs = particleProgramsVelAligned;
      }
      this.particleProgram = programs.find((p) => p.fs.name == this.particle);
    }
  }

  checkUpdateSimulationSize() {
    if (this.simulationSize[0] != settings.simSize[0] || this.simulationSize[1] != settings.simSize[1]) {
      this.simulationSize[0] = settings.simSize[0];
      this.simulationSize[1] = settings.simSize[1];
      this.simulationSize[2] = 1.0 / settings.simSize[0];
      this.simulationSize[3] = 1.0 / settings.simSize[1];
      for (const buffer of this.simBuffers) {
        buffer.resize(settings.simSize);
      }
    }
  }

  swapSimBuffers() {
    const temp = this.simBuffers[0];
    this.simBuffers[0] = this.simBuffers[1];
    this.simBuffers[1] = temp;
  }

  initializeParticles() {
    this.checkUpdateSimulationSize();
    this.simBuffers[0].bind();
    initSimProgram.bind();
    initSimProgram.setUniforms({
      cellRadius: [0.5 / settings.simSize[0], 0.5 / settings.simSize[1]],
      noizAmount: [0.3, 0.01],
      noizSeed: [Math.sin(performance.now()), Math.cos(performance.now())],
    });
    fxs.quadVAO.draw();
    fxs.setMousePosition(this.params.interactionStartX, this.params.interactionStartY);
  }

  setParams(params) {
    this.params = params;
  }

  onNewFrame(time, deltaTime, isLastLayer) {
    if (pause) {
      deltaTime = 0;
    }
    this.checkUpdatePrograms();
    for (let i = 0; i < 2; i++) {
      this.viewportSize[i] = fxs.viewportSize[i] * settings.resolutionCoef;
      this.viewportSize[i + 2] = fxs.viewportSize[i + 2] / settings.resolutionCoef;
    }

    const wideScreen = this.viewportSize[0] > this.viewportSize[1];
    this.ratioXonY[1] = this.viewportSize[3] * this.viewportSize[0];
    this.ratioYonX[0] = this.viewportSize[2] * this.viewportSize[1];
    let sideThresholdBase = this.params.sideThreshold;
    if (wideScreen) {
      this.sideThresh[0] = this.ratioXonY[1] - this.ratioXonY[0] * (1.0 - sideThresholdBase);
      this.sideThresh[1] = sideThresholdBase;
    } else {
      this.sideThresh[0] = sideThresholdBase;
      this.sideThresh[1] = this.ratioYonX[0] - this.ratioYonX[1] * (1.0 - sideThresholdBase);
    }

    if (this.params.interaction == "random_walk") {
      fxs.setUpdateMouseOnlyOnClick(true);
      if (fxs.isMouseDown()) {
        if (wideScreen) {
          this.interactionPoint[0] = 0.5 + (fxs.mouse[0] - 0.5) * this.ratioXonY[1];
          this.interactionPoint[1] = fxs.mouse[1];
        } else {
          this.interactionPoint[0] = fxs.mouse[0];
          this.interactionPoint[1] = 0.5 + (fxs.mouse[1] - 0.5) * this.ratioYonX[0];
        }
      } else {
        this.interactionPoint[0] = this.interactionPoint[0] + this.params.randomWalkSpeed * (2.0 * Math.random() - 1.0);
        this.interactionPoint[0] -= Math.floor(this.interactionPoint[0]);
        if (this.interactionPoint[0] < 0.0) {
          this.interactionPoint[0] += 1.0;
        }
        this.interactionPoint[1] = this.interactionPoint[1] + this.params.randomWalkSpeed * (2.0 * Math.random() - 1.0);
        this.interactionPoint[1] -= Math.floor(this.interactionPoint[1]);
        if (this.interactionPoint[1] < 0.0) {
          this.interactionPoint[1] += 1.0;
        }
      }
    } else {
      if (this.params.interaction == "follow_mouse") {
        fxs.setUpdateMouseOnlyOnClick(false);
      } else if (this.params.interaction == "on_click") {
        fxs.setUpdateMouseOnlyOnClick(true);
      }
      if (wideScreen) {
        this.interactionPoint[0] = 0.5 + (fxs.mouse[0] - 0.5) * this.ratioXonY[1];
        this.interactionPoint[1] = fxs.mouse[1];
      } else {
        this.interactionPoint[0] = fxs.mouse[0];
        this.interactionPoint[1] = 0.5 + (fxs.mouse[1] - 0.5) * this.ratioYonX[0];
      }
    }

    //this.simulation
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    this.checkUpdateSimulationSize();
    this.simBuffers[1].bind();
    this.simulationProgram.bind();
    this.simulationProgram.setUniforms({
      stateTexture: this.simBuffers[0].textures[0],
      viewportSize: this.simBuffers[1].size,
      attractor: this.interactionPoint,
      dt: deltaTime,
      time,
      sideThresh: this.sideThresh,
      numParticles: this.numParticles()
    });

    const simParams = this.params[this.simulation];
    if (simParams) {
      this.simulationProgram.setUniforms(simParams);
    }
    fxs.quadVAO.draw();

    //draw
    this.fbos[0].bind();
    gl.viewport(0, 0, this.viewportSize[0], this.viewportSize[1]);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (this.params.blend_mode === "alpha_blend") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else if (this.params.blend_mode === "additive") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    } else if (this.params.blend_mode === "alpha_mask") {
      gl.enable(gl.DEPTH_TEST);
    }

    this.particleProgram.bind();
    this.particleProgram.setUniforms({
      simulation: this.simBuffers[1].textures[0],
      simulationSize: this.simulationSize,
      particleSize: [this.params.particleHeight * this.params.particleAspectRatio, this.params.particleHeight],
      ratio: wideScreen ? this.ratioYonX : this.ratioXonY,
      time,
    });
    const particleParams = this.params[this.particle];
    if (particleParams) {
      this.particleProgram.setUniforms(particleParams);
    }
    fxs.quadVAO.drawInstanced(this.numParticles());

    if (this.params.blend_mode === "alpha_blend") {
      gl.disable(gl.BLEND);
    } else if (this.params.blend_mode === "additive") {
      gl.disable(gl.BLEND);
    } else if (this.params.blend_mode === "alpha_mask") {
      gl.disable(gl.DEPTH_TEST);
    }

    bloom.setParams(this.params.bloom);
    bloom.apply(this.fbos[0].textures[0]);
    if (isLastLayer) {
      bloom.addTo(this.fbos[0].textures[0]);
    } else {
      bloom.addTo(this.fbos[0].textures[0], this.fbos[2]);
    }
    this.swapSimBuffers();
  }

};


class ParticleScene {

  constructor() {
    this.theme = { layers: [] };
    this.particleLayers = [];
    this.fbos = [];
    for (let i = 0; i < 3; i++) {
      this.fbos[i] = fxs.createScreenFramebuffer({ bits: 8, resolutionCoef: () => settings.resolutionCoef });
    }
    this.isAntiAliasEnabled = true;
    this.hasStarted = false;
    addToOnThemeChangedDelegate(() => {
      if (this.hasStarted)
        this.initializeAllParticles();
    });
    const refresh = document.getElementById("refresh");
    refresh.onclick = () => {
      this.initializeAllParticles();
    };
    registerThemeDataInterface(() => this.theme, (themeData) => { this.setTheme(themeData); });
  }

  setTheme(theme) {
    this.theme = theme || { layers: [] };
    const minNumLayers = Math.min(this.theme.layers.length, this.particleLayers.length);
    for (let i = 0; i < minNumLayers; ++i) {
      this.particleLayers[i].setParams(this.theme.layers[i]);
    }
    this.particleLayers.length = minNumLayers;
    for (let i = minNumLayers; i < this.theme.layers.length; ++i) {
      const layer = new ParticleLayer({ fbos: this.fbos, params: this.theme.layers[i] });
      this.particleLayers.push(layer);
    }
  }

  onNewFrame(time, deltaTime) {
    if (this.isAntiAliasEnabled && doAA) {
      for (let layer of this.particleLayers) {
        layer.onNewFrame(time, deltaTime, false);
      }
      smaa.apply(this.fbos[2].textures[0]);
    } else {
      const lastLayerIndex = this.particleLayers.length - 1;
      for (let i = 0; i < lastLayerIndex; ++i) {
        this.particleLayers[i].onNewFrame(time, deltaTime, false);
      }
      this.particleLayers[lastLayerIndex].onNewFrame(time, deltaTime, true);
    }
  }

  initializeAllParticles() {
    for (let layer of this.particleLayers) {
      layer.initializeParticles();
    }
  }

  onStart() {
    fxs.quadVAO.bind();
    this.initializeAllParticles();
    this.hasStarted = true;
  }

  start() {
    fxs.start(() => this.onStart(), (time, deltaTime) => this.onNewFrame(time, deltaTime));
  }
};

function createParticleScene(themeName) {
  const scene = new ParticleScene();
  setBuiltinTheme(themeName);
  return scene;
}

export {
  ParticleScene, createParticleScene
}