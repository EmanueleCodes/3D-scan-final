import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

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
    const [currentColor, setCurrentColor] = useState(backgroundColor)
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

        // Function to generate color from input value
        const updateColorFromInput = (value: string) => {
            if (value.length === 0) {
                setCurrentColor(backgroundColor)
                return
            }

            // Generate a color based on the input value
            // Simple hash function to convert string to color
            let hash = 0
            for (let i = 0; i < value.length; i++) {
                hash = value.charCodeAt(i) + ((hash << 5) - hash)
            }

            // Convert to a color
            const hue = Math.abs(hash % 360)
            const saturation = 60 + (Math.abs(hash) % 20) // 60-80%
            const lightness = 50 + (Math.abs(hash) % 10) // 50-60%

            setCurrentColor(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
        }

        // Listen to input changes
        const handleInput = (e: Event) => {
            const target = e.target as HTMLInputElement
            updateColorFromInput(target.value)
        }

        input.addEventListener("input", handleInput)

        // Initial color update
        updateColorFromInput(input.value)

        return () => {
            input.removeEventListener("input", handleInput)
        }
    }, [backgroundColor])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: currentColor,
                transition: "background-color 0.3s ease",
                borderRadius: "3px",
            }}
        />
    )
}

addPropertyControls(ExplodingInput, {
    backgroundColor: {
        type: ControlType.Color,
        title: "Base Color",
        defaultValue: "#6366f1",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ExplodingInput.displayName = "Exploding Input"

