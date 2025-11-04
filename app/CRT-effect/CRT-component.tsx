import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
import { VFX } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/crt-bundle.js"

type CRTComponentProps = {
    targetId?: string
    preview?: boolean
    intensity?: number
    scanlineIntensity?: number
    chromaticAberration?: number
    vignetteStrength?: number
    distortionAmount?: number
    noiseAmount?: number
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

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function CRTComponent(props: CRTComponentProps) {
    const {
        targetId = "",
        preview = false,
        intensity = 0.5,
        scanlineIntensity = 0.5,
        chromaticAberration = 0.5,
        vignetteStrength = 0.5,
        distortionAmount = 0.5,
        noiseAmount = 0.5,
        speed = 0.5,
    } = props

    const vfxInstanceRef = useRef<any>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const maskUpdateFrameRef = useRef<number>()

    // CRT shader (same as reference)
    const shader = `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));
  return c;
}

vec2 zoom(vec2 uv, float t) {
  return (uv - .5) * t + .5;
}

float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;       
  
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;
  float l = length(p); 
   
  // distort
  float dist = pow(l, 2.) * .3;
  dist = smoothstep(0., 1., dist);
  uv = zoom(uv, 0.5 + dist);  
    
  // blur
  vec2 du = (uv - .5);
  float a = atan(p.y, p.x);
  float rd = rand(vec3(a, time, 0));
  uv = (uv - .5) * (1.0 + rd * pow(l * 0.7, 3.) * 0.3) + .5;
    
  vec2 uvr = uv;
  vec2 uvg = uv;
  vec2 uvb = uv;
    
  // aberration
  float d = (1. + sin(uv.y * 20. + time * 3.) * 0.1) * 0.05;
  uvr.x += 0.0015;
  uvb.x -= 0.0015;
  uvr = zoom(uvr, 1. + d * l * l);
  uvb = zoom(uvb, 1. - d * l * l);    
    
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);

  vec4 deco;

  // scanline
  float res = resolution.y;
  deco += (
    sin(uv.y * res * .7 + time * 100.) *
    sin(uv.y * res * .3 - time * 130.)
  ) * 0.05;

  // grid
  deco += smoothstep(.01, .0, min(fract(uv.x * 20.), fract(uv.y * 20.))) * 0.1;

  outColor += deco * smoothstep(2., 0., l);
  
  // vignette
  outColor *= 1.8 - l * l;  

  // dither
  outColor += rand(vec3(p, time)) * 0.1;     
}
`

    // Create VFX once and apply gradient mask based on viewport intersection
    useEffect(() => {
        if (!targetId) return

        const targetElement = document.getElementById(targetId)
        if (!targetElement) {
            console.warn(`CRT Effect: Target element with ID "${targetId}" not found`)
            return
        }

        // Create VFX instance once (kept mounted)
        const vfx = new VFX({
            scrollPadding: false,
            postEffect: { shader }
        })

        // Also add elements inside target for distortion
        const elementsToCapture = targetElement.querySelectorAll('*')
        elementsToCapture.forEach((element) => {
            vfx.add(element as HTMLElement, {
                shader: shader,
            })
        })

        vfxInstanceRef.current = vfx

        // Find VFX canvas after it's created
        const findAndSetupCanvas = () => {
            const canvas = document.querySelector('canvas[data-engine="three.js"]') as HTMLCanvasElement
            if (canvas) {
                canvasRef.current = canvas
                
                // Function to update mask gradient based on viewport intersection
                const updateMask = () => {
                    if (!canvasRef.current || !targetElement) return

                    const rect = targetElement.getBoundingClientRect()
                    const viewportHeight = window.innerHeight
                    
                    // Element boundaries in viewport coordinates
                    const elementTop = rect.top
                    const elementBottom = rect.bottom
                    
                    // Calculate gradient stops based on viewport position (0% = top of viewport, 100% = bottom)
                    let stop1 = 0, stop2 = 0, stop3 = 100, stop4 = 100
                    
                    // Convert element positions to viewport percentages
                    const topPercent = (elementTop / viewportHeight) * 100
                    const bottomPercent = (elementBottom / viewportHeight) * 100
                    
                    // Fade zone size (in viewport percentage)
                    const fadeSize = 5 // 5% fade zone
                    
                    if (elementBottom <= 0) {
                        // Element is completely above viewport - fully transparent
                        stop1 = 0
                        stop2 = 0
                        stop3 = 0
                        stop4 = 0
                    } else if (elementTop >= viewportHeight) {
                        // Element is completely below viewport - fully transparent
                        stop1 = 0
                        stop2 = 0
                        stop3 = 0
                        stop4 = 0
                    } else {
                        // Element intersects viewport
                        // Calculate where opacity starts and ends
                        const opacityStart = Math.max(0, topPercent)
                        const opacityEnd = Math.min(100, bottomPercent)
                        
                        // Add fade zones
                        stop1 = Math.max(0, opacityStart - fadeSize)
                        stop2 = opacityStart
                        stop3 = opacityEnd
                        stop4 = Math.min(100, opacityEnd + fadeSize)
                    }
                    
                    // Apply gradient mask (black = visible, transparent = hidden)
                    const maskImage = `linear-gradient(to bottom, 
                        transparent ${stop1}%, 
                        black ${stop2}%, 
                        black ${stop3}%, 
                        transparent ${stop4}%
                    )`
                    
                    canvasRef.current.style.maskImage = maskImage
                    canvasRef.current.style.webkitMaskImage = maskImage
                }
                
                // Update mask continuously
                const animateMask = () => {
                    updateMask()
                    maskUpdateFrameRef.current = requestAnimationFrame(animateMask)
                }
                
                animateMask()
            } else {
                // Retry if canvas not found yet
                setTimeout(findAndSetupCanvas, 100)
            }
        }
        
        // Wait a bit for VFX to create canvas
        setTimeout(findAndSetupCanvas, 100)

        return () => {
            // Cancel mask animation
            if (maskUpdateFrameRef.current) {
                cancelAnimationFrame(maskUpdateFrameRef.current)
            }
            
            // Clean up VFX
            if (vfxInstanceRef.current) {
                try {
                    vfxInstanceRef.current.dispose?.()
                } catch (e) {
                    // Ignore cleanup errors
                }
                vfxInstanceRef.current = null
            }
            
            canvasRef.current = null
        }
    }, [targetId, shader])

    // Return invisible placeholder - effect is managed by VFX
    return (
        <div
            style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

addPropertyControls(CRTComponent, {
    targetId: {
        type: ControlType.String,
        title: "Target ID",
        defaultValue: "",
        placeholder: "scroll-section",
        description: "ID of the scroll section to apply CRT effect to",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    scanlineIntensity: {
        type: ControlType.Number,
        title: "Scanlines",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    chromaticAberration: {
        type: ControlType.Number,
        title: "Chromatic Aberration",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    vignetteStrength: {
        type: ControlType.Number,
        title: "Vignette",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    distortionAmount: {
        type: ControlType.Number,
        title: "Distortion",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    noiseAmount: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
})

CRTComponent.displayName = "CRT Effect"

