import React, { useEffect, useMemo, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function PixelWiggleImage(props: Props) {
    const { image, tile, offset, style } = props

    // Container and canvas refs
    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Internal WebGL state refs to avoid re-creating objects unnecessarily
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const bufferRef = useRef<WebGLBuffer | null>(null)
    const textureRef = useRef<WebGLTexture | null>(null)
    const animRef = useRef<number | null>(null)
    const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({})
    const imageObjRef = useRef<HTMLImageElement | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)

    // Device pixel ratio (cap at 2 to limit GPU cost)
    const devicePixelRatio = useMemo(() => Math.min(window.devicePixelRatio || 1, 2), [])

    // Inline styles only. The outer sizing is controlled by Framer; inner fills 100%.
    const containerStyle: React.CSSProperties = {
        ...(style as React.CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    const canvasStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100%",
        display: "block",
    }

    // Shaders converted from reference.html
    const vertexShaderSource = useMemo(
        () => `
precision highp float;
varying vec2 vUv;
attribute vec2 a_position;
void main () {
  vUv = 0.5 * (a_position + 1.0);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,
        []
    )

    const fragmentShaderSource = useMemo(
        () => `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D u_image_texture;
uniform vec2 u_pointer;
uniform vec3 u_dot_color;
uniform float u_time;
uniform float u_tile_scale;
uniform float u_offset;
uniform float u_container_aspect;
uniform float u_image_aspect;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main () {
  // Base UV in texture space (flip Y once)
  vec2 base_uv = vUv;
  base_uv.y = 1.0 - base_uv.y;

  // 1) Cover mapping first (maintain aspect, fill container)
  vec2 scale = vec2(1.0);
  if (u_container_aspect > u_image_aspect) {
    // Container wider than image: crop left/right
    scale.y = u_image_aspect / u_container_aspect;
  } else {
    // Container taller than image: crop top/bottom
    scale.x = u_container_aspect / u_image_aspect;
  }
  vec2 fit_uv = (base_uv - 0.5) * scale + 0.5;

  // 2) Then apply tiling/distortion in the already cover-mapped space
  vec2 sampling_uv = fit_uv - 0.5;
  sampling_uv /= u_tile_scale;
  vec2 fract_uv = fract(sampling_uv);
  vec2 floor_uv = floor(sampling_uv);
  fract_uv.x += u_offset * snoise(floor_uv + 0.001 * u_time);
  sampling_uv = (floor_uv + fract_uv);
  sampling_uv *= u_tile_scale;
  sampling_uv += 0.5;

  // Sample with clamped UVs and crop to the cover area using fit_uv bounds
  vec2 uv_clamped = clamp(sampling_uv, 0.0, 1.0);
  vec4 img_shifted = texture2D(u_image_texture, uv_clamped);
  float alphaX = step(0.0, fit_uv.x) * (1.0 - step(1.0, fit_uv.x));
  float alphaY = step(0.0, fit_uv.y) * (1.0 - step(1.0, fit_uv.y));
  float alpha = alphaX * alphaY;
  img_shifted.a *= alpha;
  gl_FragColor = img_shifted;
}
`,
        []
    )

    // Initialize WebGL, shaders, buffers, and uniforms
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const gl =
            (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
        if (!gl) {
            // Graceful fallback: show a message in the container
            return
        }

        glRef.current = gl

        const createShader = (source: string, type: number) => {
            const shader = gl.createShader(type)
            if (!shader) return null
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Shader compile error:", gl.getShaderInfoLog(shader))
                gl.deleteShader(shader)
                return null
            }
            return shader
        }

        const vert = createShader(vertexShaderSource, gl.VERTEX_SHADER)
        const frag = createShader(fragmentShaderSource, gl.FRAGMENT_SHADER)
        if (!vert || !frag) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vert)
        gl.attachShader(program, frag)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program))
            return
        }
        programRef.current = program
        gl.useProgram(program)

        // Create quad buffer for two triangles covering clip space
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ])
        const buffer = gl.createBuffer()
        if (!buffer) return
        bufferRef.current = buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        const positionLocation = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Collect uniforms
        const getUniforms = (prog: WebGLProgram) => {
            const uniforms: Record<string, WebGLUniformLocation | null> = {}
            const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number
            for (let i = 0; i < count; i++) {
                const info = gl.getActiveUniform(prog, i)
                if (!info) continue
                uniforms[info.name] = gl.getUniformLocation(prog, info.name)
            }
            return uniforms
        }
        uniformsRef.current = getUniforms(program)

        // Initialize aspect ratio uniforms
        const containerAspect = container.clientWidth / container.clientHeight
        const uContainerAspect = uniformsRef.current["u_container_aspect"]
        const uImageAspect = uniformsRef.current["u_image_aspect"]
        if (uContainerAspect) gl.uniform1f(uContainerAspect, containerAspect)
        if (uImageAspect) gl.uniform1f(uImageAspect, 1.0) // Default to square until image loads

        // Create texture placeholder
        const texture = gl.createTexture()
        if (!texture) return
        textureRef.current = texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const uImage = uniformsRef.current["u_image_texture"]
        if (uImage) gl.uniform1i(uImage, 0)

        // Initial sizing and ResizeObserver
        const resize = () => {
            const w = Math.max(canvas.clientWidth, 2)
            const h = Math.max(canvas.clientHeight, 2)
            const width = Math.floor(w * devicePixelRatio)
            const height = Math.floor(h * devicePixelRatio)
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
            }
            gl.viewport(0, 0, canvas.width, canvas.height)
            
            // Update container aspect ratio uniform
            const containerAspect = w / h
            const uContainerAspect = uniformsRef.current["u_container_aspect"]
            if (uContainerAspect) gl.uniform1f(uContainerAspect, containerAspect)
        }

        resize()
        const ro = new ResizeObserver(() => resize())
        resizeObserverRef.current = ro
        ro.observe(container)

        // Framer Canvas mode often needs extra passes
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(resize, 50)
            setTimeout(resize, 150)
        }

        // Start RAF loop
        const uTime = uniformsRef.current["u_time"]
        const uTile = uniformsRef.current["u_tile_scale"]
        const uOffset = uniformsRef.current["u_offset"]
        const render = () => {
            if (!gl || !programRef.current) return
            // Update uniforms
            if (uTime) gl.uniform1f(uTime, performance.now())
            if (uTile) {
                const scale = canvas.clientHeight > 0 ? tile / canvas.clientHeight : 1
                gl.uniform1f(uTile, scale)
            }
            if (uOffset) gl.uniform1f(uOffset, offset)

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            animRef.current = requestAnimationFrame(render)
        }
        render()

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current)
            if (resizeObserverRef.current) {
                try { resizeObserverRef.current.disconnect() } catch {}
            }
        }
    }, [vertexShaderSource, fragmentShaderSource, tile, offset, devicePixelRatio, image])

    // (Re)load texture when image prop changes
    useEffect(() => {
        const gl = glRef.current
        const texture = textureRef.current
        const canvas = canvasRef.current
        if (!gl || !texture || !canvas || !image?.src) return

        const img = new Image()
        imageObjRef.current = img
        img.crossOrigin = "anonymous"
        img.src = image.src
        img.onload = () => {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

            // Update image aspect ratio uniform for cover behavior
            const imageAspect = img.naturalWidth / img.naturalHeight
            const uImageAspect = uniformsRef.current["u_image_aspect"]
            if (uImageAspect) gl.uniform1f(uImageAspect, imageAspect)
        }

        return () => {
            imageObjRef.current = null
        }
    }, [image])

    // Cleanup GL resources on unmount
    useEffect(() => {
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current)
            const gl = glRef.current
            if (!gl) return
            try {
                if (textureRef.current) gl.deleteTexture(textureRef.current)
                if (bufferRef.current) gl.deleteBuffer(bufferRef.current)
                if (programRef.current) gl.deleteProgram(programRef.current)
            } catch {}
        }
    }, [])

    return (
        <div ref={containerRef} style={containerStyle}>
            {image?.src ? (
                <canvas ref={canvasRef} style={canvasStyle} />
            ) : (
                <ComponentMessage
                    title="Pixel Wiggle Image"
                    subtitle="Add an image in the properties to see the pixel wiggle effect"
                />
            )}
        </div>
    )
}


// Types
interface ResponsiveImageProp {
    src?: string
    srcSet?: string
    alt?: string
    positionX?: string
    positionY?: string
}

interface Props {
    image?: ResponsiveImageProp
    tile: number
    offset: number
    style?: React.CSSProperties
    docs?: string
}

// Property Controls (one-word titles, last control with Framer University link)
// Note: Font controls are not needed here; we expose image and effect parameters only.
addPropertyControls(PixelWiggleImage, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    tile: {
        type: ControlType.Number,
        title: "Tile",
        min: 5,
        max: 400,
        step: 5,
        defaultValue: 50,
        unit: "px",
    },
    offset: {
        type: ControlType.Number,
        title: "Offset",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
    
})

// Component name for Framer UI
PixelWiggleImage.displayName = "PixelWiggleImage"


