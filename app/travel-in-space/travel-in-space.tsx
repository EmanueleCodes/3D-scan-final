import React, { useEffect, useRef, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface StarProps {
    count?: number
    speed?: number
    thickness?: number
    opacity?: number
    length?: number
    color?: string
}

interface TravelInSpaceProps {
    paused?: boolean
    star?: StarProps
    innerRadius?: number
    outerRadius?: number
    backgroundColor?: string
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
    star = {
        count: 150,
        speed: 0.5,
        thickness: 2,
        opacity: 0.8,
        length: 8,
        color: "#FFFFFF",
    },
    innerRadius = 50,
    outerRadius = 300,
    backgroundColor = "#000000",
}: TravelInSpaceProps) {
    // Destructure star properties for easier access
    const {
        count: starCount = 150,
        speed: starSpeed = 0.5,
        thickness: starThickness = 2,
        opacity: starOpacity = 0.8,
        length: starLength = 8,
        color: starColor = "#FFFFFF",
    } = star
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

                // Calculate distance from center for position-based opacity
                const distanceFromCenter = Math.sqrt(
                    (star.x - centerX) ** 2 + (star.y - centerY) ** 2
                )

                // Check if star should be removed (hard boundaries)
                const shouldRemove =
                    screenX < -100 ||
                    screenX > width + 100 ||
                    screenY < -100 ||
                    screenY > height + 100 ||
                    star.z < 50 ||
                    star.age > star.maxAge

                if (shouldRemove) {
                    stars.splice(i, 1)
                    continue
                }

                // Calculate position-based opacity
                // Stars fade in as they move from outer edge toward center
                // Stars fade out as they get close to center and disappear completely before inner radius
                const fadeInDistance = outerRadius * 0.8 // Start fading in at 80% of outer radius
                const fadeOutStartDistance = innerRadius * 2.5 // Start fading out at 2.5x inner radius
                const fadeOutEndDistance = innerRadius * 1.2 // Completely faded out at 1.2x inner radius
                
                let positionOpacity = 1
                
                if (distanceFromCenter > fadeInDistance) {
                    // Fade in from outer edge
                    const fadeInProgress = Math.max(0, (outerRadius - distanceFromCenter) / (outerRadius - fadeInDistance))
                    positionOpacity = Math.pow(fadeInProgress, 2) // Smooth fade-in curve
                } else if (distanceFromCenter < fadeOutStartDistance) {
                    // Fade out near center - completely gone before reaching inner radius
                    const fadeOutProgress = Math.max(0, (distanceFromCenter - fadeOutEndDistance) / (fadeOutStartDistance - fadeOutEndDistance))
                    positionOpacity = Math.pow(fadeOutProgress, 0.5) // Smooth fade-out curve
                }

                // Apply position-based opacity
                star.opacity = star.baseOpacity * positionOpacity

                // Only render if star has some opacity
                if (star.opacity > 0.01) {
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

                    // Use the fade-based opacity that was calculated earlier
                    const currentOpacity = star.opacity

                    // Calculate perspective thinning: stars get thinner as they approach center (physically correct)
                    // This counteracts the perspective scaling to maintain consistent visual thickness
                    // Use a more aggressive thinning factor to prevent center thickening
                    const perspectiveThinning = 0.3

                    // Only render if star is visible and large enough
                    if (currentOpacity > 0.05 && currentSize > 0.3) {
                        // Calculate perspective-based star length
                        // Stars closer to the center of viewport appear shorter due to perspective
                        
                        // Calculate angular distance from center of viewport
                        const viewportCenterX = width / 2
                        const viewportCenterY = height / 2
                        const angularDistanceFromCenter = Math.sqrt(
                            (screenX - viewportCenterX) ** 2 + (screenY - viewportCenterY) ** 2
                        )
                        
                        // Calculate maximum possible angular distance (corner of viewport)
                        const maxAngularDistance = Math.sqrt(
                            (width / 2) ** 2 + (height / 2) ** 2
                        )
                        
                        // Normalize angular distance (0 = center, 1 = edge)
                        const normalizedAngularDistance = Math.min(1, angularDistanceFromCenter / maxAngularDistance)
                        
                        // Apply perspective shortening: stars closer to center are shorter
                        // Use a smooth curve that makes center stars significantly shorter
                        const perspectiveFactor = 0.3 + (normalizedAngularDistance * 0.7) // 0.3 to 1.0
                        const streakLength = Math.max(2, starLength * perspectiveFactor)

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

                            // Calculate thickness based on z-distance from viewer and distance from center
                            // Stars closer to viewer (lower z) are thicker
                            const zThickness = Math.max(0.3, Math.min(2, (1200 - star.z) / 300))
                            
                            // Stars get thinner as they approach the center
                            const centerThinning = Math.max(0.2, Math.min(1, distanceFromCenter / (outerRadius * 0.5)))
                            
                            // Combine z-based thickness with center-based thinning
                            const lineWidth = Math.max(0.2, starThickness * zThickness * centerThinning)

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
            starColor,
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
    star: {
        count: 150,
        speed: 0.5,
        thickness: 2,
        opacity: 0.8,
        length: 8,
        color: "#FFFFFF",
    },
    innerRadius: 50,
    outerRadius: 300,
    backgroundColor: "#000000",
    framerUniversity: "https://frameruni.link/cc",
}

addPropertyControls(TravelInSpace, {
    paused: {
        type: ControlType.Boolean,
        title: "Paused",
        hidden: () => true,
        defaultValue: false,
    },
    star: {
        type: ControlType.Object,
        title: "Star",
        controls: {
            count: {
                type: ControlType.Number,
                title: "Count",
                min: 100,
                max: 2000,
                step: 100,
                defaultValue: 150,
            },
            speed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0.1,
                max: 10,
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
                max: 300,
                step: 1,
                defaultValue: 8,
            },
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#FFFFFF",
            },
        },
    },
    innerRadius: {
        type: ControlType.Number,
        title: "Inner Radius",
        min: 10,
        max: 500,
        step: 5,
        defaultValue: 50,
        unit: "px",
    },
    outerRadius: {
        type: ControlType.Number,
        title: "Outer Radius",
        min: 500,
        max: 5000,
        step: 100,
        defaultValue: 1000,
        unit: "px",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
        description: "More components at https://frameruni.link/cc",
    },
})

TravelInSpace.displayName = "Travel In Space"
