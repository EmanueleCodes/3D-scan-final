import { motion } from "framer-motion"
import React, { useCallback, useMemo, ComponentType } from "react"
import { addPropertyControls, ControlType } from "framer"

// Props interface for the Warp Background component
interface WarpBackgroundProps {
    children?: React.ReactNode
    perspective?: number
    beamsPerSide?: number
    beamSize?: number
    beamDelayMax?: number
    beamDelayMin?: number
    beamDuration?: number
    gridColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    padding?: number
}

/**
 * Beam component - represents a single animated light beam
 * Generates a random hue and aspect ratio for visual variety
 */
const Beam = ({
  width,
  x,
  delay,
  duration,
}: {
    width: string | number
    x: string | number
    delay: number
    duration: number
}) => {
    // Random hue for colorful beams (0-360 degrees on color wheel)
    const hue = Math.floor(Math.random() * 360)
    // Random aspect ratio for varied beam shapes (1-10)
    const aspectRatio = Math.floor(Math.random() * 10) + 1

  return (
    <motion.div
            style={{
                position: "absolute",
                left: `${x}`,
                top: 0,
                width: `${width}`,
                aspectRatio: `1/${aspectRatio}`,
                background: `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
                // Ensure beam aligns perfectly with grid
                transform: "translateX(-50%)",
            }}
            initial={{ y: "100cqmax" }}
            animate={{ y: "-100%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function WarpBackground(props: WarpBackgroundProps) {
    const {
  children,
  perspective = 100,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
        gridColor = "rgba(128, 128, 128, 0.3)",
        borderColor = "rgba(128, 128, 128, 0.5)",
        borderWidth = 1,
        borderRadius = 8,
        padding = 80,
    } = props

    /**
     * Generates beam positions with random delays
     * Ensures beams snap precisely to grid lines
     */
  const generateBeams = useCallback(() => {
        const beams = []
        const cellsPerSide = Math.floor(100 / beamSize)
        
        // Generate random positions that align with grid cells
        const usedPositions = new Set()

    for (let i = 0; i < beamsPerSide; i++) {
            let x
            let attempts = 0
            
            // Find a unique grid position
            do {
                x = Math.floor(Math.random() * cellsPerSide)
                attempts++
            } while (usedPositions.has(x) && attempts < cellsPerSide * 2)
            
            usedPositions.add(x)
            const delay =
                Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin
            beams.push({ x, delay })
        }
        return beams
    }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin])

    // Generate beams for each side of the perspective box
    const topBeams = useMemo(() => generateBeams(), [generateBeams])
    const rightBeams = useMemo(() => generateBeams(), [generateBeams])
    const bottomBeams = useMemo(() => generateBeams(), [generateBeams])
    const leftBeams = useMemo(() => generateBeams(), [generateBeams])

    // Grid background pattern using CSS gradients
    const gridBackground = `
        linear-gradient(${gridColor} 0 1px, transparent 1px ${beamSize}%) 50% -0.5px / ${beamSize}% ${beamSize}%,
        linear-gradient(90deg, ${gridColor} 0 1px, transparent 1px ${beamSize}%) 50% 50% / ${beamSize}% ${beamSize}%
    `

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: `${borderRadius}px`,
                border: `${borderWidth}px solid ${borderColor}`,
                padding: `${padding}px`,
            }}
        >
            {/* Perspective container for 3D effect */}
            <div
                style={{
                    pointerEvents: "none",
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    clipPath: "inset(0)",
                    containerType: "size",
                    perspective: `${perspective}px`,
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Top side - rotated to create floor/ceiling effect */}
                <div
                    style={{
                        position: "absolute",
                        transformStyle: "preserve-3d",
                        backgroundSize: `${beamSize}% ${beamSize}%`,
                        background: gridBackground,
                        containerType: "inline-size",
                        height: "100cqmax",
                        transformOrigin: "50% 0%",
                        transform: "rotateX(-90deg)",
                        width: "100cqi",
                    }}
                >
          {topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
              width={`${beamSize}%`}
                            x={`${beam.x * beamSize + beamSize / 2}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>

                {/* Bottom side */}
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        transformStyle: "preserve-3d",
                        backgroundSize: `${beamSize}% ${beamSize}%`,
                        background: gridBackground,
                        containerType: "inline-size",
                        height: "100cqmax",
                        transformOrigin: "50% 0%",
                        transform: "rotateX(-90deg)",
                        width: "100cqi",
                    }}
                >
          {bottomBeams.map((beam, index) => (
            <Beam
              key={`bottom-${index}`}
              width={`${beamSize}%`}
                            x={`${beam.x * beamSize + beamSize / 2}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>

                {/* Left side */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        transformStyle: "preserve-3d",
                        backgroundSize: `${beamSize}% ${beamSize}%`,
                        background: gridBackground,
                        containerType: "inline-size",
                        height: "100cqmax",
                        transformOrigin: "0% 0%",
                        transform: "rotate(90deg) rotateX(-90deg)",
                        width: "100cqh",
                    }}
                >
          {leftBeams.map((beam, index) => (
            <Beam
              key={`left-${index}`}
              width={`${beamSize}%`}
                            x={`${beam.x * beamSize + beamSize / 2}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>

                {/* Right side */}
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        transformStyle: "preserve-3d",
                        backgroundSize: `${beamSize}% ${beamSize}%`,
                        background: gridBackground,
                        containerType: "inline-size",
                        height: "100cqmax",
                        width: "100cqh",
                        transformOrigin: "100% 0%",
                        transform: "rotate(-90deg) rotateX(-90deg)",
                    }}
                >
          {rightBeams.map((beam, index) => (
            <Beam
              key={`right-${index}`}
              width={`${beamSize}%`}
                            x={`${beam.x * beamSize + beamSize / 2}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>
      </div>

            {/* Content layer */}
            <div style={{ position: "relative" }}>{children}</div>
    </div>
    )
}

// Display name for Framer UI
WarpBackground.displayName = "Warp Background"

// Property controls for Framer
addPropertyControls(WarpBackground, {
    children: {
        type: ControlType.ComponentInstance,
        title: "Content",
    },
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 50,
        max: 500,
        step: 10,
        defaultValue: 100,
        description: "Depth of 3D perspective effect",
    },
    beamsPerSide: {
        type: ControlType.Number,
        title: "Beams Per Side",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 3,
        description: "Number of light beams on each side",
    },
    beamSize: {
        type: ControlType.Number,
        title: "Grid Size",
        min: 2,
        max: 20,
        step: 1,
        defaultValue: 5,
        unit: "%",
        description: "Size of each grid cell",
    },
    beamDuration: {
        type: ControlType.Number,
        title: "Beam Speed",
        min: 1,
        max: 10,
        step: 0.5,
        defaultValue: 3,
        unit: "s",
        description: "Duration of beam animation",
    },
    beamDelayMin: {
        type: ControlType.Number,
        title: "Min Delay",
        min: 0,
        max: 5,
        step: 0.5,
        defaultValue: 0,
        unit: "s",
        description: "Minimum delay before beam starts",
    },
    beamDelayMax: {
        type: ControlType.Number,
        title: "Max Delay",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 3,
        unit: "s",
        description: "Maximum delay before beam starts",
    },
    gridColor: {
        type: ControlType.Color,
        title: "Grid Color",
        defaultValue: "rgba(128, 128, 128, 0.3)",
        description: "Color of the grid lines",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: "rgba(128, 128, 128, 0.5)",
        description: "Color of the component border",
    },
    borderWidth: {
        type: ControlType.Number,
        title: "Border Width",
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 1,
        unit: "px",
        description: "Width of the border",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Border Radius",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 8,
        unit: "px",
        description: "Roundness of corners",
    },
    padding: {
        type: ControlType.Number,
        title: "Padding",
        min: 0,
        max: 200,
        step: 10,
        defaultValue: 80,
        unit: "px",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
