import React, { useEffect, useRef, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface TravelInSpaceProps {
    paused?: boolean
    starCount?: number
    starSpeed?: number
    starThickness?: number
    starOpacity?: number
    starLength?: number
    innerRadius?: number
    outerRadius?: number
    backgroundColor?: string
    starColor?: string
    centerGlow?: boolean
    glowIntensity?: number
    spaghettification?: number
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
    starCount = 150,
    starSpeed = 0.5,
    starThickness = 2,
    starOpacity = 0.8,
    starLength = 8,
    innerRadius = 50,
    outerRadius = 300,
    backgroundColor = "#000000",
    starColor = "#FFFFFF",
    centerGlow = true,
    glowIntensity = 0.3,
    spaghettification = 0.5,
}: TravelInSpaceProps) {
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
            // Spawn on a hemisphere for better depth variety
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(Math.random())
            const r = outerRadius * (0.85 + Math.random() * 0.3)

            const offsetX = r * Math.cos(theta) * Math.sin(phi)
            const offsetY = r * Math.sin(theta) * Math.sin(phi)
            const offsetZ = r * Math.cos(phi)

            const baseZ = 700 + Math.random() * 300

            const x = centerX + offsetX
            const y = centerY + offsetY
            const z = baseZ + offsetZ

            // Constant velocity toward center (no distance-based speed variation)
            const speedJitter = 0.7 + Math.random() * 0.6
            const baseSpeed = starSpeed * 0.1 * speedJitter

            // Calculate direction toward center
            const dx = centerX - x
            const dy = centerY - y
            const dz = 0 - z
            const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz)

            // Compensate for perspective effect to maintain linear speed
            // Stars closer to viewer (lower z) need slower velocity to appear constant
            const perspectiveCompensation = Math.max(0.3, Math.min(1.0, (z - 400) / 600))

            // Randomize base opacity for more natural variation
            const randomOpacity = starOpacity * (0.6 + Math.random() * 0.4)

            return {
                x,
                y,
                z,
                vx: (dx / distance3D) * baseSpeed * perspectiveCompensation,
                vy: (dy / distance3D) * baseSpeed * perspectiveCompensation,
                vz: (dz / distance3D) * baseSpeed * perspectiveCompensation,
                opacity: randomOpacity,
                baseOpacity: randomOpacity,
                size: starThickness * (0.5 + Math.random() * 1.5),
                age: 0,
                maxAge: Math.random() * 10 + 15,
            }
        },
        [starSpeed, starThickness, starOpacity, outerRadius]
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

            // Clear canvas
            ctx.fillStyle = backgroundColor
            ctx.fillRect(0, 0, width, height)

            // Create radial gradient for center glow
            if (centerGlow) {
                const gradient = ctx.createRadialGradient(
                    centerX,
                    centerY,
                    0,
                    centerX,
                    centerY,
                    width * 0.3
                )
                gradient.addColorStop(
                    0,
                    `rgba(255, 255, 255, ${glowIntensity * 0.1})`
                )
                gradient.addColorStop(
                    0.3,
                    `rgba(255, 255, 255, ${glowIntensity * 0.05})`
                )
                gradient.addColorStop(1, "transparent")
                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, width, height)
            }

            const stars = starsRef.current

            // Update existing stars and remove dead ones
            for (let i = stars.length - 1; i >= 0; i--) {
                const star = stars[i]
                star.age += deltaTime * 0.001 // Convert to seconds for more reasonable aging

                // Update position with linear speed (no perspective acceleration)
                star.x += star.vx * deltaTime
                star.y += star.vy * deltaTime
                star.z += star.vz * deltaTime

                // Calculate screen position based on z-depth (true perspective)
                const perspective = 1000
                const perspectiveScale = perspective / (perspective + star.z)
                const screenX = centerX + (star.x - centerX) * perspectiveScale
                const screenY = centerY + (star.y - centerY) * perspectiveScale

                // Check if star should be removed
                const distanceFromCenter = Math.sqrt(
                    (star.x - centerX) ** 2 + (star.y - centerY) ** 2
                )
                const shouldRemove =
                    screenX < -50 ||
                    screenX > width + 50 ||
                    screenY < -50 ||
                    screenY > height + 50 ||
                    star.z < 50 ||
                    star.age > star.maxAge ||
                    distanceFromCenter < innerRadius

                if (shouldRemove) {
                    // Remove this star
                    stars.splice(i, 1)
                } else {
                    // Enhanced 3D perspective calculations
                    const perspective = 1000
                    const perspectiveScale =
                        perspective / (perspective + star.z)

                    // Calculate current size with better perspective scaling
                    // Stars get larger when closer to viewer (lower z values)
                    const currentSize = star.size * perspectiveScale

                    // Distance from center for perspective thinning
                    const distanceFromCenter = Math.sqrt(
                        (star.x - centerX) ** 2 + (star.y - centerY) ** 2
                    )
                    const maxDistance = Math.max(width, height) * 0.8
                    const distanceRatio = Math.min(
                        1,
                        distanceFromCenter / maxDistance
                    )

                    // Z-based opacity: stars get brighter as they get closer to viewer (lower z)
                    // Enhanced z-based opacity: much stronger variation for depth
                    const zOpacity = Math.max(
                        0.1,
                        Math.min(1, Math.pow((1200 - star.z) / 1200, 0.5))
                    )

                    // Distance-based opacity: stars are brighter when further from center (closer to viewer)
                    const distanceOpacity = 0.6 + distanceRatio * 0.4 // 30% to 100% opacity

                    // Age-based opacity fade
                    const ageFade = 1 - star.age / star.maxAge

                    // Combined opacity with z-depth, distance, and age
                    // Prioritize z-depth for stronger depth effect
                    const combinedOpacity =
                        zOpacity * 0.9 + distanceOpacity * 0.1
                    const currentOpacity =
                        star.baseOpacity * combinedOpacity * ageFade

                    // Calculate perspective thinning: stars get thinner as they approach center (physically correct)
                    // This counteracts the perspective scaling to maintain consistent visual thickness
                    // Use a more aggressive thinning factor to prevent center thickening
                    const perspectiveThinning = 0.3

                    // Only render if star is visible and large enough
                    if (currentOpacity > 0.05 && currentSize > 0.3) {
                        // Simple star length calculation based only on spaghettification factor
                        const baseStarLength = starLength

                        // Apply spaghettification: control how length changes with distance from center
                        const distanceFromCenter = Math.sqrt(
                            (star.x - centerX) ** 2 + (star.y - centerY) ** 2
                        )
                        const maxDistance = Math.max(width, height) * 0.8
                        const distanceRatio = Math.min(
                            1,
                            distanceFromCenter / maxDistance
                        )

                        // spaghettification = 0.5: stars get shorter near center (realistic)
                        // spaghettification = 1.0: no change in length
                        // spaghettification = 2.0: stars get longer near center (unrealistic but cool)
                        const spaghettificationFactor =
                            1 +
                            (distanceRatio - 0.5) * (spaghettification - 1) * 2

                        // Simple length calculation: just base length * spaghettification factor
                        const streakLength = Math.max(
                            2,
                            baseStarLength * spaghettificationFactor
                        )

                        // Calculate direction from velocity
                        const directionX = star.vx
                        const directionY = star.vy
                        const directionLength = Math.sqrt(
                            directionX * directionX + directionY * directionY
                        )

                        if (directionLength > 0 && streakLength > 1) {
                            // Normalize direction
                            const normalizedX = directionX / directionLength
                            const normalizedY = directionY / directionLength

                            // Calculate streak endpoints
                            const startX =
                                screenX - normalizedX * streakLength * 0.3
                            const startY =
                                screenY - normalizedY * streakLength * 0.3
                            const endX = screenX + normalizedX * streakLength
                            const endY = screenY + normalizedY * streakLength

                            // Create gradient for the streak
                            const gradient = ctx.createLinearGradient(
                                startX,
                                startY,
                                endX,
                                endY
                            )

                            // Parse star color to create gradient
                            const opacity = currentOpacity
                            if (starColor.startsWith("#")) {
                                // Convert hex to RGB for gradient
                                const r = parseInt(starColor.slice(1, 3), 16)
                                const g = parseInt(starColor.slice(3, 5), 16)
                                const b = parseInt(starColor.slice(5, 7), 16)

                                // Reversed gradient: more opaque on outside (start), fading toward center (end)
                                gradient.addColorStop(
                                    0,
                                    `rgba(${r}, ${g}, ${b}, ${opacity})`
                                )
                                gradient.addColorStop(
                                    0.5,
                                    `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`
                                )
                                gradient.addColorStop(
                                    1,
                                    `rgba(${r}, ${g}, ${b}, ${opacity * 0.1})`
                                )
                            } else {
                                // Reversed gradient: more opaque on outside (start), fading toward center (end)
                                gradient.addColorStop(
                                    0,
                                    `rgba(255, 255, 255, ${opacity})`
                                )
                                gradient.addColorStop(
                                    0.5,
                                    `rgba(255, 255, 255, ${opacity * 0.8})`
                                )
                                gradient.addColorStop(
                                    1,
                                    `rgba(255, 255, 255, ${opacity * 0.1})`
                                )
                            }

                            // Use perspective thinning for line width
                            // Enhanced z-based thickness: stars closer to viewer are much thicker
                            const zThickness = Math.max(
                                0.5,
                                Math.min(3, (1200 - star.z) / 200)
                            )
                            // Remove center-based thinning - keep consistent thickness
                            const lineWidth = Math.max(
                                0.3,
                                currentSize * zThickness
                            )

                            // Draw the main streak
                            ctx.beginPath()
                            ctx.strokeStyle = gradient
                            ctx.lineWidth = lineWidth
                            ctx.lineCap = "round"
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
            centerGlow,
            glowIntensity,
            starColor,
            innerRadius,
            starCount,
            createStar,
            getSpawnInterval,
            starOpacity,
            starThickness,
            starLength,
            outerRadius,
            spaghettification,
        ]
    )

    // Animation loop
    const animate = useCallback(
        (currentTime: number) => {
            if (paused) {
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
                }}
            />
        </div>
    )
}

TravelInSpace.defaultProps = {
    paused: false,
    starCount: 150,
    starSpeed: 0.5,
    starThickness: 2,
    starOpacity: 0.8,
    starLength: 8,
    innerRadius: 50,
    outerRadius: 300,
    backgroundColor: "#000000",
    starColor: "#FFFFFF",
    centerGlow: true,
    glowIntensity: 0.3,
    spaghettification: 0.5,
    framerUniversity: "https://frameruni.link/cc",
}

addPropertyControls(TravelInSpace, {
    paused: {
        type: ControlType.Boolean,
        title: "Paused",
        hidden: () => true,
        defaultValue: false,
    },
    starCount: {
        type: ControlType.Number,
        title: "Star Count",
        min: 100,
        max: 2000,
        step: 100,
        defaultValue: 500,
    },
    starSpeed: {
        type: ControlType.Number,
        title: "Star Speed",
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: 0.5,
    },
    starThickness: {
        type: ControlType.Number,
        title: "Star Thickness",
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 2,
    },
    starOpacity: {
        type: ControlType.Number,
        title: "Star Opacity",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.8,
    },
    starLength: {
        type: ControlType.Number,
        title: "Star Length",
        min: 1,
        max: 300,
        step: 1,
        defaultValue: 8,
    },
    innerRadius: {
        type: ControlType.Number,
        title: "Inner Radius",
        min: 10,
        max: 200,
        step: 5,
        defaultValue: 50,
        unit: "px",
    },
    outerRadius: {
        type: ControlType.Number,
        title: "Outer Radius",
        min: 100,
        max: 5000,
        step: 100,
        defaultValue: 1000,
        unit: "px",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    starColor: {
        type: ControlType.Color,
        title: "Star Color",
        defaultValue: "#FFFFFF",
    },
    centerGlow: {
        type: ControlType.Boolean,
        title: "Center Glow",
        defaultValue: true,
    },
    glowIntensity: {
        type: ControlType.Number,
        title: "Glow Intensity",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.3,
        hidden: (props) => !props.centerGlow,
    },
    spaghettification: {
        type: ControlType.Number,
        title: "Spaghettification",
        min: 0.1,
        max: 2,
        step: 0.1,
        defaultValue: 0.5,
        description:"More components at https://frameruni.link/cc"
    },
})

TravelInSpace.displayName = "Travel In Space"
