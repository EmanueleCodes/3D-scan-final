import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
import { AnimatePresence, motion } from "framer-motion"

interface Particle {
    id: number
    size: number
    x: number
    y: number
    animationTarget: number
}

interface ExplodingInputProps {
    backgroundColor?: string
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function ExplodingInput({
    backgroundColor = "#6366f1",
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
            
            // Random animation target (move left by random amount)
            const animationTarget = Math.random() * -48 - 48 // Between -48 and -96
            
            particleIdCounter.current += 1
            
            const newParticle: Particle = {
                id: particleIdCounter.current,
                size,
                x: x - size/4, // Center the particle on the character
                y,
                animationTarget, // Store target for animation
            }
            
            setParticles((prev) => [...prev, newParticle])
            
            // Remove particle after animation
            setTimeout(() => {
                setParticles((prev) => prev.filter(p => p.id !== newParticle.id))
            }, 4000)
        }

        // Listen to input changes
        const handleInput = () => {
            createParticle()
        }

        input.addEventListener("input", handleInput)

        return () => {
            input.removeEventListener("input", handleInput)
        }
    }, [])

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
                        initial={{ opacity: 1, scale: 1, x: 0 }}
                        animate={{ 
                            x: particle.animationTarget 
                        }}
                        exit={{ opacity: 0, scale: 0.1 }}
                        transition={{ duration: 0.8, ease: "linear" }}
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
    backgroundColor: {
        type: ControlType.Color,
        title: "Particle Color",
        defaultValue: "#6366f1",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ExplodingInput.displayName = "Exploding Input"

