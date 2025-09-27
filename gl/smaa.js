// Copyright © Dario Mambro 2023
// Distributed under the MIT license. https://opensource.org/licenses/MIT

import * as fxs from "./fxs.js";
import * as smaa from "../smaa/smaa-resources.js"
const twgl = fxs.twgl;
const gl = fxs.gl;

const SmaaQualityPresets = new Map();
SmaaQualityPresets["low"] = "SMAA_PRESET_LOW";
SmaaQualityPresets["medium"] = "SMAA_PRESET_MEDIUM";
SmaaQualityPresets["high"] = "SMAA_PRESET_HIGH";
SmaaQualityPresets["ultra"] = "SMAA_PRESET_ULTRA";

const SmaaEdgeDetection = new Map();
SmaaEdgeDetection["depth"] = "SMAA_EDGES_DEPTH";
SmaaEdgeDetection["luma"] = "SMAA_EDGES_LUMA";
SmaaEdgeDetection["color"] = "SMAA_EDGES_COLOR";

class Smaa {
    constructor(options) {
        this.debug = 1;

        this.edgeBuffer = fxs.createScreenFramebuffer({ bits: 16 });
        this.weightBuffer = fxs.createScreenFramebuffer({ bits: 16 });

        this.searchTexture = twgl.createTexture(gl, { src: "../smaa/SmaaSearchTex.png", flipY: true });
        this.areaTexture = twgl.createTexture(gl, {src: "../smaa/SmaaareaTex.png"});

        this.uTexelSize = new Float32Array(2);
        this.uViewportSize = new Float32Array(2);

        this.vao = new fxs.VAO(
            [{ data: Float32Array.from([-4, -4, 4, -4, -4, 4, 4, 4]), numComponents: 2 }],
            Uint16Array.from([0, 1, 2, 2, 1, 3])
        );

        this.setOptions(options);
    }

    setOptions(options = {}) {
        this.options = options;

        const edge_channel = options.edge_channel || "luma";
        const preset = options.preset || "medium";
        const edge_threshold = options.edge_threshold || 0.1;
        const local_contrast_adpatation_factor = options.local_contrast_adpatation_factor || 2.0;
        const predication = options.predication || 0;

        const edgeMacro = SmaaEdgeDetection[edge_channel] || SmaaEdgeDetection["luma"];
        const presetMacro = SmaaQualityPresets[preset] || SmaaQualityPresets["medium"];

        const edge_vs_code = `#define ${edgeMacro} 
#define ${presetMacro}
${smaa.PRESETS}
${smaa.SMAA_EDGES_VERT}`;
        const edge_vs = new fxs.Shader("smaa_edge_vs", edge_vs_code);

        const edge_fs_code = `#define ${edgeMacro} 
#define ${presetMacro}
${smaa.PRESETS}
${smaa.SMAA_EDGES_FRAG}`;
        const edge_fs = new fxs.Shader("smaa_edge_fs", edge_fs_code);

        this.edgeProgram = new fxs.Program(edge_vs, edge_fs);

        const weight_vs_code = `#define ${presetMacro}
${smaa.PRESETS}
${smaa.SMAA_WEIGHTS_VERT}`;
        const weight_vs = new fxs.Shader("smaa_weight_vs", weight_vs_code);

        const weight_fs_code = `#define ${presetMacro}
${smaa.PRESETS}
${smaa.SMAA_WEIGHTS_FRAG}`;
        const weight_fs = new fxs.Shader("smaa_weight_fs", weight_fs_code);

        this.weightProgram = new fxs.Program(weight_vs, weight_fs);

        const blend_vs_code = `#define ${presetMacro}
${smaa.PRESETS}
${smaa.SMAA_BLEND_VERT}`;
        const blend_fs_code = `#define ${presetMacro}
${smaa.PRESETS}
${smaa.SMAA_BLEND_FRAG}`;

        const blend_vs = new fxs.Shader("smaa_blend_vs", blend_vs_code);
        const blend_fs = new fxs.Shader("smaa_blend_fs", blend_fs_code);

        this.blendProgram = new fxs.Program(blend_vs, blend_fs);
    }

    apply(srcTexture, dstFbo) {
        const viewportSize = this.edgeBuffer.size;
        gl.disable(gl.BLEND);
        gl.viewport(0, 0, viewportSize[0], viewportSize[1]);
        this.uViewportSize[0] = viewportSize[0];
        this.uViewportSize[1] = viewportSize[1];
        this.uTexelSize[0] = viewportSize[2];
        this.uTexelSize[1] = viewportSize[3];
        // edges
        this.edgeBuffer.bind();
        this.edgeProgram.bind();
        this.edgeProgram.setUniforms({
            uTexelSize: this.uTexelSize,
            uColorTexture: srcTexture
        });
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //not sure why, but without this the edge textures accumulates
        // this.vao.draw();
        fxs.quadVAO.draw();
        // weights
        this.weightBuffer.bind();
        this.weightProgram.bind();
        this.weightProgram.setUniforms({
            uTexelSize: this.uTexelSize,
            uViewportSize: this.uViewportSize,
            uEdgesTexture: this.edgeBuffer.textures[0],
            uSearchTexture: this.searchTexture,
            uAreaTexture: this.areaTexture
        });
        // fxs.quadVAO.draw();
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //
        fxs.quadVAO.draw();
        //this.vao.draw();
        //blend
        if (dstFbo) {
            dstFbo.bind();
        } else {
            twgl.bindFramebufferInfo(gl, null);
        }
        this.blendProgram.bind();
        this.blendProgram.setUniforms({
            uTexelSize: this.uTexelSize,
            uColorTexture: srcTexture,
            uBlendTexture: this.weightBuffer.textures[0]
        });
        fxs.quadVAO.draw();
        //this.vao.draw();


        if (this.debug) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            fxs.copyProgram.bind();
            fxs.copyProgram.setUniforms({
                srcTexture: this.debug == 2 ? this.edgeBuffer.textures[0] : this.weightBuffer.textures[0],
            });
            fxs.quadVAO.draw();
            //this.vao.draw();

            // fxs.copyProgram.setUniforms({
            //     srcTexture: this.searchTexture,
            // });
            // fxs.quadVAO.draw();
            //this.vao.draw();


        }



    }

}

export {
    Smaa
}