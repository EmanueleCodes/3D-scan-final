import { motion } from "framer-motion"
import React, { useMemo, ComponentType } from "react"
import { addPropertyControls, ControlType } from "framer"

// Props interface for the Warp Background component
interface WarpBackgroundProps {
    perspective?: number
    beamsPerSide?: number
    beamSize?: number // UI 0.1..1 → internal 2..20%
    speed?: number // 0.1..1 (maps to duration 15s..1s)
    gridColor?: string
    gridThickness?: number // px (0.5..10)
    colors?: {
        mode?: "random" | "pick"
        paletteCount?: number
        color1?: string
        color2?: string
        color3?: string
        color4?: string
        color5?: string
        color6?: string
        color7?: string
        color8?: string
    }
}

// Simple token resolver (supports var(--token, fallback))
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/
function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}
function resolveTokenColor(input?: string): string | undefined {
    if (!input || typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

// Mapping helpers (similar to wavePrism)
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
function mapBeamSizeUiToPercent(ui: number): number {
    // UI 0.1..1 → percent 20..2 (inverse mapping)
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 20, 2)
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
    color,
}: {
    width: string | number
    x: string | number
    delay: number
    duration: number
    color?: string
}) => {
    // Random hue for colorful beams (0-360 degrees on color wheel)
    const hue = Math.floor(Math.random() * 360)
    // Random aspect ratio for varied beam shapes (1-10)
    const aspectRatio = Math.floor(Math.random() * 10) + 1
    const beamColor = color || `hsl(${hue} 80% 60%)`

    return (
        <motion.div
            style={{
                position: "absolute",
                left: `${x}`,
                top: 0,
                width: `${width}`,
                aspectRatio: `1/${aspectRatio}`,
                background: `linear-gradient(${beamColor}, transparent)`,
                // Ensure beam aligns perfectly with grid
                transform: "translateX(-50%)",
            }}
            initial={{ y: "100cqmax", opacity: 0 }}
            animate={{ y: "-100%", opacity: 1 }}
            transition={{
                duration,
                delay,
                ease: "linear",
                opacity: {
                    duration: 0.5,
                    delay: delay,
                    ease: "easeOut",
                },
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
        perspective = 100,
        beamsPerSide = 3,
        beamSize = 0.5, // UI value
        speed = 0.5,
        gridColor = "rgba(128, 128, 128, 0.3)",
        gridThickness = 1,
        colors,
    } = props

    // Map speed (0.1..1) to duration seconds (15..1)
    const clampedSpeed = Math.max(0.1, Math.min(1, speed))
    const normalized = (clampedSpeed - 0.1) / 0.9 // 0..1
    const beamDuration = 15 - 14 * normalized // 15 -> 1

    // Map beamSize UI to internal percentage used for grid spacing
    const gridPercent = mapBeamSizeUiToPercent(beamSize)

    // Prepare palette (if provided)
    const palette: string[] = useMemo(() => {
        if (colors?.mode !== "pick") return []
        const list: string[] = []
        const count = Math.max(0, Math.min(8, colors?.paletteCount ?? 0))
        if (count > 0) {
            const candidates = [
                resolveTokenColor(colors?.color1),
                resolveTokenColor(colors?.color2),
                resolveTokenColor(colors?.color3),
                resolveTokenColor(colors?.color4),
                resolveTokenColor(colors?.color5),
                resolveTokenColor(colors?.color6),
                resolveTokenColor(colors?.color7),
                resolveTokenColor(colors?.color8),
            ].filter(Boolean) as string[]
            for (let i = 0; i < Math.min(count, candidates.length); i++) {
                list.push(candidates[i])
            }
        }
        return list
    }, [colors])

    /**
     * Generates a continuous stream of random beams
     * Each beam appears with proper spacing, only beamsPerSide visible at once
     */
    const generateBeamsStream = () => {
        const beams: { x: number; delay: number; color?: string }[] = []
        const cellsPerSide = Math.floor(100 / gridPercent)

        // Create multiple cycles to ensure continuous stream
        const numCycles = 10
        const slot = beamDuration / Math.max(1, beamsPerSide)
        // Phase offset so each side doesn't always start at t=0
        const phaseOffset = Math.random() * slot
        // Limit jitter to keep starts inside their slot, preserving concurrency
        const maxJitter = Math.max(0, slot * 0.6)

        for (let cycle = 0; cycle < numCycles; cycle++) {
            for (let i = 0; i < beamsPerSide; i++) {
                // Random grid position
                const x = Math.floor(Math.random() * cellsPerSide)

                // Base start time for this slot
                const base = cycle * beamDuration + i * slot
                // Add a small random offset but keep it inside the slot
                const jitter = Math.random() * maxJitter
                const delay = Math.min(
                    base + phaseOffset + jitter,
                    base + slot - 0.001
                )

                // Pick color from palette if provided
                const color = palette.length
                    ? palette[Math.floor(Math.random() * palette.length)]
                    : undefined

                beams.push({ x, delay, color })
            }
        }

        return beams
    }

    // Generate continuous beam streams for each side
    const topBeams = useMemo(
        () => generateBeamsStream(),
        [beamsPerSide, gridPercent, beamDuration, palette]
    )
    const rightBeams = useMemo(
        () => generateBeamsStream(),
        [beamsPerSide, gridPercent, beamDuration, palette]
    )
    const bottomBeams = useMemo(
        () => generateBeamsStream(),
        [beamsPerSide, gridPercent, beamDuration, palette]
    )
    const leftBeams = useMemo(
        () => generateBeamsStream(),
        [beamsPerSide, gridPercent, beamDuration, palette]
    )

    // Grid background pattern using CSS gradients
    const linePx = Math.max(0.5, Math.min(10, gridThickness))
    const gridBackground = `
        linear-gradient(${gridColor} 0 ${linePx}px, transparent ${linePx}px ${gridPercent}%) 0 0 / ${gridPercent}% ${gridPercent}%,
        linear-gradient(90deg, ${gridColor} 0 ${linePx}px, transparent ${linePx}px ${gridPercent}%) 0 0 / ${gridPercent}% ${gridPercent}%
    `

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
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
                        backgroundSize: `${gridPercent}% ${gridPercent}%`,
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
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
                            delay={beam.delay}
                            duration={beamDuration}
                            color={beam.color}
                        />
                    ))}
                </div>

                {/* Bottom side */}
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        transformStyle: "preserve-3d",
                        backgroundSize: `${gridPercent}% ${gridPercent}%`,
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
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
                            delay={beam.delay}
                            duration={beamDuration}
                            color={beam.color}
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
                        backgroundSize: `${gridPercent}% ${gridPercent}%`,
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
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
                            delay={beam.delay}
                            duration={beamDuration}
                            color={beam.color}
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
                        backgroundSize: `${gridPercent}% ${gridPercent}%`,
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
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
                            delay={beam.delay}
                            duration={beamDuration}
                            color={beam.color}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

// Display name for Framer UI
WarpBackground.displayName = "Warp Background"

// Property controls for Framer
addPropertyControls(WarpBackground, {
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 50,
        max: 500,
        step: 10,
        defaultValue: 100,
    },
    beamsPerSide: {
        type: ControlType.Number,
        title: "Beams",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 3,
    },
    beamSize: {
        type: ControlType.Number,
        title: "Grid",
        min: 0.1,
        max: 1,
        step: 0.05,
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
    colors: {
        type: ControlType.Object,
        title: "Beams",
        controls: {
            mode: {
                type: ControlType.Enum,
                title: "Colors",
                options: ["random", "pick"],
                optionTitles: ["Random", "Pick Colors"],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                defaultValue: "random",
            },
            paletteCount: {
                type: ControlType.Number,
                title: "Palette",
                min: 1,
                max: 8,
                step: 1,
                defaultValue: 2,
                hidden: (p: any) => p?.mode !== "pick",
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 1,
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                hidden: (p: any) =>
                    p?.mode !== "pick" || (p?.paletteCount ?? 0) < 8,
            },
        },
    },
    gridColor: {
        type: ControlType.Color,
        title: "Grid Color",
        defaultValue: "rgba(128, 128, 128, 0.3)",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
    gridThickness: {
        type: ControlType.Number,
        title: "Thickness",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 1,
    },
})
