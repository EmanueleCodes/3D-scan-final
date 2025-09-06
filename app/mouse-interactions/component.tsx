import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { gsap } from "gsap"

interface MouseEffectsProps {
    size?: number
    color?: string
    opacity?: number
    duration?: number
    strokeWidth?: number
    effectSize?: number
    interactionMode?: string
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

interface Particle {
    id: string
    x: number
    y: number
    angle: number
    distance: number
}

interface Crosshair {
    id: string
    x: number
    y: number
}

interface Wavy {
    id: string
    x: number
    y: number
}

export function MouseEffects({
    size = 20,
    color = "#ff0000",
    opacity = 0.8,
    interactionMode = "rings",
    duration = 1,
    strokeWidth = 2,
    effectSize = 60,
}: MouseEffectsProps) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
    const [rings, setRings] = React.useState<Ring[]>([])
    const [bursts, setBursts] = React.useState<Burst[]>([])
    const [particles, setParticles] = React.useState<Particle[]>([])
    const [crosshairs, setCrosshairs] = React.useState<Crosshair[]>([])
    const [wavies, setWavies] = React.useState<Wavy[]>([])
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Track mouse movement within container
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
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
                        y,
                    }
                    setRings((prev) => [...prev, newRing])
                } else if (interactionMode === "burst") {
                    // Create burst at click position
                    const newBurst: Burst = {
                        id: Date.now().toString(),
                        x,
                        y,
                    }
                    setBursts((prev) => [...prev, newBurst])
                } else if (interactionMode === "particles") {
                    // Create multiple particles at click position
                    const newParticles: Particle[] = Array.from(
                        { length: 8 },
                        (_, i) => ({
                            id: `${Date.now()}-${i}`,
                            x,
                            y,
                            angle: i * 45 * (Math.PI / 180), // 8 particles in 45-degree increments
                            distance:
                                effectSize * 0.2 +
                                Math.random() * (effectSize * 0.2), // Random distance between 20%-40% of effectSize
                        })
                    )
                    setParticles((prev) => [...prev, ...newParticles])
                } else if (interactionMode === "crosshair") {
                    // Create crosshair at click position
                    const newCrosshair: Crosshair = {
                        id: Date.now().toString(),
                        x,
                        y,
                    }
                    setCrosshairs((prev) => [...prev, newCrosshair])
                } else if (interactionMode === "wavy") {
                    // Create wavy at click position
                    const newWavy: Wavy = {
                        id: Date.now().toString(),
                        x,
                        y,
                    }
                    setWavies((prev) => [...prev, newWavy])
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
            }}
        >
            {!isCanvas && (
                <>
                    {/* Animated rings */}
                    {interactionMode === "rings" && (
                        <>
                            {rings.map((ring) => (
                                <svg
                                    key={ring.id}
                                    style={{
                                        position: "absolute",
                                        left: ring.x - effectSize / 2, // Center the effectSize bounding box
                                        top: ring.y - effectSize / 2,
                                        width: effectSize, // Use effectSize as the bounding box
                                        height: effectSize,
                                        pointerEvents: "none",
                                        overflow: "visible",
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            const tl = gsap.timeline()
                                            // Set initial state
                                            gsap.set(el, {
                                                scale: 0.5,
                                                opacity: opacity,
                                                "--stroke-width": strokeWidth,
                                            })

                                            // Animate SVG ring with GSAP
                                            tl.to(
                                                el,
                                                {
                                                    scale: 2,

                                                    "--stroke-width": 0,
                                                    duration: duration,
                                                    ease: "power3.out",
                                                    onComplete: () => {
                                                        // Remove ring after animation completes
                                                        setRings((prev) =>
                                                            prev.filter(
                                                                (r) =>
                                                                    r.id !==
                                                                    ring.id
                                                            )
                                                        )
                                                    },
                                                },
                                                0
                                            ).to(
                                                el,
                                                {
                                                    opacity: 0,
                                                    duration: duration / 2,
                                                    ease: "power3.out",
                                                },
                                                duration / 2
                                            )
                                        }
                                    }}
                                >
                                    <circle
                                        cx={effectSize / 2}
                                        cy={effectSize / 2}
                                        r={effectSize * 0.4}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="var(--stroke-width, 5)"
                                    />
                                </svg>
                            ))}
                        </>
                    )}

                    {/* Animated burst lines */}
                    {interactionMode === "burst" && (
                        <>
                            {bursts.map((burst) => (
                                <svg
                                    key={burst.id}
                                    style={{
                                        position: "absolute",
                                        left: burst.x - effectSize / 2, // Center the effectSize bounding box
                                        top: burst.y - effectSize / 2,
                                        width: effectSize,
                                        height: effectSize,
                                        pointerEvents: "none",
                                    
                                        overflow: "visible",
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            // Animate each line individually - growing from center outward
                                            const lines = el.querySelectorAll('line')
                                            lines.forEach((line, index) => {
                                                const angle = [45, 80, 115, 150][index] * (Math.PI / 180)
                                                const centerX = effectSize / 2
                                                const centerY = effectSize / 2
                                                const lineLength = effectSize * 0.3 // Fixed line length
                                                
                                                // Calculate points for the line
                                                const startX = centerX + 20 * Math.cos(angle)
                                                const startY = centerY - 20 * Math.sin(angle)
                                                const endX = centerX + (20 + lineLength) * Math.cos(angle)
                                                const endY = centerY - (20 + lineLength) * Math.sin(angle)
                                                
                                                // Set initial state: line starts collapsed at center
                                                gsap.set(line, {
                                                    attr: {
                                                        x1: startX,
                                                        y1: startY,
                                                        x2: centerX,
                                                        y2: centerY,
                                                        strokeWidth: strokeWidth
                                                    }
                                                })
                                                
                                                // Animate: line grows outward and then shrinks
                                                gsap.timeline()
                                                    .to(line, {
                                                        attr: {
                                                            x1: endX,
                                                            y1: endY,
                                                            x2: endX,
                                                            y2: endY,
                                                        },
                                                        duration: duration * 0.8,
                                                        ease: "power1.out",
                                                    })
                                                    .to(line, {
                                                        attr: {
                                                            strokeWidth: 0
                                                        },
                                                        duration: duration * 0.2,
                                                        ease: "power1.in",
                                                    }, duration * 0.8)
                                                    .to(line, {
                                                        opacity: 0,
                                                        duration: duration * 0.2,
                                                        ease: "power1.in",
                                                        onComplete: () => {
                                                            setBursts(prev => prev.filter(b => b.id !== burst.id))
                                                        }
                                                    }, duration * 0.8)
                                            })
                                        }
                                    }}
                                >
                                    {/* 4 radiating lines */}
                                    {[45, 80, 115, 150].map((angle, index) => {
                                        const centerX = effectSize / 2
                                        const centerY = effectSize / 2
                                        
                                        return (
                                            <line
                                                key={index}
                                                x1={centerX}
                                                y1={centerY}
                                                x2={centerX}
                                                y2={centerY}
                                                stroke={color}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="square"
                                            />
                                        )
                                    })}
                                </svg>
                            ))}
                        </>
                    )}

                    {/* Animated particles */}
                    {interactionMode === "particles" && (
                        <>
                            {particles.map((particle) => (
                                <div
                                    key={particle.id}
                    style={{
                                        position: "absolute",
                                        left:
                                            particle.x -
                                            strokeWidth / 2,
                                        top:
                                            particle.y -
                                            strokeWidth / 2,
                                        width: strokeWidth,
                                        height: strokeWidth,
                                        backgroundColor: color,
                        borderRadius: "50%",
                        pointerEvents: "none",
                       
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            // Calculate final position based on angle and distance
                                            const finalX = particle.x + Math.cos(particle.angle) * particle.distance
                                            const finalY = particle.y + Math.sin(particle.angle) * particle.distance

                                            // Set initial state: particle starts at center (click position)
                                            gsap.set(el, {
                                                left: particle.x - strokeWidth / 2,
                                                top: particle.y - strokeWidth / 2,
                                                opacity: 1,
                                            })

                                            // Animate: particle moves from center to final position
                                            gsap.timeline()
                                                .to(el, {
                                                    left: finalX - strokeWidth / 2,
                                                    top: finalY - strokeWidth / 2,
                                                    duration: duration * 0.6,
                                                    ease: "power1.out",
                                                })
                                                .to(el, {
                                                    opacity: 0,
                                                    duration: duration * 0.4,
                                                    ease: "power1.in",
                                                    onComplete: () => {
                                                        setParticles((prev) =>
                                                            prev.filter(
                                                                (p) =>
                                                                    p.id !==
                                                                    particle.id
                                                            )
                                                        )
                                                    },
                                                }, duration * 0.6)
                                        }
                                    }}
                                />
                            ))}
                        </>
                    )}

                    {/* Animated crosshairs */}
                    {interactionMode === "crosshair" && (
                        <>
                            {crosshairs.map((crosshair) => (
                                <svg
                                    key={crosshair.id}
                                    style={{
                                        position: "absolute",
                                        left: crosshair.x - effectSize / 2, // Center the effectSize bounding box
                                        top: crosshair.y - effectSize / 2,
                                        width: effectSize,
                                        height: effectSize,
                                        pointerEvents: "none",
                                        
                                        overflow: "visible",
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            // Animate each line individually - growing from center outward
                                            const lines = el.querySelectorAll('line')
                                            lines.forEach((line, index) => {
                                                const angle = [0, 90, 180, 270][index] * (Math.PI / 180)
                                                const centerX = effectSize / 2
                                                const centerY = effectSize / 2
                                                const lineLength = effectSize * 0.3 // Fixed line length
                                                
                                                // Calculate points for the line
                                                const startX = centerX + 20 * Math.cos(angle)
                                                const startY = centerY - 20 * Math.sin(angle)
                                                const endX = centerX + (20 + lineLength) * Math.cos(angle)
                                                const endY = centerY - (20 + lineLength) * Math.sin(angle)
                                                
                                                // Set initial state: line starts collapsed at center
                                                gsap.set(line, {
                                                    attr: {
                                                        x1: startX,
                                                        y1: startY,
                                                        x2: centerX,
                                                        y2: centerY,
                                                        strokeWidth: strokeWidth
                                                    }
                                                })
                                                
                                                // Animate: line grows outward and then shrinks
                                                gsap.timeline()
                                                    .to(line, {
                                                        attr: {
                                                            x1: endX,
                                                            y1: endY,
                                                            x2: endX,
                                                            y2: endY,
                                                        },
                                                        duration: duration * 0.8,
                                                        ease: "power1.out",
                                                    })
                                                    .to(line, {
                                                        attr: {
                                                            strokeWidth: 0
                                                        },
                                                        duration: duration * 0.2,
                                                        ease: "power1.in",
                                                    }, duration * 0.8)
                                                    .to(line, {
                                                        opacity: 0,
                                                        duration: duration * 0.2,
                                                        ease: "power1.in",
                                                        onComplete: () => {
                                                            setCrosshairs(prev => prev.filter(c => c.id !== crosshair.id))
                                                        }
                                                    }, duration * 0.8)
                                            })
                                        }
                                    }}
                                >
                                    {/* 4 lines at cardinal directions */}
                                    {[0, 90, 180, 270].map((angle, index) => {
                                        const centerX = effectSize / 2
                                        const centerY = effectSize / 2
                                        
                                        return (
                                            <line
                                                key={index}
                                                x1={centerX}
                                                y1={centerY}
                                                x2={centerX}
                                                y2={centerY}
                                                stroke={color}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="square"
                                            />
                                        )
                                    })}
                                </svg>
                            ))}
                        </>
                    )}

                    {/* Animated wavy lines */}
                    {interactionMode === "wavy" && (
                        <>
                            {wavies.map((wavy) => (
                                <svg
                                    key={wavy.id}
                                    style={{
                                        position: "absolute",
                                        left: wavy.x - effectSize / 2, // Center the effectSize bounding box
                                        top: wavy.y - effectSize / 2,
                                        width: effectSize,
                                        height: effectSize,
                                        pointerEvents: "none",
                                        overflow: "visible",
                                    }}
                                    ref={(el) => {
                                        if (el) {
                                            // Animate each wavy line individually
                                            const paths = el.querySelectorAll('path')
                                            paths.forEach((path, index) => {
                                                // Get the actual path length using getTotalLength()
                                                const pathLength = path.getTotalLength()
                                                
                                                // Set initial state with strokeDasharray and strokeDashoffset (path hidden)
                                                gsap.set(path, {
                                                    strokeDasharray: pathLength,
                                                    strokeDashoffset: pathLength,
                                                    strokeWidth: strokeWidth
                                                })
                                                
                                                // Animate strokeDashoffset to reveal the path (like pathReveal.tsx)
                                                gsap.timeline()
                                                    .to(path, {
                                                        strokeDashoffset: 0,
                                                        duration: duration * 0.6,
                                                        ease: "power2.out",
                                                    })
                                                    .to(path, {
                                                        strokeWidth: 0,
                                                        duration: duration * 0.4,
                                                        ease: "power2.in",
                                                    }, duration * 0.6)
                                            })
                                            
                                            // Remove from state when animation completes
                                            gsap.delayedCall(duration, () => {
                                                setWavies(prev => prev.filter(w => w.id !== wavy.id))
                                            })
                                        }
                                    }}
                                >
                                    {/* 4 wavy lines */}
                                    {[45, 90, 135, 180].map((angle, index) => {
                                        const centerX = effectSize / 2
                                        const centerY = effectSize / 2
                                        const startRadius = effectSize * 0.1
                                        const endRadius = effectSize * 0.4
                                        
                                        const startX = centerX + startRadius * Math.cos(angle * Math.PI / 180)
                                        const startY = centerY - startRadius * Math.sin(angle * Math.PI / 180)
                                        const endX = centerX + endRadius * Math.cos(angle * Math.PI / 180)
                                        const endY = centerY - endRadius * Math.sin(angle * Math.PI / 180)
                                        
                                        const midX = (startX + endX) / 2
                                        const midY = (startY + endY) / 2
                                        const waveOffset = effectSize * 0.05
                                        const control1X = midX + waveOffset * Math.cos(angle * Math.PI / 180 + Math.PI / 2)
                                        const control1Y = midY - waveOffset * Math.sin(angle * Math.PI / 180 + Math.PI / 2)
                                        
                                        const wavyPath = `M ${startX} ${startY} Q ${control1X} ${control1Y} ${midX} ${midY} T ${endX} ${endY}`
                                        
                                        return (
                                            <path
                                                key={index}
                                                d={wavyPath}
                                                stroke={color}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                        )
                                    })}
                                </svg>
                            ))}
                        </>
                    )}
                </>
            )}
        </div>
    )
}

MouseEffects.displayName = "Click Effects"

MouseEffects.defaultProps = {
    size: 20,
    color: "#ff0000",
    opacity: 1,
    blendMode: "difference",
    interactionMode: "rings",
    duration: 1,
    strokeWidth: 2,
    effectSize: 60,
   
}

addPropertyControls(MouseEffects, {
    interactionMode: {
        type: ControlType.Enum,
        title: "Effect",
        options: ["rings", "burst", "particles", "crosshair", "wavy"],
        defaultValue: "rings",
    },
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
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: 1,
        unit:"s"
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Stroke",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 2,
        unit:"px"
    },
    effectSize: {
        type: ControlType.Number,
        title: "Size",
        min: 20,
        max: 200,
        step: 5,
        defaultValue: 60,
        unit:"px",
        description:"More components at [Framer University](https://frameruni.link/cc)."
    },
})
