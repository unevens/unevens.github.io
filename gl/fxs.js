// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT
import * as twgl from "../twgl/twgl-full.module.js";
twgl.setDefaults({ attribPrefix: "a_" });
const m4 = twgl.m4;

const canvas = document.querySelector("#canvas");
const gl = canvas.getContext("webgl2");
gl.getExtension("EXT_color_buffer_float");
gl.getExtension("EXT_float_blend");
gl.getExtension("OES_draw_buffers_indexed");
gl.getExtension("OES_texture_float_linear");

//to-do check for gl failure, show message

const isMobile = (function () {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|canvas(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
})();

function getText(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText,
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText,
      });
    };
    xhr.send();
  });
}

const mouse = Float32Array.from([0.5, 0.5, 0.5, 0.5]);
let inputTime = performance.now();
let prevFrameTime = inputTime;

let mouseDown = false;
let updateMouseOnlyOnClick = false;

function setUpdateMouseOnlyOnClick(value) {
  updateMouseOnlyOnClick = value;
}

function isMouseDown() {
  return mouseDown;
}

function setMousePosition(x, y) {
  mouse[0] = mouse[2] = x;
  mouse[1] = mouse[3] = y;
}

function handleMouseMove(event) {
  if (updateMouseOnlyOnClick && !mouseDown) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  mouse[2] = (event.clientX - rect.x) / rect.width;
  mouse[3] = 1.0 - (event.clientY - rect.y) / rect.height;
}

function handleTouch(event) {
  const rect = canvas.getBoundingClientRect();
  const touches = event.changedTouches;
  if (touches.length > 0) {
    mouse[2] = (touches[0].clientX - rect.x) / rect.width;
    mouse[3] = 1.0 - (touches[0].clientY - rect.y) / rect.height;
  }
}

function interpolateInput(dt) {
  const alpha = 1.0 - Math.exp(-Math.PI * 0.002 * dt * 0.2);
  for (let i = 0; i < 2; i++) {
    mouse[i] += alpha * (mouse[i + 2] - mouse[i]);
  }
}
canvas.onmousemove = handleMouseMove;
canvas.onmousedown = (e) => {
  mouseDown = true;
  handleMouseMove(e);
};
canvas.onmouseup = (e) => {
  mouseDown = false;
};
canvas.addEventListener("touchstart", handleTouch);
canvas.addEventListener("touchend", handleTouch);
canvas.addEventListener("touchcancel", handleTouch);
canvas.addEventListener("touchmove", handleTouch);

const shaders = [];

class Shader {
  constructor(name, code = "") {
    this.name = name;
    this.code = code;
    shaders.push(this);
  }
  url() {
    return "shaders/" + this.name + ".glsl";
  }
  load() {
    if (this.code.length > 0) {
      return this.code;
    }
    return getText(this.url()).then(
      (text) => {
        this.code = text;
        console.log("loaded code for shader: " + this.name);
      },
      () => {
        console.log("error loading code for shader " + this.name);
      }
    );
  }
}

const programs = [];

class Program {
  constructor(vs, fs, macros) {
    this.macros = macros || [];
    this.vs = vs;
    this.fs = fs;
    programs.push(this);
  }

  onLoad() {
    this.setMacros(this.macros);
  }

  setMacros(macros) {
    this.macros = macros || [];
    let vs = this.vs.code.repeat(1);
    let fs = this.fs.code.repeat(1);
    if (vs && fs) {
      vs = applyMacros(vs, macros);
      fs = applyMacros(fs, macros);
      this.programInfo = createProgramInfo(vs, fs);
    }
  }

  setMacro(macro) {
    this.setMacros([macro]);
  }

  getProgram() {
    return this.programInfo.program;
  }

  bind() {
    gl.useProgram(this.getProgram());
  }

  setUniforms(uniforms) {
    twgl.setUniforms(this.programInfo, uniforms);
  }
}

const screenVS = new Shader("screenQuad");
const copyFS = new Shader("copy");
const threshFS = new Shader("threshold");
const maxBlendFS = new Shader("maxBlend");
const blurFS = new Shader("blur");
const copyProgram = new Program(screenVS, copyFS);
const threshProgram = new Program(screenVS, threshFS);
const maxBlendProgram = new Program(screenVS, maxBlendFS);
const createBlurProgram = () => new Program(screenVS, blurFS);

function initializePrograms() {
  for (const program of programs) {
    program.onLoad();
  }
}

const viewportSize = Float32Array.from([1920.0, 1080.0, 1.0 / 1920.0, 1.0 / 1080.0]);
const onResize = [];

function updateViewportSize() {
  const displayWidth = Math.floor(gl.canvas.clientWidth * window.devicePixelRatio);
  const displayHeight = Math.floor(gl.canvas.clientHeight * window.devicePixelRatio);
  if (gl.canvas.width != displayWidth || gl.canvas.height != displayHeight) {
    gl.canvas.width = displayWidth;
    gl.canvas.height = displayHeight;
    viewportSize[0] = displayWidth;
    viewportSize[1] = displayHeight;
    viewportSize[2] = 1.0 / displayWidth;
    viewportSize[3] = 1.0 / displayHeight;
    for (const r of onResize) r(viewportSize);
  }
}

function setCanvasViewport() {
  gl.viewport(0, 0, viewportSize[0], viewportSize[1]);
}

function start(onStart, onNewFrame) {
  shaders.push(screenVS);
  Promise.all(shaders.map((x) => x.load()))
    .then(function () {
      initializePrograms();
      onStart();
      function render(time) {
        updateViewportSize();
        gl.viewport(0, 0, canvas.width, canvas.height);
        const maxDeltaTime = 60;
        const deltaTime = Math.min(maxDeltaTime, time - prevFrameTime);
        prevFrameTime = time;
        interpolateInput(deltaTime);
        onNewFrame(time * 0.001, deltaTime * 0.001);
        requestAnimationFrame(render);
      }
      requestAnimationFrame(render);
    })
    .catch(function (err) {
      console.log("Failed Loading Shaders", err);
    });
}

function texImage2D(options, textureData) {
  textureData = textureData || null;
  const hasAlpha = options.hasAlpha || true;
  const flipY = options.flipY || false;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  if (options.bits == 16) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      hasAlpha ? gl.RGBA16F : gl.RGB16F,
      options.size[0],
      options.size[1],
      0,
      hasAlpha ? gl.RGBA : gl.RGB,
      gl.HALF_FLOAT,
      textureData
    );
  } else if (options.bits == 32) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      hasAlpha ? gl.RGBA32F : gl.RGB32F,
      options.size[0],
      options.size[1],
      0,
      hasAlpha ? gl.RGBA : gl.RGB,
      gl.FLOAT,
      textureData
    );
  } else if (options.bits == 8) {
    if (options.srgb) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        hasAlpha ? gl.SRGB8_ALPHA8 : gl.SRGB8,
        options.size[0],
        options.size[1],
        0,
        hasAlpha ? gl.RGBA : gl.RGB,
        gl.UNSIGNED_BYTE,
        textureData
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        hasAlpha ? gl.RGBA : gl.RGB,
        options.size[0],
        options.size[1],
        0,
        hasAlpha ? gl.RGBA : gl.RGB,
        gl.UNSIGNED_BYTE,
        textureData
      );
    }
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
}

class Framebuffer {
  constructor(options) {
    this.size = new Float32Array(4);
    if (options.size) {
      this.size[0] = options.size[0];
      this.size[1] = options.size[1];
    } else {
      this.size[0] = gl.drawingBufferWidth;
      this.size[1] = gl.drawingBufferHeight;
    }
    this.updateSize();
    this.filter = options.filter || gl.LINEAR;
    this.bits = options.bits || 8;
    this.hasAlpha = options.hasAlpha || true;
    const numAttachments = options.numAttachments || 1;
    this.depthFormat = options.depthFormat || null; //todo
    this.srgb = options.srgb || this.bits == 8;
    this.textures = [];
    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    for (let i = 0; i < numAttachments; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      this.textures[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filter);
      texImage2D(this);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.textures[i], 0);
    }
    this.check();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  updateSize() {
    for (let i = 0; i < 2; i++) {
      this.size[i + 2] = 1.0 / this.size[i];
    }
  }

  check() {
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER, this.fb);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
      if (status == gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT)
        console.log("gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT", this);
      else if (status == gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT)
        console.log("gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT", this);
      else if (status == gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS)
        console.log("gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS ", this);
      else if (status == gl.FRAMEBUFFER_UNSUPPORTED) console.log("gl.FRAMEBUFFER_UNSUPPORTED ", this);
      else if (status == gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE)
        console.log("gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE ", this);
      else log("framebuffer status not commplete: ", status, this);
    }
  }
  resize(size) {
    if (this.size[0] != size[0] || this.size[1] != size[1]) {
      this.size[0] = size[0];
      this.size[1] = size[1];
      this.updateSize();
      for (const texture of this.textures) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        texImage2D(this);
      }
      this.check();
    }
  }
  bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.viewport(0, 0, this.size[0], this.size[1]);
  }
}

function createScreenFramebuffer(options) {
  const resolutionCoef = options.resolutionCoef || (() => 1);
  const coef = resolutionCoef();
  options.size = [viewportSize[0] * coef, viewportSize[1] * coef];
  const rt = new Framebuffer(options);
  onResize.push((size) => {
    const coef = resolutionCoef();
    rt.resize([size[0] * coef, size[1] * coef]);
  });
  return rt;
}

function createProgramInfo(vs, fs) {
  const program = twgl.createProgramFromSources(gl, [vs, fs]);
  return twgl.createProgramInfoFromProgram(gl, program);
}

function applyMacros(text, macros) {
  if (!macros) return text;
  const firstLine = "#version 300 es\n";
  for (const macro of macros) {
    const code = text.substring(firstLine.length);
    text = firstLine + "#define " + macro + "\n" + code;
  }
  return text;
}

class VAO {
  constructor(attributes, indices) {
    const buffers = [];
    for (const att of attributes) {
      buffers.push(twgl.createBufferFromTypedArray(gl, att.data, gl.ARRAY_BUFFER));
    }
    const elements = twgl.createBufferFromTypedArray(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
    for (let i = 0; i < buffers.length; i++) {
      gl.enableVertexAttribArray(i);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i]);
      gl.vertexAttribPointer(i, attributes[i].numComponents, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    this.numElements = indices.length;
    this.elementType = twgl.getGLTypeForTypedArray(indices);
    this.vao = vao;
  }
  bind() {
    gl.bindVertexArray(this.vao);
  }
  draw() {
    gl.drawElements(gl.TRIANGLES, this.numElements, this.elementType, 0);
  }
  drawInstanced(numInstances) {
    gl.drawElementsInstanced(gl.TRIANGLES, this.numElements, this.elementType, 0, numInstances);
  }
}

const quadVAO = new VAO(
  [{ data: Float32Array.from([-1, -1, 1, -1, -1, 1, 1, 1]), numComponents: 2 }],
  Uint16Array.from([0, 1, 2, 2, 1, 3])
);

function binomialCoefficient(n, k) {
  if (k < 0 || k > n) {
    return 0;
  }
  if (k === 0 || k === n) {
    return 1;
  }
  if (k === 1 || k === n - 1) {
    return n;
  }
  let res = n;
  for (let i = 2; i <= k; i++) {
    res *= (n - i + 1) / i;
  }
  return Math.round(res);
}

class Bloom {
  constructor(options) {
    options = options || {};
    this.resolutionCoef = options.resolutionCoef || (() => 0.5);
    this.bits = options.bits || 8;
    this.taps = options.taps || 5;
    this.buffers = [createScreenFramebuffer(this), createScreenFramebuffer(this)];
    this.offset = new Float32Array(1);
    this.offset2 = new Float32Array(1);
    this.weight = new Float32Array(1);
    this.maxTaps = options.maxTaps || 32;
    this.blurProgram = createBlurProgram();
    this.setParams(options);
    onResize.push((size) => {
      this.updateKernel();
    });
  }

  setRadius(radius) {
    this.radius = radius;
    this.updateKernel();
  }

  setStrength(strength) {
    this.strength = strength;
    this.updateKernel();
  }

  setParams(options) {
    this.threshold = options.threshold || 0.9;
    this.radius = options.radius || 0.1;
    this.strength = options.strength || 0;
    this.numPasses = options.numPasses || 2;
    this.amount = options.amount || 2.0;
    this.updateKernel();
  }

  updateKernel() {
    const size = this.buffers[0].size;
    const minRes = Math.min(size[0], size[1]);
    let numDiscTaps = 1 + Math.round(minRes * this.radius);
    numDiscTaps = Math.min(this.maxTaps, Math.max(2, numDiscTaps));
    if (numDiscTaps % 2 == 0) numDiscTaps += 1;
    // console.log("num disc taps", numDiscTaps);
    const weight = new Array(numDiscTaps);
    const offset = new Array(numDiscTaps);
    for (let i = 0; i < numDiscTaps; i++) {
      offset[i] = i;
    }
    let nrmCoef = 0;
    const N = 2 * numDiscTaps - 2 + 2 * Math.round(this.strength);

    for (let i = -numDiscTaps + 1; i < numDiscTaps; i++) {
      const n = i + Math.floor(N / 2);
      const x = binomialCoefficient(N, n);
      // console.log(N, n, x);
    }

    for (let i = 0; i < numDiscTaps; i++) {
      weight[i] = binomialCoefficient(N, i + N / 2);
      // console.log(weight[i]);
      nrmCoef += weight[i];
      if (i > 0) {
        nrmCoef += weight[i];
      }
    }
    nrmCoef = 1.0 / nrmCoef;
    for (let i = 0; i < numDiscTaps; i++) {
      weight[i] *= nrmCoef;
    }
    let numLinTaps = (numDiscTaps - 1) / 2 + 1;
    // console.log("num lin taps", numLinTaps);

    if (this.weight.length != numLinTaps) {
      this.weight = new Float32Array(numLinTaps);
      this.offset = new Float32Array(numLinTaps);
      this.offset2 = new Float32Array(2 * numLinTaps);
      this.blurProgram.setMacro("NUM_TAPS " + numLinTaps);
    }
    this.weight[0] = weight[0];
    this.offset[0] = 0;
    for (let i = 1; i < numLinTaps; i++) {
      this.weight[i] = weight[2 * i - 1] + weight[2 * i];
      this.offset[i] = weight[2 * i - 1] * offset[2 * i - 1] + weight[2 * i] * offset[2 * i];
      this.offset[i] /= this.weight[i];
    }
    // console.log(this.weight);
    // console.log(this.offset);
    // console.log(offset);
  }

  apply(srcTexture) {
    const viewportSize = this.buffers[0].size;
    gl.viewport(0, 0, viewportSize[0], viewportSize[1]);
    this.buffers[0].bind();

    threshProgram.bind();
    threshProgram.setUniforms({
      srcTexture,
      threshold: this.threshold,
    });
    quadVAO.draw();

    this.blurProgram.bind();
    this.blurProgram.setUniforms({
      weight: this.weight,
    });

    for (let i = 0; i < this.numPasses; i++) {
      this.buffers[1].bind();
      for (let i = 0; i < this.offset.length; i++) {
        this.offset2[2 * i] = this.offset[i] * viewportSize[2];
        this.offset2[2 * i + 1] = 0.0;
      }
      this.blurProgram.setUniforms({
        offset: this.offset2,
        srcTexture: this.buffers[0].textures[0],
      });
      quadVAO.draw();
      this.buffers[0].bind();
      for (let i = 0; i < this.offset.length; i++) {
        this.offset2[2 * i] = 0.0;
        this.offset2[2 * i + 1] = this.offset[i] * viewportSize[3];
      }
      this.blurProgram.setUniforms({
        offset: this.offset2,
        srcTexture: this.buffers[1].textures[0],
      });
      quadVAO.draw();
    }
  }

  copyResultTo(dstFbo) {
    if (dstFbo) {
      dstFbo.bind();
    } else {
      twgl.bindFramebufferInfo(gl, null);
    }
    copyProgram.bind();
    copyProgram.setUniforms({
      srcTexture: this.buffers[0].textures[0],
    });
    quadVAO.draw();
  }

  addTo(src, dstFbo) {
    if (dstFbo) {
      dstFbo.bind();
    } else {
      twgl.bindFramebufferInfo(gl, null);
    }
    maxBlendProgram.bind();
    maxBlendProgram.setUniforms({
      srcTexture: src,
      bloomTexture: this.buffers[0].textures[0],
      bloomCoef: this.amount,
    });
    quadVAO.draw();
  }

  getResult() {
    return this.buffers[0].textures[0];
  }
}

export {
  twgl,
  start,
  gl,
  isMobile,
  Shader,
  Framebuffer,
  createScreenFramebuffer,
  createProgramInfo,
  screenVS,
  copyProgram,
  threshProgram,
  viewportSize,
  mouse,
  VAO,
  quadVAO,
  setCanvasViewport,
  Program,
  Bloom,
  setUpdateMouseOnlyOnClick,
  isMouseDown,
  setMousePosition,
  texImage2D
};
