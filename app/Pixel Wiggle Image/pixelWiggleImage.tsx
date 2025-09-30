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
    const { image, tileWidth, tileHeight, offset, speed, preview, style } = props

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
    const textureReadyRef = useRef<boolean>(false)
    const [isTextureReady, setIsTextureReady] = useState(false)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
    const isInViewRef = useRef<boolean>(true)
    const devicePixelRatioRef = useRef<number>(1) // Safe default for SSR
    const previewRef = useRef<boolean>(preview)

    // Set device pixel ratio on client side only
    useEffect(() => {
        if (typeof window !== "undefined") {
            devicePixelRatioRef.current = Math.min(window.devicePixelRatio || 1, 2)
        }
    }, [])

    // Update preview ref when prop changes
    useEffect(() => {
        previewRef.current = preview
    }, [preview])

    // Inline styles only. The outer sizing is controlled by Framer; inner fills 100%.
    const containerStyle: React.CSSProperties = {
        ...(style as React.CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "visible",
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
        display: "flex",
    }

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

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
uniform float u_tile_width;
uniform float u_tile_height;
uniform float u_offset;
uniform float u_speed;
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
  // 1) Compute tile grid in container space so tile size is constant in pixels
  vec2 grid_uv = vUv - 0.5;
  grid_uv.x /= u_tile_width;
  grid_uv.y /= u_tile_height;
  vec2 grid_fract = fract(grid_uv);
  vec2 grid_floor = floor(grid_uv);
  grid_fract.x += u_offset * snoise(grid_floor + 0.001 * u_time * u_speed);
  vec2 warped_container_uv = (grid_floor + grid_fract);
  warped_container_uv.x *= u_tile_width;
  warped_container_uv.y *= u_tile_height;
  warped_container_uv += 0.5;

  // 2) Apply cover mapping AFTER the tile warp so the image maintains aspect
  vec2 base_uv = warped_container_uv;
  base_uv.y = 1.0 - base_uv.y; // flip Y once for texture space

  vec2 scale = vec2(1.0);
  if (u_container_aspect > u_image_aspect) {
    // Container wider than image: crop left/right
    scale.y = u_image_aspect / u_container_aspect;
  } else {
    // Container taller than image: crop top/bottom
    scale.x = u_container_aspect / u_image_aspect;
  }
  vec2 fit_uv = (base_uv - 0.5) * scale + 0.5;

  // 3) Sample with clamped UVs and crop to cover bounds for clean edges
  vec2 uv_clamped = clamp(fit_uv, 0.0, 1.0);
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
            (canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true }) as WebGLRenderingContext | null) ||
            (canvas.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: true }) as WebGLRenderingContext | null)
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
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const uImage = uniformsRef.current["u_image_texture"]
        if (uImage) gl.uniform1i(uImage, 0)

        // Clear to transparent to avoid black frame before texture loads
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // Initial sizing and ResizeObserver
        const resize = () => {
            const w = Math.max(canvas.clientWidth, 2)
            const h = Math.max(canvas.clientHeight, 2)
            const width = Math.floor(w * devicePixelRatioRef.current)
            const height = Math.floor(h * devicePixelRatioRef.current)
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

        // Intersection Observer to pause animation when out of view
        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    isInViewRef.current = entry.isIntersecting
                })
            },
            {
                root: null,
                rootMargin: "50px", // Start animating 50px before component comes into view
                threshold: 0.01,
            }
        )
        intersectionObserverRef.current = intersectionObserver
        intersectionObserver.observe(container)

        // Framer Canvas mode often needs extra passes
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(resize, 50)
            setTimeout(resize, 150)
        }

        // Start RAF loop
        const uTime = uniformsRef.current["u_time"]
        const uTileWidth = uniformsRef.current["u_tile_width"]
        const uTileHeight = uniformsRef.current["u_tile_height"]
        const uOffset = uniformsRef.current["u_offset"]
        const uSpeed = uniformsRef.current["u_speed"]
        const render = () => {
            if (!gl || !programRef.current) return
            
            // Check if we're in Canvas mode and preview is off
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const isPaused = !previewRef.current && isCanvas
            
            // Only animate if component is in view
            if (!isInViewRef.current) {
                animRef.current = requestAnimationFrame(render)
                return
            }
            
            // Skip drawing until the texture is ready (keeps canvas transparent)
            if (!textureReadyRef.current) {
                animRef.current = requestAnimationFrame(render)
                return
            }

            // If paused in Canvas mode, render once then stop the loop
            if (isPaused) {
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                animRef.current = null
                return // Don't schedule next frame
            }

            // Update uniforms
            if (uTime) gl.uniform1f(uTime, performance.now())
            if (uTileWidth) {
                const scaleX = canvas.clientWidth > 0 ? tileWidth / canvas.clientWidth : 1
                gl.uniform1f(uTileWidth, scaleX)
            }
            if (uTileHeight) {
                const scaleY = canvas.clientHeight > 0 ? tileHeight / canvas.clientHeight : 1
                gl.uniform1f(uTileHeight, scaleY)
            }
            if (uOffset) gl.uniform1f(uOffset, offset)
            if (uSpeed) {
                // Map speed from 0-1 to 0-3
                const mappedSpeed = speed * 3
                gl.uniform1f(uSpeed, mappedSpeed)
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            animRef.current = requestAnimationFrame(render)
        }
        render()

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current)
            if (resizeObserverRef.current) {
                try { resizeObserverRef.current.disconnect() } catch {}
            }
            if (intersectionObserverRef.current) {
                try { intersectionObserverRef.current.disconnect() } catch {}
            }
        }
    }, [vertexShaderSource, fragmentShaderSource, tileWidth, tileHeight, offset, speed, preview, image])

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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

            // Update image aspect ratio uniform for cover behavior
            const imageAspect = img.naturalWidth / img.naturalHeight
            const uImageAspect = uniformsRef.current["u_image_aspect"]
            if (uImageAspect) gl.uniform1f(uImageAspect, imageAspect)

            // Mark texture as ready so we start rendering
            textureReadyRef.current = true
            setIsTextureReady(true)
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
                <>
                    {!isTextureReady && (
                        isCanvas ? (
                            <ComponentMessage
                                title="Loading image…"
                                subtitle="Preparing the pixel wiggle texture"
                            />
                        ) : (
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                }}
                            />
                        )
                    )}
                    <canvas ref={canvasRef} style={canvasStyle} />
                </>
            ) : (
                isCanvas ? (
                    <ComponentMessage
                        title="Pixel Wiggle Image"
                        subtitle="Add an image in the properties to see the pixel wiggle effect"
                    />
                ) : (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                        }}
                    />
                )
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
    tileWidth: number
    tileHeight: number
    offset: number
    speed: number
    preview: boolean
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
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    tileWidth: {
        type: ControlType.Number,
        title: "Tile Width",
        min: 5,
        max: 400,
        step: 5,
        defaultValue: 50,
        unit: "px",
    },
    tileHeight: {
        type: ControlType.Number,
        title: "Tile Height",
        min: 5,
        max: 400,
        step: 5,
        defaultValue: 50,
        unit: "px",
    },
    offset: {
        type: ControlType.Number,
        title: "Movement",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.25,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
    
})

// Component name for Framer UI
PixelWiggleImage.displayName = "PixelWiggleImage"


