import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
import { AnimatePresence, motion } from "framer-motion"

interface Particle {
    id: number
    size: number
    x: number
    y: number
    baseY: number
    vx: number // velocity x
    vy: number // velocity y
    gravity: number
    ageMs: number
    lifeMs: number
}

// Mapping helpers (see how-to-build-framer-components/mappingValues.md)
function mapLinear(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}

interface ExplodingInputProps {
    mode?: "bubbles" | "components"
    backgroundColor?: string
    upwardSpeed?: number
    upwardSpread?: number
    horizontalSpeed?: number
    horizontalSpread?: number
    gravity?: number
    duration?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 10
 * @framerIntrinsicHeight 10
 * @framerDisableUnlink
 */

export default function ExplodingInput({
    backgroundColor = "#6366f1",
    upwardSpeed = 180,
    upwardSpread = 120,
    horizontalSpeed = 80,
    horizontalSpread = 80,
    gravity = 900,
    duration = 1200,
    style,
}: ExplodingInputProps) {
    const [particles, setParticles] = useState<Particle[]>([])
    const particleIdCounter = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // Find input element and listen to changes
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Find the parent label element
        const label = container.closest("label")
        if (!label) return

        // Find the input element within the label
        const input = label.querySelector("input")
        if (!input) return

        // Function to create a particle at input position
        const createParticle = () => {
            const inputRect = input.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()

            // Get the input value
            const inputValue = (input as HTMLInputElement).value
            
            // Calculate position of the last character in the input
            // We need to measure text width up to the last character
            const getTextWidth = (text: string, input: HTMLInputElement) => {
                const canvas = document.createElement('canvas')
                const context = canvas.getContext('2d')
                if (!context) return 0
                
                // Get computed styles from the input
                const computedStyle = window.getComputedStyle(input)
                context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`
                return context.measureText(text).width
            }
            
            // Calculate x position of the last character
            let x = 0
            if (inputValue.length > 0) {
                const textWidth = getTextWidth(inputValue, input as HTMLInputElement)
                const inputStartX = inputRect.left - containerRect.left
                
                // Clamp to input field bounds (don't exceed the input width)
                // Limit to the right edge of the input field
                const computedStyle = window.getComputedStyle(input)
                const paddingRight = parseInt(computedStyle.paddingRight, 10)
                const maxX = inputStartX + inputRect.width - paddingRight
                x = Math.min(textWidth + inputStartX, maxX)
            } else {
                // If input is empty, position at the start
                x = inputRect.left - containerRect.left
            }
            
            const y = inputRect.top - containerRect.top + (inputRect.height / 2)
            
            // Random size less than 48px
            const size = Math.random() * 40 + 8 // Between 8 and 48px
            
            // Map user-friendly controls to internal velocities
            // horizontalSpeed: -1..1 → -400..400 px/s
            const clampedHX = Math.max(-1, Math.min(1, horizontalSpeed as number))
            const baseVx = mapLinear(clampedHX, -1, 1, -400, 400)
            const spreadVx = mapLinear(horizontalSpread ?? 0.5, 0, 1, 0, 250) // 0..1 → 0..250 px/s
            const vx = baseVx + (Math.random() * 2 - 1) * spreadVx

            // vertical speed: -1..1 → -400..400 px/s (negative = up, positive = down)
            const clampedUY = Math.max(-1, Math.min(1, upwardSpeed as number))
            const baseVy = mapLinear(clampedUY, -1, 1, -400, 400)
            const spreadVy = mapLinear(upwardSpread ?? 0.5, 0, 1, 0, 300) // 0..1 → 0..300 px/s
            const vy = baseVy + (Math.random() * 2 - 1) * spreadVy
            
            particleIdCounter.current += 1
            
            const newParticle: Particle = {
                id: particleIdCounter.current,
                size,
                x: x - size/4, // Center the particle on the character
                y: y, // absolute relative to container (vertical center of input)
                baseY: y,
                vx, // horizontal velocity
                vy, // vertical velocity (negative = up)
                gravity: mapLinear(Math.max(-1, Math.min(1, gravity ?? 0.45)), -1, 1, -2000, 2000), // gravity acceleration
                ageMs: 0,
                lifeMs: duration * 1000, // seconds → ms
            }
            
            setParticles((prev) => [...prev, newParticle])
            
            // Remove particle after animation
            setTimeout(() => {
                setParticles((prev) => prev.filter(p => p.id !== newParticle.id))
            }, duration * 1000)
        }

        // Listen to input changes
        const handleInput = () => {
            createParticle()
        }

        input.addEventListener("input", handleInput)

        // Physics loop
        let rafId = 0
        let lastTs = performance.now()
        const step = (ts: number) => {
            const dtMs = Math.min(32, ts - lastTs) // clamp to avoid huge jumps
            lastTs = ts

            setParticles(prev => {
                if (prev.length === 0) return prev
                const next: Particle[] = []
                for (const p of prev) {
                    const ageMs = p.ageMs + dtMs
                    const lifeMs = p.lifeMs
                    const dt = dtMs / 1000 // seconds

                    // Integrate motion: s = s + v*dt; v = v + a*dt
                    const vx = p.vx
                    const vy = p.vy + p.gravity * dt
                    const x = p.x + vx * dt
                    const y = p.y + vy * dt

                    if (ageMs < lifeMs) {
                        next.push({ ...p, x, y, vy, ageMs })
                    }
                }
                return next
            })

            rafId = requestAnimationFrame(step)
        }
        rafId = requestAnimationFrame(step)

        return () => {
            input.removeEventListener("input", handleInput)
            cancelAnimationFrame(rafId)
        }
    }, [upwardSpeed, upwardSpread, horizontalSpeed, horizontalSpread, gravity, duration, backgroundColor])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
                backgroundColor: "#f0f0f0",
            }}
        >
            <AnimatePresence>
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{}}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "absolute",
                            left: `${particle.x}px`,
                            top: `${particle.y - particle.size / 2}px`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            borderRadius: "50%",
                            backgroundColor: backgroundColor,
                            pointerEvents: "none",
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}

addPropertyControls(ExplodingInput, {
    mode:{
        type: ControlType.Enum,
        title: "Mode",
        options: ["bubbles", "components"],
        optionTitles: ["Bubbles", "Components"],
        defaultValue: "bubbles",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Particle Color",
        defaultValue: "#6366f1",
        hidden: (props) => props.mode !== "bubbles",
    },
    content: {
        type: ControlType.Array,
        title: "Content",
        control: {
            type: ControlType.ComponentInstance,
        },
        hidden: (props) => props.mode !== "components",
    },
    upwardSpeed: {
        type: ControlType.Number,
        title: "Speed Y",
        min: -1,
        max: 1,
        step: 0.05,
        defaultValue: 0.45,
        
    },
    upwardSpread: {
        type: ControlType.Number,
        title: "Random Y",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        
    },
    horizontalSpeed: {
        type: ControlType.Number,
        title: "Speed X",
        min: -1,
        max: 1,
        step: 0.05,
        defaultValue: -1,
       
    },
    horizontalSpread: {
        type: ControlType.Number,
        title: "Random X",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        
    },
    duration:{
        type: ControlType.Number,
        title: "Duration",
        min: 0.2,
        max: 10,
        step: 0.1,
        defaultValue: 1.2,
        
    },
    gravity: {
        type: ControlType.Number,
        title: "Gravity (-1..1)",
        min: -1,
        max: 1,
        step: 0.05,
        defaultValue: 0.45,
        description: "-1 = strong updraft, 1 = strong gravity",
    },
})

ExplodingInput.displayName = "Exploding Input"

