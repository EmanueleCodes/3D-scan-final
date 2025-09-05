import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { gsap } from "gsap"

interface MouseDotProps {
    size?: number
    color?: string
    opacity?: number
    blendMode?: string
    interactionMode?: string
    framerUniversity?: string
}

interface Ring {
    id: string
    x: number
    y: number
}

interface Burst {
    id: string
    x: number
    y: number
}

export function MouseDot({
    size = 20,
    color = "#ff0000",
    opacity = 0.8,
    blendMode = "difference",
    interactionMode = "rings",
    framerUniversity = "https://frameruni.link/cc",
}: MouseDotProps) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
    const [rings, setRings] = React.useState<Ring[]>([])
    const [bursts, setBursts] = React.useState<Burst[]>([])
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Track mouse movement within container
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setMousePosition({ 
                    x: e.clientX - rect.left, 
                    y: e.clientY - rect.top 
                })
            }
        }

        const container = containerRef.current
        if (container) {
            document.addEventListener("mousemove", handleMouseMove)
        }

        return () => {
            if (container) {
                document.removeEventListener("mousemove", handleMouseMove)
            }
        }
    }, [])

    // Handle click anywhere on the window to create new interaction
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top
                
                if (interactionMode === "rings") {
                    // Create ring at click position
                    const newRing: Ring = {
                        id: Date.now().toString(),
                        x,
                        y
                    }
                    setRings(prev => [...prev, newRing])
                } else if (interactionMode === "burst") {
                    // Create burst at click position
                    const newBurst: Burst = {
                        id: Date.now().toString(),
                        x,
                        y
                    }
                    setBursts(prev => [...prev, newBurst])
                }
            }
        }

        // Add global click listener
        document.addEventListener("click", handleClick)

        return () => {
            document.removeEventListener("click", handleClick)
        }
    }, [interactionMode])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "visible", // Allow rings to appear outside component bounds
                cursor: "crosshair",
            }}
        >
            {!isCanvas && (
                <>
                    {/* Animated rings */}
                    {interactionMode === "rings" && (
                        <>
                            {rings.map((ring) => (
                                <div
                                    key={ring.id}
                                    style={{
                                        position: "absolute",
                                        left: ring.x - 16, // Start at 16px radius
                                        top: ring.y - 16,
                                        width: 32, // Start at 32px diameter
                                        height: 32,
                                        borderColor: color,
                                        borderWidth: 2,
                                        borderStyle: "solid",
                                        opacity:opacity,
                                        borderRadius: "50%",
                                        backgroundColor: "transparent",
                                        mixBlendMode: blendMode as any,
                                        pointerEvents: "none",
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            
                                            // Animate ring with GSAP
                                            gsap.to(el, 
                                                {
                                                    opacity:0,
                                                    borderWidth: 0,
                                                    scale:2,
                                                    duration: 2,
                                                    ease: "power3.out",
                                                    onComplete: () => {
                                                        // Remove ring after animation completes
                                                        setTimeout(()=>setRings(prev => prev.filter(r => r.id !== ring.id)),2000)
                                                    }
                                                }
                                            )
                                        }
                                    }}

                                />
                            ))}
                        </>
                    )}

                    {/* Animated burst lines */}
                    {interactionMode === "burst" && (
                        <>
                            {bursts.map((burst) => (
                                <div
                                    key={burst.id}
                                    ref={(el) => {
                                        if (el) {
                                            // Animate burst container
                                            gsap.fromTo(el, 
                                                {
                                                    scale: 0,
                                                    opacity: 1,
                                                },
                                                {
                                                    scale: 1,
                                                    opacity: 0,
                                                    duration: 0.6,
                                                    ease: "power2.out",
                                                    onComplete: () => {
                                                        // Remove burst after animation completes
                                                        setBursts(prev => prev.filter(b => b.id !== burst.id))
                                                    }
                                                }
                                            )
                                        }
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: burst.x,
                                        top: burst.y,
                                        width: 2,
                                        height: 2,
                                        pointerEvents: "none",
                                    }}
                                >
                                    {/* 4 radiating lines */}
                                    {[0, 45, 90, 135].map((angle, index) => (
                                        <div
                                            key={index}
                                            ref={(lineEl) => {
                                                if (lineEl) {
                                                    // Animate individual line
                                                    gsap.fromTo(lineEl, 
                                                        {
                                                            scaleX: 0,
                                                        },
                                                        {
                                                            scaleX: 1,
                                                            duration: 0.6,
                                                            ease: "power2.out",
                                                        }
                                                    )
                                                }
                                            }}
                                            style={{
                                                position: "absolute",
                                                left: "50%",
                                                top: "50%",
                                                width: "20px",
                                                height: "2px",
                                                backgroundColor: color,
                                                transformOrigin: "left center",
                                                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                                mixBlendMode: blendMode as any,
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </>
                    )}
                </>
            )}
        </div>
    )
}

MouseDot.displayName = "Mouse Dot"

MouseDot.defaultProps = {
    size: 20,
    color: "#ff0000",
    opacity: 0.8,
    blendMode: "difference",
    interactionMode: "rings",
    framerUniversity: "https://frameruni.link/cc",
}

addPropertyControls(MouseDot, {
    size: {
        type: ControlType.Number,
        title: "Size",
        min: 5,
        max: 100,
        step: 1,
        defaultValue: 20,
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ff0000",
    },
    opacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.8,
    },
    blendMode: {
        type: ControlType.Enum,
        title: "Blend Mode",
        options: [
            "normal",
            "multiply",
            "screen",
            "overlay",
            "soft-light",
            "hard-light",
            "color-dodge",
            "color-burn",
            "darken",
            "lighten",
            "difference",
            "exclusion",
            "hue",
            "saturation",
            "color",
            "luminosity",
        ],
        defaultValue: "difference",
    },
    interactionMode: {
        type: ControlType.Enum,
        title: "Interaction Mode",
        options: [
            "rings",
            "burst",
        ],
        defaultValue: "rings",
    },
    framerUniversity: {
        type: ControlType.String,
        title: "Framer University",
        defaultValue: "https://frameruni.link/cc",
        hidden: () => true,
    },
})
