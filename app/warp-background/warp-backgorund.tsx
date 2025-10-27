import { motion } from "framer-motion"
import React, { useMemo, ComponentType, useState, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Props interface for the Warp Background component
interface WarpBackgroundProps {
    perspective?: number
    beamsPerSide?: number
    speed?: number // 0.1..1 (maps to duration 15s..1s)
    grid?: {
        size?: number // UI 0.1..1 → internal 20..2%
        color?: string
        thickness?: number // px (0.5..10)
    }
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
  duration,
    color,
    staticMode,
    staticY,
    onComplete,
    delay = 0,
    hue = 180,
    aspectRatio = 5,
}: {
    width: string | number
    x: string | number
    duration: number
    color?: string
    staticMode?: boolean
    staticY?: string | number
    onComplete?: () => void
    delay?: number
    hue?: number
    aspectRatio?: number
}) => {
    // Use provided hue and aspectRatio for consistent beam appearance
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
            initial={staticMode ? { y: staticY ?? "-40%", opacity: 1 } : { y: "100cqmax", opacity: 0 }}
            animate={
                staticMode
                    ? { y: staticY ?? "-40%", opacity: 1 }
                    : { y: "-100%", opacity: [0, 1, 1, 0] }
            }
      transition={
                staticMode
                    ? { duration: 0 }
                    : {
                          duration,
                          ease: "linear",
                          delay,
                          opacity: {
                              duration,
                              ease: "linear",
                              times: [0, 0.1, 0.85, 1],
                              delay,
                          },
                      }
            }
            onAnimationComplete={onComplete}
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
        speed = 0.5,
        grid,
        colors,
    } = props

    // Clamp perspective to avoid extreme distortion at very low values
    const effectivePerspective = Math.min(perspective, perspective)

    // Map speed (0.1..1) to duration seconds (15..1)
    const clampedSpeed = Math.max(0.1, Math.min(1, speed))
    const normalized = (clampedSpeed - 0.1) / 0.9 // 0..1
    const beamDuration = 15 - 14 * normalized // 15 -> 1

    // Determine canvas mode - show static beams in canvas, animated in live
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Grid derived values
    const sizeUi = grid?.size ?? 0.5
    // Map UI to desired percent, then snap to an integer number of cells so the grid divides evenly
    const desiredPercent = mapBeamSizeUiToPercent(sizeUi) // ~20..2
    const cellsPerSide = Math.max(5, Math.min(50, Math.round(100 / desiredPercent)))
    const gridPercent = 100 / cellsPerSide
    let gridColor = grid?.color
        ? (resolveTokenColor(grid.color) || grid.color)
        : "transparent"
    if (typeof gridColor === "string" && gridColor.startsWith("var(")) {
        gridColor = "transparent"
    }
    const gridThickness = grid?.thickness ?? 1

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

    // Beam ID counter for unique keys
    const beamIdRef = React.useRef(0)
    
    // Function to spawn a new beam when one completes
    const spawnNewBeam = () => ({
        id: beamIdRef.current++,
        x: Math.floor(Math.random() * cellsPerSide),
        color: palette.length ? palette[Math.floor(Math.random() * palette.length)] : undefined,
        hue: Math.floor(Math.random() * 360), // Random hue for colorful beams
        aspectRatio: Math.floor(Math.random() * 10) + 1 // Random aspect ratio for varied shapes
    })
    
    // State for active beams on each side - each beam has id, x position, and color
    const [topBeams, setTopBeams] = useState(() => 
        Array.from({ length: beamsPerSide }, () => spawnNewBeam())
    )
    const [bottomBeams, setBottomBeams] = useState(() => 
        Array.from({ length: beamsPerSide }, () => spawnNewBeam())
    )
    const [leftBeams, setLeftBeams] = useState(() => 
        Array.from({ length: beamsPerSide }, () => spawnNewBeam())
    )
    const [rightBeams, setRightBeams] = useState(() => 
        Array.from({ length: beamsPerSide }, () => spawnNewBeam())
    )
    const [centerBeams, setCenterBeams] = useState(() => 
        Array.from({ length: beamsPerSide }, () => spawnNewBeam())
    )

    // Static preview beams (visible snapshot in canvas when Preview is Off)
    const generateStaticBeams = () => {
        const beams: { x: number; y: string; color?: string; hue: number; aspectRatio: number }[] = []
        const count = Math.max(1, Math.min(10, beamsPerSide))
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * cellsPerSide)
            // More random y positions - from -80% to -20% for good variation while staying visible
            const y = `${(50 + Math.random() * 100)}%` // place anywhere along the visible path
            const color = palette.length
                ? palette[Math.floor(Math.random() * palette.length)]
                : undefined
            const hue = Math.floor(Math.random() * 360)
            const aspectRatio = Math.floor(Math.random() * 10) + 1
            beams.push({ x, y, color, hue, aspectRatio })
        }
        return beams
    }

    // Static beams for canvas mode only
    const staticTopBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticRightBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticBottomBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticLeftBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticCenterBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
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
                    perspective: `${effectivePerspective}px`,
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
          {(isCanvas ? staticTopBeams : topBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `top-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={!isCanvas ? (index / beamsPerSide) * (beamDuration * 0.8) : 0}
                            onComplete={!isCanvas ? () => {
                                setTopBeams(prev => [...prev.slice(1), spawnNewBeam()])
                            } : undefined}
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
          {(isCanvas ? staticBottomBeams : bottomBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `bottom-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={!isCanvas ? (index / beamsPerSide) * (beamDuration * 0.8) : 0}
                            onComplete={!isCanvas ? () => {
                                setBottomBeams(prev => [...prev.slice(1), spawnNewBeam()])
                            } : undefined}
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
          {(isCanvas ? staticLeftBeams : leftBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `left-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={!isCanvas ? (index / beamsPerSide) * (beamDuration * 0.8) : 0}
                            onComplete={!isCanvas ? () => {
                                setLeftBeams(prev => [...prev.slice(1), spawnNewBeam()])
                            } : undefined}
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
          {(isCanvas ? staticRightBeams : rightBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `right-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={!isCanvas ? (index / beamsPerSide) * (beamDuration * 0.8) : 0}
                            onComplete={!isCanvas ? () => {
                                setRightBeams(prev => [...prev.slice(1), spawnNewBeam()])
                            } : undefined}
            />
          ))}
        </div>

                {/* Center floor - beams appearing in the center area */}
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transformStyle: "preserve-3d",
                        backgroundSize: `${gridPercent}% ${gridPercent}%`,
                        background: gridBackground,
                        containerType: "inline-size",
                        height: "100cqmax",
                        width: "100cqi",
                        transformOrigin: "50% 50%",
                        transform: "translate(-50%, -50%) rotateX(-90deg)",
                    }}
                >
          {(isCanvas ? staticCenterBeams : centerBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `center-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={!isCanvas ? (index / beamsPerSide) * (beamDuration * 0.8) : 0}
                            onComplete={!isCanvas ? () => {
                                setCenterBeams(prev => [...prev.slice(1), spawnNewBeam()])
                            } : undefined}
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
        title: "Count",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 6,
    },
	speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.9,
    },
    grid: {
        type: ControlType.Object,
        title: "Grid",
        controls: {
            size: {
                type: ControlType.Number,
                title: "Count",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.8,
            },
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "rgba(128, 128, 128, 0.2)",
				optional:true
            },
            thickness: {
                type: ControlType.Number,
                title: "Thickness",
                min: 0.5,
                max: 10,
                step: 0.5,
                defaultValue: 1,
            },
        },
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
                defaultValue: "#FF0000", // Red
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 1,
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#FFA500", // Orange
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#FFFF00", // Yellow
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "#00FF00", // Green
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "#0000FF", // Blue
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                defaultValue: "#4B0082", // Indigo
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                defaultValue: "#8B00FF", // Violet
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                defaultValue: "#FFFFFF", // Extra slot default (white)
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 8,
            },
        },
    },
})

WarpBackground.displayName="Warp Background"