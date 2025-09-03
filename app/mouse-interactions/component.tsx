import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface MouseDotProps {
    size?: number
    color?: string
    opacity?: number
    blendMode?: string
    framerUniversity?: string
}

export function MouseDot({
    size = 20,
    color = "#ff0000",
    opacity = 0.8,
    blendMode = "difference",
    framerUniversity = "https://frameruni.link/cc",
}: MouseDotProps) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const dotRef = React.useRef<HTMLDivElement>(null)
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Track global mouse movement
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY })
        }

        // Add global event listener
        document.addEventListener("mousemove", handleMouseMove)

        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "visible", // Allow overflow so dot can go outside
                cursor: "none", // Hide default cursor
            }}
        >
            {!isCanvas && (
                <div
                    ref={dotRef}
                    style={{
                        position: "fixed", // Fixed positioning to follow mouse anywhere on page
                        left: mousePosition.x - size / 2,
                        top: mousePosition.y - size / 2,
                        width: size,
                        height: size,
                        borderRadius: "50%",
                        backgroundColor: color,
                        opacity: opacity,
                        mixBlendMode: blendMode as any,
                        pointerEvents: "none",
                        transition: "none", // No transition for immediate following
                        zIndex: 9999, // Ensure dot appears above other elements
                    }}
                />
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
    framerUniversity: {
        type: ControlType.String,
        title: "Framer University",
        defaultValue: "https://frameruni.link/cc",
        hidden: () => true,
    },
})
