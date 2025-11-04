import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

// Import VFX from bundled file
// TODO: Update this URL once you push vfxjs-bundle to GitHub
// Example: import { VFX } from "https://raw.githubusercontent.com/your-username/vfxjs-bundle/main/dist/bundle.js"
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
    const targetElementRef = useRef<HTMLElement | null>(null)

    // Build shader (same as reference file)
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

    // Initialize VFX and apply to target
    useEffect(() => {
        let cleanup: (() => void) | undefined

        const initializeVFX = () => {
            // Cleanup previous instance
            if (cleanup) {
                cleanup()
            }

            if (!targetId) return

            // Find target element
            const targetElement = document.getElementById(targetId)
            if (!targetElement) {
                console.warn(`CRT Effect: Target element with ID "${targetId}" not found`)
                return
            }

            targetElementRef.current = targetElement

            // Create VFX instance (like reference file)
            const vfx = new VFX({
                scrollPadding: false,
            })

            // Apply shader to target element (like reference: vfx.add(e, { shader, ... }))
            vfx.add(targetElement, {
                shader: shader,
            })

            vfxInstanceRef.current = vfx

            cleanup = () => {
                if (vfxInstanceRef.current && targetElementRef.current) {
                    try {
                        vfxInstanceRef.current.remove?.(targetElementRef.current)
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
                vfxInstanceRef.current = null
                targetElementRef.current = null
            }
        }

        // Small delay to ensure DOM is ready
        setTimeout(initializeVFX, 100)

        return () => {
            if (cleanup) {
                cleanup()
            }
        }
    }, [targetId])

    // Return a minimal placeholder for Framer canvas
    // The actual effect is applied to the target element via VFX
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                pointerEvents: "none",
                opacity: 0,
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

