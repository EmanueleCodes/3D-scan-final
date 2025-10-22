
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

declare global {
  interface Window {
    THREE: any
  }
}

type ShaderLinesProps = {
  speed?: number
}

// UI → Internal mapping helpers
function mapLinear(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin
  const t = (value - inMin) / (inMax - inMin)
  return outMin + t * (outMax - outMin)
}

// Speed: UI [0.1..1] → internal [0.1..5] (higher UI = much faster animation)
function mapSpeedUiToInternal(ui: number): number {
  const clamped = Math.max(0.1, Math.min(1, ui))
  return mapLinear(clamped, 0.1, 1.0, 0.1, 5.0)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 500
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ShaderLines(props: ShaderLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef<number>(mapSpeedUiToInternal(props.speed ?? 0.5))
  const lastRef = useRef<{
    w: number
    h: number
    aspect: number
    ts: number
  }>({ w: 0, h: 0, aspect: 0, ts: 0 })
  const sceneRef = useRef<{
    camera: any
    scene: any
    renderer: any
    uniforms: any
    animationId: number | null
    onResize: (() => void) | null
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
    onResize: null,
  })

  // Reflect prop changes immediately inside the RAF loop (without re-initializing Three)
  useEffect(() => {
    speedRef.current = mapSpeedUiToInternal(props.speed ?? 0.5)
  }, [props.speed])

  useEffect(() => {
    // Load Three.js dynamically
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js"
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        initThreeJS()
      }
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }
      if (sceneRef.current.onResize) {
        sceneRef.current.onResize()
      }
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose()
      }
      document.head.removeChild(script)
    }
  }, [])

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return

    const THREE = window.THREE
    const container = containerRef.current

    // Clear any existing content
    container.innerHTML = ""

    // Initialize camera
    const camera = new THREE.Camera()
    camera.position.z = 1

    // Initialize scene
    const scene = new THREE.Scene()

    // Create geometry
    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    // Define uniforms
    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    }

    // Vertex shader
    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

    // Fragment shader
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
        
      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }
      
      varying vec2 vUv;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        
        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256,256);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
          
        float t = time*0.06+random(uv.x)*0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
          }
        }

        gl_FragColor = vec4(color[2],color[1],color[0],1.0);
      }
    `

    // Create material
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    })

    // Create mesh and add to scene
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    // Ensure canvas fills container reliably in Framer editor and live preview
    const canvasEl = renderer.domElement as HTMLCanvasElement
    canvasEl.style.position = "absolute"
    ;(canvasEl.style as any).inset = "0"
    canvasEl.style.width = "100%"
    canvasEl.style.height = "100%"
    canvasEl.style.display = "block"
    container.appendChild(canvasEl)

    // Store references
    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: null,
      onResize: null,
    }

    // Handle resize
    const onWindowResize = () => {
      const w = container.clientWidth || container.offsetWidth || 1
      const h = container.clientHeight || container.offsetHeight || 1
      renderer.setSize(w, h)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }

    onWindowResize()
    sceneRef.current.onResize = onWindowResize
    window.addEventListener("resize", onWindowResize, false)

    // Canvas resize detection for Framer Canvas
    if (RenderTarget.current() === RenderTarget.canvas) {
      let rafId = 0
      const TICK_MS = 250
      const EPSPECT = 0.001
      const tick = (now?: number) => {
        const container = containerRef.current
        if (container) {
          const cw = container.clientWidth || container.offsetWidth || 1
          const ch = container.clientHeight || container.offsetHeight || 1
          const aspect = cw / ch

          const timeOk =
            !lastRef.current.ts ||
            (now || performance.now()) - lastRef.current.ts >= TICK_MS
          const aspectChanged =
            Math.abs(aspect - lastRef.current.aspect) > EPSPECT
          const sizeChanged =
            Math.abs(cw - lastRef.current.w) > 1 ||
            Math.abs(ch - lastRef.current.h) > 1

          if (timeOk && (aspectChanged || sizeChanged)) {
            lastRef.current = {
              w: cw,
              h: ch,
              aspect,
              ts: now || performance.now(),
            }
            // Call resize handler to update renderer and uniforms
            onWindowResize()
          }
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
      
      // Store cleanup function
      sceneRef.current.onResize = () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener("resize", onWindowResize)
      }
    }

    // Animation loop with frame-rate independent timing
    let lastTime = 0
    const animate = (currentTime: number) => {
      sceneRef.current.animationId = requestAnimationFrame(animate)
      
      // Calculate delta time for frame-rate independent animation
      const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016 // Default to 60fps on first frame
      lastTime = currentTime
      
      // Use delta time for consistent speed across different frame rates
      uniforms.time.value += deltaTime * speedRef.current
      renderer.render(scene, camera)
    }

    animate(0)
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", display: "block", margin: 0, padding: 0 }}
    />
  )
}

// Property Controls (keep last control with Framer University link)
addPropertyControls(ShaderLines, {
  speed: {
    type: ControlType.Number,
    title: "Speed",
    min: 0.1,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
    description: "More components at [Framer University](https://frameruni.link/cc).",
  },
})

ShaderLines.displayName = "Shader Lines"
