import { useEffect, useRef } from "react"
import { RenderTarget } from "framer"
import {
    Scene,
    OrthographicCamera,
    Material,
    WebGLRenderer,
    Mesh,
    BufferAttribute,
    BufferGeometry,
    RawShaderMaterial,
    DoubleSide,
    Color,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/wave-prism-1.js"


/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function WavePrism() {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastRef = useRef<{ w: number; h: number; aspect: number; zoom: number; ts: number }>({ w: 0, h: 0, aspect: 0, zoom: 0, ts: 0 })
    const sceneRef = useRef<{
		scene: typeof Scene | null
        camera:typeof OrthographicCamera | null
        renderer:typeof WebGLRenderer | null
        mesh:typeof Mesh | null
        uniforms: any
        animationId: number | null
    }>({
        scene: null,
        camera: null,
        renderer: null,
        mesh: null,
        uniforms: null,
        animationId: null,
    })

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return

        const canvas = canvasRef.current
        const container = containerRef.current

        // Ensure canvas fills the component bounds
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        const { current: refs } = sceneRef

        const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

        const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float yOffset; // vertical offset to center the wave
      uniform float distortion;

      void main() {
        // Use a 'cover' mapping that fills the canvas while preserving aspect
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        float d = length(p) * distortion;
        
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs((p.y + yOffset) + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs((p.y + yOffset) + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs((p.y + yOffset) + sin((bx + time) * xScale) * yScale);
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

        const initScene = () => {
            refs.scene = new Scene()
            refs.renderer = new WebGLRenderer({ canvas })
            refs.renderer.setPixelRatio(window.devicePixelRatio)
            refs.renderer.setClearColor(new Color(0x000000))
            // Ensure no prior scissor state crops the output
            refs.renderer.setScissorTest(false)

            refs.camera = new OrthographicCamera(-1, 1, 1, -1, 0, -1)

            refs.uniforms = {
                resolution: { value: [1, 1] },
                time: { value: 0.0 },
                xScale: { value: 1.0 },
                yScale: { value: 0.5 },
                distortion: { value: 0.05 },
                yOffset: { value: 0.0 },
            }

            const position = [
                -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0,
                -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
            ]

            const positions = new BufferAttribute(new Float32Array(position), 3)
            const geometry = new BufferGeometry()
            geometry.setAttribute("position", positions)

            const material = new RawShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: refs.uniforms,
                side: DoubleSide,
            })

            refs.mesh = new Mesh(geometry, material)
            refs.scene.add(refs.mesh)

            handleResize()
        }

        const animate = () => {
            if (refs.uniforms) refs.uniforms.time.value += 0.01
            if (refs.renderer && refs.scene && refs.camera) {
                refs.renderer.render(refs.scene, refs.camera)
            }
            refs.animationId = requestAnimationFrame(animate)
        }

        const handleResize = () => {
            if (!refs.renderer || !refs.uniforms || !container) return
            const cw = container.clientWidth || container.offsetWidth || 1
            const ch = container.clientHeight || container.offsetHeight || 1
            refs.renderer.setSize(cw, ch, false)
            // Fill canvas; shader uses 'contain' mapping, so resolution is full canvas
            refs.uniforms.resolution.value = [cw, ch]
            // Nudge wave upward so the colorful band sits near the vertical middle
            refs.uniforms.yOffset.value = -1.0
        }

        initScene()
        animate()
        window.addEventListener("resize", handleResize)

        // In Framer Canvas: watch aspect ratio changes only; ignore pure zoom changes
        if (RenderTarget.current() === RenderTarget.canvas) {
            let rafId = 0
            const TICK_MS = 250
            const EPSPECT = 0.001
            const EPSZOOM = 0.001
            const tick = (now?: number) => {
                const container = containerRef.current
                const probe = zoomProbeRef.current
                if (container && probe) {
                    const cw = container.clientWidth || container.offsetWidth || 1
                    const ch = container.clientHeight || container.offsetHeight || 1
                    const aspect = cw / ch
                    const zoom = probe.getBoundingClientRect().width / 20

                    const timeOk = !lastRef.current.ts || (now || performance.now()) - lastRef.current.ts >= TICK_MS
                    const aspectChanged = Math.abs(aspect - lastRef.current.aspect) > EPSPECT
                    const zoomChanged = Math.abs(zoom - lastRef.current.zoom) > EPSZOOM

                    if (timeOk && (aspectChanged || zoomChanged)) {
                        lastRef.current = { w: cw, h: ch, aspect, zoom, ts: now || performance.now() }
                        if (aspectChanged) {
                            handleResize()
                        } else {
                            // Only zoom changed; just sync buffer size without altering mapping
                            if (sceneRef.current && canvasRef.current && refs.renderer && refs.uniforms) {
                                refs.renderer.setSize(cw, ch, false)
                                refs.uniforms.resolution.value = [cw, ch]
                            }
                        }
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        return () => {
            if (refs.animationId) cancelAnimationFrame(refs.animationId)
            window.removeEventListener("resize", handleResize)
            if (refs.mesh) {
                refs.scene?.remove(refs.mesh)
                refs.mesh.geometry.dispose()
                if (refs.mesh.material instanceof Material) {
                    refs.mesh.material.dispose()
                }
            }
            refs.renderer?.dispose()
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "block",
                margin: 0,
                padding: 0,
            }}
        >
            {/* Hidden 20x20 probe to detect editor zoom level in canvas */}
            <div
                ref={zoomProbeRef}
                style={{ position: "absolute", width: 20, height: 20, opacity: 0, pointerEvents: "none" }}
            />
            <canvas ref={canvasRef} />
        </div>
    )
}

WavePrism.displayName = "WavePrism"
