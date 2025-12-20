import React, { useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import Snowfall from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/snow.js"

// CSS variable token and color parsing (hex/rgba/var())
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

function resolveTokenColor(input: string | undefined): string {
    if (!input || typeof input !== "string") return input || ""
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()

    // Handle rgba() format
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return { r, g, b, a }
    }

    // Handle hex formats
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

interface SnowFallProps {
    preview?: boolean
    background?: string
    color?: string
    snowflakeCount?: number
    speedMin?: number
    speedMax?: number
    windMin?: number
    windMax?: number
    radiusMin?: number
    radiusMax?: number
    useImages?: boolean
    opacityMin?: number
    opacityMax?: number
    rotationSpeedMin?: number
    rotationSpeedMax?: number
    transitionTime?: number
    style?: React.CSSProperties
}

const DEFAULTS = {
    background: "#000000",
    color: "#dee4fd",
    snowflakeCount: 150,
    speedMin: 1.0,
    speedMax: 3.0,
    windMin: -0.5,
    windMax: 2.0,
    radiusMin: 0.5,
    radiusMax: 3.0,
    useImages: false,
    opacityMin: 0.1,
    opacityMax: 0.2,
    rotationSpeedMin: -1.0,
    rotationSpeedMax: 1.0,
    transitionTime: 500, // Transition time in milliseconds (0 = instant)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function SnowFall({
    preview = false,
    background = DEFAULTS.background,
    color = DEFAULTS.color,
    snowflakeCount = DEFAULTS.snowflakeCount,
    speedMin = DEFAULTS.speedMin,
    speedMax = DEFAULTS.speedMax,
    windMin = DEFAULTS.windMin,
    windMax = DEFAULTS.windMax,
    radiusMin = DEFAULTS.radiusMin,
    radiusMax = DEFAULTS.radiusMax,
    useImages = DEFAULTS.useImages,
    opacityMin = DEFAULTS.opacityMin,
    opacityMax = DEFAULTS.opacityMax,
    rotationSpeedMin = DEFAULTS.rotationSpeedMin,
    rotationSpeedMax = DEFAULTS.rotationSpeedMax,
    transitionTime = DEFAULTS.transitionTime,
    style,
}: SnowFallProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
    const shouldAnimate = !isCanvasMode || preview

    // Resolve colors with token support
    const resolvedBackground = resolveTokenColor(background)
    const resolvedColor = resolveTokenColor(color)

    // Prepare snowfall config
    const snowfallConfig = {
        color: resolvedColor,
        snowflakeCount,
        speed: [speedMin, speedMax] as [number, number],
        wind: [windMin, windMax] as [number, number],
        radius: [radiusMin, radiusMax] as [number, number],
        rotationSpeed: [rotationSpeedMin, rotationSpeedMax] as [number, number],
        opacity: [opacityMin, opacityMax] as [number, number],
        transitionTime, // Transition time in milliseconds (0 = instant)
        // Note: images prop not implemented - react-snowfall uses default circles when undefined
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor: resolvedBackground,
            }}
        >
            <Snowfall
                {...snowfallConfig}
                paused={!shouldAnimate}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

addPropertyControls(SnowFall, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    snowflakeCount: {
        type: ControlType.Number,
        title: "Snowflake Count",
        min: 0,
        max: 1000,
        step: 1,
        defaultValue: DEFAULTS.snowflakeCount,
    },
    speedMin: {
        type: ControlType.Number,
        title: "Speed Min",
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: DEFAULTS.speedMin,
    },
    speedMax: {
        type: ControlType.Number,
        title: "Speed Max",
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: DEFAULTS.speedMax,
    },
    windMin: {
        type: ControlType.Number,
        title: "Wind Min",
        min: -5,
        max: 10,
        step: 0.1,
        defaultValue: DEFAULTS.windMin,
    },
    windMax: {
        type: ControlType.Number,
        title: "Wind Max",
        min: -5,
        max: 10,
        step: 0.1,
        defaultValue: DEFAULTS.windMax,
    },
    radiusMin: {
        type: ControlType.Number,
        title: "Radius Min",
        min: 0.1,
        max: 20,
        step: 0.1,
        defaultValue: DEFAULTS.radiusMin,
    },
    radiusMax: {
        type: ControlType.Number,
        title: "Radius Max",
        min: 0.1,
        max: 20,
        step: 0.1,
        defaultValue: DEFAULTS.radiusMax,
    },
    useImages: {
        type: ControlType.Boolean,
        title: "Use Images",
        defaultValue: DEFAULTS.useImages,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    opacityMin: {
        type: ControlType.Number,
        title: "Opacity Min",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: DEFAULTS.opacityMin,
    },
    opacityMax: {
        type: ControlType.Number,
        title: "Opacity Max",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: DEFAULTS.opacityMax,
    },
    rotationSpeedMin: {
        type: ControlType.Number,
        title: "Rotation Speed Min",
        min: -5,
        max: 5,
        step: 0.1,
        defaultValue: DEFAULTS.rotationSpeedMin,
    },
    rotationSpeedMax: {
        type: ControlType.Number,
        title: "Rotation Speed Max",
        min: -5,
        max: 5,
        step: 0.1,
        defaultValue: DEFAULTS.rotationSpeedMax,
    },
    transitionTime: {
        type: ControlType.Number,
        title: "Transition",
        min: 0,
        max: 2000,
        step: 50,
        defaultValue: DEFAULTS.transitionTime,
        unit: "ms",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: DEFAULTS.color,
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: DEFAULTS.background,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

SnowFall.displayName = "Snow Fall"
