import React, { useEffect, useRef, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface StarProps {
    count?: number
    speed?: number
    thickness?: number
    opacity?: number
    length?: number
    color?: string // Legacy single color prop
    centerThinning?: number // How much stars thin when approaching center
}

interface ColorsProps {
    paletteCount?: number
    color1?: string
    color2?: string
    color3?: string
    color4?: string
    color5?: string
}

interface TravelInSpaceProps {
    paused?: boolean
    star?: StarProps
    innerRadius?: number
    outerRadius?: number
    backgroundColor?: string
    colors?: ColorsProps
    framerUniversity?: string
}

interface Star {
    x: number
    y: number
    z: number
    vx: number
    vy: number
    vz: number
    opacity: number
    baseOpacity: number // Store the original opacity for calculations
    size: number
    age: number
    maxAge: number
    fadeInProgress: number // Fade-in progress (0-1)
    fadeInSpeed: number // Speed of fade-in (based on star speed)
    color: string // RGB color string for this specific star
    colorAlpha: number // Alpha value from the color token
    colorIndex: number // Index of the color from the palette
}

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

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 1, g: 1, b: 1, a: 1 }
    const str = input.trim()

    // rgba(R,G,B,A)
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

    // #RRGGBBAA or #RRGGBB
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        const a = parseInt(hex.slice(6, 8), 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return { r, g, b, a: 1 }
    }
    if (hex.length === 4) {
        // #RGBA
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        const a = parseInt(hex[3] + hex[3], 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 3) {
        // #RGB
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return { r, g, b, a: 1 }
    }
    return { r: 1, g: 1, b: 1, a: 1 }
}

// Prepare color palette from colors object
function prepareColorPalette(colors?: ColorsProps, legacyColor?: string): { color: string; alpha: number }[] {
    const palette: { color: string; alpha: number }[] = []
    
    if (colors) {
        const paletteCount = Math.max(1, Math.min(5, colors.paletteCount || 1))
        const colorInputs = [
            colors.color1,
            colors.color2,
            colors.color3,
            colors.color4,
            colors.color5,
        ]
        
        for (let i = 0; i < paletteCount; i++) {
            const colorInput = colorInputs[i]
            if (colorInput) {
                const resolved = resolveTokenColor(colorInput)
                const rgba = parseColorToRgba(resolved)
                // Convert to RGB string for canvas, preserve alpha separately
                const r = Math.round(rgba.r * 255)
                const g = Math.round(rgba.g * 255)
                const b = Math.round(rgba.b * 255)
                palette.push({
                    color: `rgb(${r}, ${g}, ${b})`,
                    alpha: rgba.a
                })
            }
        }
    }
    
    // Fallback to legacy color or default white
    if (palette.length === 0) {
        const fallbackColor = legacyColor || "#FFFFFF"
        const resolved = resolveTokenColor(fallbackColor)
        const rgba = parseColorToRgba(resolved)
        const r = Math.round(rgba.r * 255)
        const g = Math.round(rgba.g * 255)
        const b = Math.round(rgba.b * 255)
        palette.push({
            color: `rgb(${r}, ${g}, ${b})`,
            alpha: rgba.a
        })
    }
    
    return palette
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function TravelInSpace({
    paused = false,
    star = {
        count: 150,
        speed: 0.5,
        thickness: 2,
        opacity: 0.8,
        length: 8,
        color: "#FFFFFF",
        centerThinning: 0.5,
    },
    innerRadius = 50,
    outerRadius = 300,
    backgroundColor = "#000000",
    colors = {
        paletteCount: 1,
        color1: "#FFFFFF",
    },
}: TravelInSpaceProps) {
    // Destructure star properties for easier access
    const {
        count: starCount = 150,
        speed: starSpeed = 0.5,
        thickness: starThickness = 2,
        opacity: starOpacity = 0.8,
        length: starLength = 8,
        color: starColor = "#FFFFFF",
        centerThinning: centerThinning = 0.5,
    } = star
    
    // Prepare color palette
    const colorPalette = prepareColorPalette(colors, starColor)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>()
    const starsRef = useRef<Star[]>([])
    const lastTimeRef = useRef<number>(0)
    const lastSpawnTimeRef = useRef<number>(0)
    const canvasSizeRef = useRef<{ width: number; height: number }>({
        width: 0,
        height: 0,
    })

    // Calculate optimal spawn rate based on system parameters
    const getSpawnInterval = useCallback(() => {
        // MAJOR ISSUE: This calculation assumes all stars travel the same distance!
        // But stars actually spawn at different distances and have different 3D travel paths.
        // This causes speed inconsistencies because:
        // - Stars spawning closer to center have shorter travel distance → appear faster
        // - Stars spawning further from center have longer travel distance → appear slower
        // - Stars with different z-depths have different 3D travel distances
        
        // Calculate travel distance (from outer spawn radius to inner radius)
        const travelDistance = outerRadius - innerRadius

        // Calculate actual speed (we use starSpeed * 0.1 in our velocity calculations)
        const actualSpeed = starSpeed * 0.1 * 60 // Convert to pixels per second (assuming 60fps)

        // Calculate how long it takes for a star to travel from edge to center
        const starLifetime = travelDistance / actualSpeed // in seconds

        // To maintain steady state: spawn_rate = star_count / star_lifetime
        const optimalSpawnRate = starCount / starLifetime // stars per second

        // Convert to spawn interval in milliseconds
        const spawnInterval = 1000 / optimalSpawnRate

        // Use a more aggressive spawn rate to ensure we reach target count quickly
        // Cap the interval to prevent extremely fast spawning while maintaining responsiveness
        return Math.max(16, Math.min(100, spawnInterval))
    }, [starSpeed, starCount, outerRadius, innerRadius])

    // Create a single star
    const createStar = useCallback(
        (centerX: number, centerY: number) => {
            // SPAWN VARIATIONS THAT CAUSE SPEED INCONSISTENCY:
            // Stars spawn at different distances and depths, creating different travel distances
            
            // Spawn stars in a ring around the outer edge to prevent center spawning
            const theta = Math.random() * Math.PI * 2
            const minSpawnRadius = outerRadius * 0.9  // Always spawn at least 120% of outer radius
            const maxSpawnRadius = outerRadius * 1.2  // Up to 200% of outer radius
            const spawnRadius = minSpawnRadius + Math.random() * (maxSpawnRadius - minSpawnRadius)

            const offsetX = spawnRadius * Math.cos(theta)
            const offsetY = spawnRadius * Math.sin(theta)
            const offsetZ = Math.random() * 300 - 150  // Small Z variation for depth

            const baseZ = 200 + Math.random() * 800  // Z varies from 200 to 1000 (much larger range)

            const x = centerX + offsetX
            const y = centerY + offsetY
            const z = baseZ + offsetZ

            // STAR VELOCITY CALCULATION
            // Each star gets a random speed jitter for natural variation
            const speedJitter = 0.7 + Math.random() * 0.6  // Random factor between 0.7-1.3
            const baseSpeed = starSpeed * 0.1 * speedJitter // Base 3D speed with jitter

            // Calculate 3D direction vector from star position to center (0,0,0)
            const dx = centerX - x  // X distance to center
            const dy = centerY - y  // Y distance to center  
            const dz = 0 - z        // Z distance to center (center is at z=0)
            const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz)

            // CONSTANT VELOCITY: No perspective compensation - stars maintain constant 3D velocity

            // Randomize base opacity for more natural variation
            const randomOpacity = starOpacity * (0.6 + Math.random() * 0.4)

            // Use slower fade-in speed for more pronounced fade-in effect
            const fadeInSpeed = 1 // Slower fade-in rate for more dramatic effect

            // Assign color from palette with equal distribution
            const colorIndex = Math.floor(Math.random() * colorPalette.length)
            const colorData = colorPalette[colorIndex]

            // Calculate spawn size based on actual spawn radius (not distance from center)
            // Stars that spawn further out (larger spawnRadius) should be smaller initially
            const spawnDistanceFactor = Math.max(0.3, Math.min(1.2, 1 - ((spawnRadius - minSpawnRadius) / (maxSpawnRadius - minSpawnRadius))))
            
            // Stars that spawn further out should be smaller initially
            const baseSize = starThickness * (0.5 + Math.random() * 1.5)
            const spawnSize = baseSize * spawnDistanceFactor

            return {
                x,
                y,
                z,
                // 3D velocity components: normalized direction * speed (constant velocity)
                vx: (dx / distance3D) * baseSpeed,
                vy: (dy / distance3D) * baseSpeed,
                vz: (dz / distance3D) * baseSpeed,
                opacity: 0, // Start with 0 opacity for fade-in
                baseOpacity: randomOpacity,
                size: spawnSize,
                age: 0,
                maxAge: Math.random() * 10 + 15,
                fadeInProgress: 0,
                fadeInSpeed: fadeInSpeed,
                color: colorData.color,
                colorAlpha: colorData.alpha,
                colorIndex: colorIndex,
            }
        },
        [starSpeed, starThickness, starOpacity, outerRadius, colorPalette]
    )

    // Initialize stars - start with empty canvas for smooth buildup
    const initStars = useCallback(
        (width: number, height: number) => {
            // Start with empty star array - stars will spawn gradually
            starsRef.current = []
            canvasSizeRef.current = { width, height }

            // Reset spawn timer to start spawning immediately
            lastSpawnTimeRef.current = 0

            // Pre-spawn some stars to get started faster
            const centerX = width / 2
            const centerY = height / 2
            const initialStars = Math.min(starCount * 0.3, 50) // Start with 30% of target or max 50

            for (let i = 0; i < initialStars; i++) {
                const newStar = createStar(centerX, centerY)
                starsRef.current.push(newStar)
            }
        },
        [starCount, createStar]
    )

    // Update and render stars
    const updateAndRender = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            width: number,
            height: number,
            deltaTime: number,
            currentTime: number
        ) => {
            const centerX = width / 2
            const centerY = height / 2

            // Clear canvas completely first
            ctx.clearRect(0, 0, width, height)
            
            // Draw background color with opacity support
            const bgRgba = parseColorToRgba(backgroundColor)
            const bgR = Math.round(bgRgba.r * 255)
            const bgG = Math.round(bgRgba.g * 255)
            const bgB = Math.round(bgRgba.b * 255)
            ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, ${bgRgba.a})`
            ctx.fillRect(0, 0, width, height)

            // Pre-calculate frequently used values - lower perspective for more dramatic effect
            const perspective = 600
            const fadeOutStartDistance = innerRadius * 2.5  // Start fading much earlier
            const fadeOutEndDistance = innerRadius * 1    // Fade to center
            const fadeOutRange = fadeOutStartDistance - fadeOutEndDistance
            const viewportCenterX = centerX
            const viewportCenterY = centerY
            const maxAngularDistance = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2)
            const deltaTimeSeconds = deltaTime * 0.001

            const stars = starsRef.current

            // Update existing stars and remove dead ones
            for (let i = stars.length - 1; i >= 0; i--) {
                const star = stars[i]
                star.age += deltaTimeSeconds

                // Update 3D position with perspective-compensated x/y to stabilize on-screen speed
                const perspectiveScalePre = perspective / (perspective + star.z)
                const compensation = 1 / perspectiveScalePre
                star.x += star.vx * deltaTime * compensation
                star.y += star.vy * deltaTime * compensation
                star.z += star.vz * deltaTime

                // OPTIMIZED PERSPECTIVE PROJECTION:
                // Cache perspective calculation and use fast division
                const perspectiveScale = perspective / (perspective + star.z)
                const screenX = centerX + (star.x - centerX) * perspectiveScale
                const screenY = centerY + (star.y - centerY) * perspectiveScale

                // Fast distance calculation using cached values
                const dx = star.x - centerX
                const dy = star.y - centerY
                const distanceFromCenter = Math.sqrt(dx * dx + dy * dy)

                // Check if star should be removed (hard boundaries)
                // For perspective-compensated movement, check world-space distance from center
                const worldDistanceFromCenter = Math.sqrt(dx * dx + dy * dy)
                const shouldRemove =
                    screenX < -100 ||
                    screenX > width + 100 ||
                    screenY < -100 ||
                    screenY > height + 100 ||
                    star.z < 50 ||
                    star.age > star.maxAge ||
                    worldDistanceFromCenter < innerRadius * 0.8 // Remove when close to center in world space

                if (shouldRemove) {
                    stars.splice(i, 1)
                    continue
                }

                // Update fade-in progress based on time and star speed
                if (star.fadeInProgress < 1) {
                    star.fadeInProgress = Math.min(1, star.fadeInProgress + deltaTimeSeconds * star.fadeInSpeed)
                }

                // OPTIMIZED opacity calculation using cached values
                let positionOpacity = 1
                
                if (distanceFromCenter < fadeOutStartDistance) {
                    // Use cached fadeOutRange for faster calculation
                    const fadeOutProgress = Math.max(0, (distanceFromCenter - fadeOutEndDistance) / fadeOutRange)
                    positionOpacity = Math.sqrt(fadeOutProgress) // Faster than Math.pow(x, 0.5)
                }

                // Apply both fade-in and position-based opacity, then multiply by color alpha
                star.opacity = star.baseOpacity * star.fadeInProgress * positionOpacity * star.colorAlpha

                // Only render if star has some opacity
                if (star.opacity > 0.01) {
                    // OPTIMIZED: Reuse perspective scale from earlier calculation
                    const currentSize = star.size * perspectiveScale
                    const currentOpacity = star.opacity

                    // Only render if star is visible and large enough
                    if (currentOpacity > 0.05 && currentSize > 0.3) {
                        // OPTIMIZED perspective-based star length calculation
                        // Reuse screen coordinates and cached maxAngularDistance
                        const angularDistanceFromCenter = Math.sqrt(
                            (screenX - viewportCenterX) ** 2 + (screenY - viewportCenterY) ** 2
                        )
                        
                        // Fast normalization using pre-calculated max distance
                        const normalizedAngularDistance = Math.min(1, angularDistanceFromCenter / maxAngularDistance)
                        
                        // Apply perspective shortening
                        const perspectiveFactor = 0.3 + (normalizedAngularDistance * 0.7)
                        const streakLength = Math.max(2, starLength * perspectiveFactor)

                        // OPTIMIZED direction calculation
                        const directionLength = Math.sqrt(star.vx * star.vx + star.vy * star.vy)

                        if (directionLength > 0 && streakLength > 1) {
                            // Fast normalize without intermediate variables
                            const invDirLength = 1 / directionLength
                            const normalizedX = star.vx * invDirLength
                            const normalizedY = star.vy * invDirLength

                            // Calculate streak endpoints
                            const streakOffset = streakLength * 0.3
                            const startX = screenX - normalizedX * streakOffset
                            const startY = screenY - normalizedY * streakOffset
                            const endX = screenX + normalizedX * streakLength
                            const endY = screenY + normalizedY * streakLength

                            // OPTIMIZED thickness calculation using cached distance and centerThinning control
                            const thicknessFactor = Math.max(0.2, Math.min(1, distanceFromCenter / outerRadius))
                            const lineWidth = Math.max(0.2, starThickness * (1 - centerThinning + (thicknessFactor * centerThinning)))
                            
                            // Apply thickness-based opacity reduction
                            const thicknessOpacityFactor = Math.max(0.3, thicknessFactor)
                            star.opacity *= thicknessOpacityFactor

                            // OPTIMIZED canvas operations - set properties once
                            ctx.lineWidth = lineWidth
                            ctx.lineCap = "round"
                            
                            // Use the star's assigned color with the calculated opacity (already includes color alpha)
                            const baseColor = star.color.replace('rgb(', '').replace(')', '')
                            ctx.strokeStyle = `rgba(${baseColor}, ${currentOpacity})`
                            
                            // Draw the streak
                            ctx.beginPath()
                            ctx.moveTo(startX, startY)
                            ctx.lineTo(endX, endY)
                            ctx.stroke()
                        }
                    }
                }
            }

            // Spawn new stars continuously using calculated optimal rate
            const spawnInterval = getSpawnInterval()

            // Spawn multiple stars if we're far below target count
            const starsNeeded = starCount - stars.length
            if (starsNeeded > 0) {
                const timeSinceLastSpawn =
                    currentTime - lastSpawnTimeRef.current

                if (timeSinceLastSpawn > spawnInterval) {
                    // Spawn up to 3 stars at once if we're significantly below target
                    const starsToSpawn = Math.min(3, starsNeeded)

                    for (let i = 0; i < starsToSpawn; i++) {
                        const newStar = createStar(centerX, centerY)
                        stars.push(newStar)
                    }

                    lastSpawnTimeRef.current = currentTime
                }
            }

            starsRef.current = stars
        },
        [
            backgroundColor,
            innerRadius,
            starCount,
            createStar,
            getSpawnInterval,
            starOpacity,
            starThickness,
            starLength,
            outerRadius,
        ]
    )

    // Animation loop
    const animate = useCallback(
        (currentTime: number) => {
            // Only apply paused state in Canvas mode
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            if (!paused && isCanvas) {
                // In Canvas mode when paused, ensure we have stars and render a static frame
                const canvas = canvasRef.current
                if (canvas) {
                    const ctx = canvas.getContext("2d")
                    if (ctx) {
                        // Ensure we have enough stars for the paused view
                        if (starsRef.current.length < starCount * 0.5) {
                            // If we don't have enough stars, spawn some more
                            const centerX = canvas.width / 2
                            const centerY = canvas.height / 2
                            const needed = Math.min(starCount, starCount - starsRef.current.length)
                            for (let i = 0; i < needed; i++) {
                                const newStar = createStar(centerX, centerY)
                                // For paused mode, ensure stars are visible
                                newStar.fadeInProgress = 1.0 // Fully faded in
                                newStar.opacity = newStar.baseOpacity * newStar.colorAlpha // Set proper opacity
                                starsRef.current.push(newStar)
                            }
                        }
                        
                        // Render the current state with no delta time to keep stars still
                        updateAndRender(
                            ctx,
                            canvas.width,
                            canvas.height,
                            0, // No delta time to keep stars completely still
                            currentTime
                        )
                    }
                }
                animationRef.current = requestAnimationFrame(animate)
                return
            }

            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext("2d")
            if (!ctx) return

            const deltaTime = currentTime - lastTimeRef.current
            lastTimeRef.current = currentTime

            updateAndRender(
                ctx,
                canvas.width,
                canvas.height,
                deltaTime,
                currentTime
            )

            animationRef.current = requestAnimationFrame(animate)
        },
        [paused, updateAndRender]
    )

    // Handle resize
    const handleResize = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const container = canvas.parentElement
        if (!container) return

        // Use clientWidth/clientHeight for more reliable sizing in Framer Canvas
        const width = Math.max(container.clientWidth, 2)
        const height = Math.max(container.clientHeight, 2)

        // Set canvas dimensions to match container exactly
        canvas.width = width
        canvas.height = height
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        initStars(width, height)
    }, [initStars])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Set up canvas
        ctx.imageSmoothingEnabled = false
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        
        // Enable alpha blending for proper transparency
        ctx.globalCompositeOperation = "source-over"

        handleResize()

        // Start animation
        animationRef.current = requestAnimationFrame(animate)

        // Handle resize
        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(canvas.parentElement!)

        // CRITICAL: Canvas mode specific handling
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(handleResize, 50)
            setTimeout(handleResize, 150)
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            resizeObserver.disconnect()
        }
    }, [handleResize, animate])

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    background: "transparent",
                }}
            />
        </div>
    )
}

TravelInSpace.defaultProps = {
    paused: false,
    star: {
        count: 150,
        speed: 0.5,
        thickness: 2,
        opacity: 0.8,
        length: 8,
        color: "#FFFFFF",
        centerThinning: 0.5,
    },
    innerRadius: 50,
    outerRadius: 300,
    backgroundColor: "#000000",
    colors: {
        paletteCount: 1,
        color1: "#FFFFFF",
    },
}

addPropertyControls(TravelInSpace, {
    paused: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    star: {
        type: ControlType.Object,
        title: "Stars",
        controls: {
            count: {
        type: ControlType.Number,
                title: "Count",
        min: 10,
        max: 1000,
        step: 10,
                defaultValue: 500,
    },
            speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 0.5,
    },
            thickness: {
        type: ControlType.Number,
        title: "Thickness",
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 2,
    },
            opacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.8,
    },
            length: {
        type: ControlType.Number,
        title: "Length",
        min: 1,
        max: 100,
        step: 5,
        defaultValue: 8,
            },
            centerThinning: {
        type: ControlType.Number,
        title: "Center Thinning",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
            },
        },
    },
    innerRadius: {
        type: ControlType.Number,
        title: "Radius in",
        min: 10,
        max: 500,
        step: 5,
        defaultValue: 50,
        unit: "px",
    },
    outerRadius: {
        type: ControlType.Number,
        title: "Radius out",
        min: 500,
        max: 1500,
        step: 100,
        defaultValue: 1000,
        unit: "px",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    colors: {
        type: ControlType.Object,
        title: "Colors",
        description: "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            paletteCount: {
                type: ControlType.Number,
                title: "Palette Size",
                min: 1,
                max: 5,
                step: 1,
                defaultValue: 1,
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "#FFFFFF",
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#FF6B6B",
                hidden: (props: any) => (props?.paletteCount ?? 1) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#4ECDC4",
                hidden: (props: any) => (props?.paletteCount ?? 1) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "#45B7D1",
                hidden: (props: any) => (props?.paletteCount ?? 1) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "#96CEB4",
                hidden: (props: any) => (props?.paletteCount ?? 1) < 5,
            },
        },
    },
})

TravelInSpace.displayName = "Travel In Space"
