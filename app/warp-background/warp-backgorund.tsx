import { motion } from "framer-motion"
import React, { useMemo, useEffect, useState, ComponentType } from "react"
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
    preview?: boolean
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
    play,
    staticY,
}: {
    width: string | number
    x: string | number
    delay: number
    duration: number
    color?: string
    play: boolean
    staticY?: number // percent offset for non-animated snapshots (-100..0)
}) => {
    // Random hue for colorful beams (0-360 degrees on color wheel)
    const hue = Math.floor(Math.random() * 360)
    // Random aspect ratio for varied beam shapes (1-10)
    const aspectRatio = Math.floor(Math.random() * 25) + 5 // broader variety for visible length
    const beamColor = color || `hsl(${hue} 80% 60%)`

    const frozenY = typeof staticY === "number" ? `${staticY}%` : "0%"

    return (
        <motion.div
            style={{
                position: "absolute",
                left: `${x}`,
                top: 0,
                width: `${width}`,
                aspectRatio: `1/${aspectRatio}`,
                background: `linear-gradient(${beamColor}, transparent)`,
                willChange: "transform, opacity",
                transform: "translateX(-50%)",
            }}
            initial={play ? { y: "100%", opacity: 0 } : { y: frozenY, opacity: 1 }}
            animate={play ? { y: "-100%", opacity: 1 } : { y: frozenY, opacity: 1 }}
            transition={{
                duration,
                delay,
                ease: "linear",
                opacity: {
                    duration: 0.5,
                    delay,
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
        speed = 0.5,
        grid,
        colors,
        preview = false,
    } = props

    // Clamp perspective to avoid extreme distortion at very low values
    const effectivePerspective = Math.min(perspective, perspective)

    // Map speed (0.1..1) to duration seconds (15..1)
    const clampedSpeed = Math.max(0.1, Math.min(1, speed))
    const normalized = (clampedSpeed - 0.1) / 0.9 // 0..1
    const beamDuration = 15 - 14 * normalized // 15 -> 1

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

    // Play logic via effect: always animate outside Canvas; inside Canvas animate only if preview is true
    const [playInCanvas, setPlayInCanvas] = useState(true)
    useEffect(() => {
        try {
            const target = RenderTarget.current()
            const isCanvas = target === RenderTarget.canvas
            setPlayInCanvas(isCanvas ? !!preview : true)
        } catch {
            setPlayInCanvas(true)
        }
    }, [preview])

    // When not playing in Canvas, render a small snapshot batch (avoid huge static streams)
    const generateBeamsSnapshot = () => {
        const beams: { x: number; delay: number; color?: string; y?: number }[] = []
        const used = new Set<number>()
        for (let i = 0; i < Math.min(beamsPerSide, cellsPerSide); i++) {
            let x = Math.floor(Math.random() * cellsPerSide)
            let guard = 0
            while (used.has(x) && guard++ < 20) x = Math.floor(Math.random() * cellsPerSide)
            used.add(x)
            const color = palette.length
                ? palette[Math.floor(Math.random() * palette.length)]
                : undefined
            // Random vertical placement for static snapshot (-100%..0%) so beams appear at different stages
            const y = -Math.random() * 100
            beams.push({ x, delay: 0, color, y })
        }
        return beams
    }

    /**
     * Generates a continuous stream of random beams
     * Each beam appears with proper spacing, only beamsPerSide visible at once
     */
    const generateBeamsStream = () => {
        const beams: { x: number; delay: number; color?: string }[] = []

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
        () => (playInCanvas ? generateBeamsStream() : generateBeamsSnapshot()),
        [beamsPerSide, cellsPerSide, beamDuration, palette, playInCanvas]
    )
    const rightBeams = useMemo(
        () => (playInCanvas ? generateBeamsStream() : generateBeamsSnapshot()),
        [beamsPerSide, cellsPerSide, beamDuration, palette, playInCanvas]
    )
    const bottomBeams = useMemo(
        () => (playInCanvas ? generateBeamsStream() : generateBeamsSnapshot()),
        [beamsPerSide, cellsPerSide, beamDuration, palette, playInCanvas]
    )
    const leftBeams = useMemo(
        () => (playInCanvas ? generateBeamsStream() : generateBeamsSnapshot()),
        [beamsPerSide, cellsPerSide, beamDuration, palette, playInCanvas]
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
          {topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              delay={beam.delay}
              duration={beamDuration}
                            color={beam.color}
                            play={playInCanvas}
                            staticY={(beam as any).y}
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
                            play={playInCanvas}
                            staticY={(beam as any).y}
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
                            play={playInCanvas}
                            staticY={(beam as any).y}
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
              key={`right-${index}`