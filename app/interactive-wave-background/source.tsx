import * as React from 'react'
import { useEffect, useRef } from 'react'
import { addPropertyControls, ControlType, RenderTarget } from 'framer'

// Simple 2D noise function for wave generation with seed support
function createNoise2D(seed: number = 0.5) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const G22 = (3.0 - Math.sqrt(3.0)) / 3.0;

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        p[i] = i;
    }
    
    // Use seed to create deterministic random values
    const seededRandom = (index: number) => {
        const x = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
        return (x - Math.floor(x));
    }
    
    // Shuffle the permutation table using seeded random
    for (let i = 255; i > 0; i--) {
        const n = Math.floor((i + 1) * seededRandom(i));
        const q = p[i];
        p[i] = p[n];
        p[n] = q;
    }

    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        permMod12[i] = perm[i] % 12;
    }

    const grad2 = new Float64Array([1, 1,
        -1, 1,
        1, -1,
        -1, -1,
        1, 0,
        -1, 0,
        1, 0,
        -1, 0,
        0, 1,
        0, -1,
        0, 1,
        0, -1]);

    const fastFloor = (x: number) => Math.floor(x) | 0;

    return function noise2D(x: number, y: number): number {
        const s = (x + y) * F2;
        const i = fastFloor(x + s);
        const j = fastFloor(y + s);

        const t = (i + j) * G2;
        const x0 = x - (i - t);
        const y0 = y - (j - t);

        let i1: number, j1: number;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + G22;
        const y2 = y0 - 1 + G22;

        const ii = i & 255;
        const jj = j & 255;
        const gi0 = permMod12[ii + perm[jj]];
        const gi1 = permMod12[ii + i1 + perm[jj + j1]];
        const gi2 = permMod12[ii + 1 + perm[jj + 1]];

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        let n0: number;
        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * (grad2[gi0 * 2] * x0 + grad2[gi0 * 2 + 1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        let n1: number;
        if (t1 < 0) {
            n1 = 0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * (grad2[gi1 * 2] * x1 + grad2[gi1 * 2 + 1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        let n2: number;
        if (t2 < 0) {
            n2 = 0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * (grad2[gi2 * 2] * x2 + grad2[gi2 * 2 + 1] * y2);
        }

        return 70 * (n0 + n1 + n2);
    };
}

interface Point {
    x: number
    y: number
    wave: { x: number; y: number }
    cursor: {
        x: number
        y: number
        vx: number
        vy: number
    }
}

interface WavesProps {
    strokeColor?: string
    backgroundColor?: string
    waveSpeed?: number
    waveAmplitude?: number
    mouseInfluence?: number
    lineSpacing?: number
    seed?: number
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function InteractiveWaveBackground({
    strokeColor = "#ffffff",
    backgroundColor = "#000000",
    waveSpeed = 0.5,
    waveAmplitude = 0.5,
    mouseInfluence = 0.5,
    lineSpacing = 0.5,
    seed = 0.5
}: WavesProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const mouseRef = useRef({
        x: -10,
        y: 0,
        lx: 0,
        ly: 0,
        sx: 0,
        sy: 0,
        v: 0,
        vs: 0,
        a: 0,
        set: false,
    })
    const pathsRef = useRef<SVGPathElement[]>([])
    const linesRef = useRef<Point[][]>([])
    const noiseRef = useRef<((x: number, y: number) => number) | null>(null)
    const rafRef = useRef<number | null>(null)
    const boundingRef = useRef<DOMRect | null>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastSizeRef = useRef({ width: 0, height: 0, zoom: 1 })

    // Initialization
    useEffect(() => {
        if (!containerRef.current || !svgRef.current) return

        // Initialize noise generator
        noiseRef.current = createNoise2D(seed)

        // Initialize size and lines
        setSize()
        setLines()

        // Bind events
        window.addEventListener('resize', onResize)
        window.addEventListener('mousemove', onMouseMove)
        containerRef.current.addEventListener('touchmove', onTouchMove, { passive: false })

        return () => {
            window.removeEventListener('resize', onResize)
            window.removeEventListener('mousemove', onMouseMove)
            containerRef.current?.removeEventListener('touchmove', onTouchMove)
        }
    }, [seed])

    // Monitor size changes and re-render when component is resized
    useEffect(() => {
        if (!containerRef.current || !zoomProbeRef.current) return

        let rafId = 0
        const TICK_MS = 100 // Check every 100ms
        const EPSILON = 1 // 1px tolerance

        const checkSize = () => {
            const container = containerRef.current
            const probe = zoomProbeRef.current
            if (!container || !probe) return

            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const zoom = probe.getBoundingClientRect().width / 20

            const lastSize = lastSizeRef.current
            const sizeChanged = 
                Math.abs(width - lastSize.width) > EPSILON ||
                Math.abs(height - lastSize.height) > EPSILON ||
                Math.abs(zoom - lastSize.zoom) > 0.01

            if (sizeChanged) {
                lastSizeRef.current = { width, height, zoom }
                setSize()
                setLines()
            }

            rafId = requestAnimationFrame(checkSize)
        }

        rafId = requestAnimationFrame(checkSize)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [])

    // Re-render when property controls change
    useEffect(() => {
        setLines()
    }, [strokeColor, lineSpacing, seed])

    // Force immediate visual update when any prop changes in canvas mode
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) {
            // Start a temporary animation loop for a few frames to show changes
            let frameCount = 0
            const maxFrames = 10
            
            const animate = (time: number) => {
                movePoints(time)
                drawLines()
                frameCount++
                
                if (frameCount < maxFrames) {
                    requestAnimationFrame(animate)
                }
            }
            
            requestAnimationFrame(animate)
        }
    }, [waveSpeed, waveAmplitude, mouseInfluence])

    // Restart animation loop when props change to ensure new values are used
    useEffect(() => {
        // Cancel existing animation
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }

        // Start new animation loop with updated props
        const tick = (time: number) => {
            const { current: mouse } = mouseRef

            // Smooth mouse movement
            mouse.sx += (mouse.x - mouse.sx) * 0.1
            mouse.sy += (mouse.y - mouse.sy) * 0.1

            // Mouse velocity
            const dx = mouse.x - mouse.lx
            const dy = mouse.y - mouse.ly
            const d = Math.hypot(dx, dy)

            mouse.v = d
            mouse.vs += (d - mouse.vs) * 0.1
            mouse.vs = Math.min(100, mouse.vs)

            // Previous mouse position
            mouse.lx = mouse.x
            mouse.ly = mouse.y

            // Mouse angle
            mouse.a = Math.atan2(dy, dx)

            // Animation
            if (containerRef.current) {
                containerRef.current.style.setProperty('--x', `${mouse.sx}px`)
                containerRef.current.style.setProperty('--y', `${mouse.sy}px`)
            }

            movePoints(time)
            drawLines()

            rafRef.current = requestAnimationFrame(tick)
        }

        // Start animation loop
        rafRef.current = requestAnimationFrame(tick)

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [waveSpeed, waveAmplitude, mouseInfluence, seed])

    // Set SVG size using clientWidth/clientHeight for proper Framer canvas sizing
    const setSize = () => {
        if (!containerRef.current || !svgRef.current) return

        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1

        // Store dimensions for mouse calculations
        boundingRef.current = {
            width,
            height,
            left: 0,
            top: 0,
            right: width,
            bottom: height,
            x: 0,
            y: 0,
            toJSON: () => ({})
        } as DOMRect

        svgRef.current.style.width = `${width}px`
        svgRef.current.style.height = `${height}px`
    }

    // Setup lines - more points for smoother curves
    const setLines = () => {
        if (!svgRef.current || !boundingRef.current) return

        const { width, height } = boundingRef.current
        linesRef.current = []

        // Clear existing paths
        pathsRef.current.forEach(path => {
            path.remove()
        })
        pathsRef.current = []

        // Use configurable spacing based on lineSpacing prop
        const baseSpacing = 8
        const xGap = baseSpacing + (1 - lineSpacing) * 12  // Range: 8-20
        const yGap = baseSpacing + (1 - lineSpacing) * 12  // Range: 8-20

        const oWidth = width + 200
        const oHeight = height + 30

        const totalLines = Math.ceil(oWidth / xGap)
        const totalPoints = Math.ceil(oHeight / yGap)

        const xStart = (width - xGap * totalLines) / 2
        const yStart = (height - yGap * totalPoints) / 2

        // Create vertical lines
        for (let i = 0; i < totalLines; i++) {
            const points: Point[] = []

            for (let j = 0; j < totalPoints; j++) {
                const point: Point = {
                    x: xStart + xGap * i,
                    y: yStart + yGap * j,
                    wave: { x: 0, y: 0 },
                    cursor: { x: 0, y: 0, vx: 0, vy: 0 },
                }

                points.push(point)
            }

            // Create SVG path
            const path = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
            )
            path.classList.add('a__line')
            path.classList.add('js-line')
            path.setAttribute('fill', 'none')
            path.setAttribute('stroke', strokeColor)
            path.setAttribute('stroke-width', '1')

            svgRef.current.appendChild(path)
            pathsRef.current.push(path)

            // Add points
            linesRef.current.push(points)
        }
    }

    // Resize handler
    const onResize = () => {
        setSize()
        setLines()
    }

    // Mouse handler
    const onMouseMove = (e: MouseEvent) => {
        updateMousePosition(e.pageX, e.pageY)
    }

    // Touch handler
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        const touch = e.touches[0]
        updateMousePosition(touch.clientX, touch.clientY)
    }

    // Update mouse position using proper container bounds
    const updateMousePosition = (x: number, y: number) => {
        if (!boundingRef.current || !containerRef.current) return

        const mouse = mouseRef.current
        const rect = containerRef.current.getBoundingClientRect()
        mouse.x = x - rect.left
        mouse.y = y - rect.top + window.scrollY

        if (!mouse.set) {
            mouse.sx = mouse.x
            mouse.sy = mouse.y
            mouse.lx = mouse.x
            mouse.ly = mouse.y

            mouse.set = true
        }

        // Update CSS variables
        if (containerRef.current) {
            containerRef.current.style.setProperty('--x', `${mouse.sx}px`)
            containerRef.current.style.setProperty('--y', `${mouse.sy}px`)
        }
    }

    // Move points - smoother wave motion
    const movePoints = (time: number) => {
        const { current: lines } = linesRef
        const { current: mouse } = mouseRef
        const { current: noise } = noiseRef

        if (!noise) return

        lines.forEach((points) => {
            points.forEach((p: Point) => {
                // Wave movement - speed only affects animation timing, not shape
                const speedMultiplier = 0.008 + (waveSpeed - 0.5) * 0.012  // Range: 0.002-0.014
                const move = noise(
                    p.x * 0.003,  // Remove time from noise sampling - shape is controlled by seed
                    p.y * 0.002   // Remove time from noise sampling - shape is controlled by seed
                ) * 8 + time * speedMultiplier  // Add time-based movement separately

                const amplitudeMultiplier = waveAmplitude * 2  // Range: 0-2
                p.wave.x = Math.cos(move) * 12 * amplitudeMultiplier
                p.wave.y = Math.sin(move) * 6 * amplitudeMultiplier

                // Mouse effect - smoother response
                const dx = p.x - mouse.sx
                const dy = p.y - mouse.sy
                const d = Math.hypot(dx, dy)
                const l = Math.max(175, mouse.vs)

                if (d < l) {
                    const s = 1 - d / l
                    const f = Math.cos(d * 0.001) * s
                    const influenceMultiplier = mouseInfluence * 0.0007  // Range: 0-0.0007

                    p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * influenceMultiplier
                    p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * influenceMultiplier
                }

                p.cursor.vx += (0 - p.cursor.x) * 0.01   // Increased restoration force
                p.cursor.vy += (0 - p.cursor.y) * 0.01   // Increased restoration force

                p.cursor.vx *= 0.95  // Increased smoothness
                p.cursor.vy *= 0.95  // Increased smoothness

                p.cursor.x += p.cursor.vx
                p.cursor.y += p.cursor.vy

                p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x))  // Limited deformation range
                p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y))  // Limited deformation range
            })
        })
    }

    // Get moved point coordinates
    const moved = (point: Point, withCursorForce = true) => {
        const coords = {
            x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
            y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
        }

        return coords
    }

    // Draw lines - using line segments
    const drawLines = () => {
        const { current: lines } = linesRef
        const { current: paths } = pathsRef

        lines.forEach((points, lIndex) => {
            if (points.length < 2 || !paths[lIndex]) return;

            // First point
            const firstPoint = moved(points[0], false)
            let d = `M ${firstPoint.x} ${firstPoint.y}`

            // Connect points with lines
            for (let i = 1; i < points.length; i++) {
                const current = moved(points[i])
                d += `L ${current.x} ${current.y}`
            }

            paths[lIndex].setAttribute('d', d)
        })
    }

    // Animation logic
    const tick = (time: number) => {
        const { current: mouse } = mouseRef

        // Smooth mouse movement
        mouse.sx += (mouse.x - mouse.sx) * 0.1
        mouse.sy += (mouse.y - mouse.sy) * 0.1

        // Mouse velocity
        const dx = mouse.x - mouse.lx
        const dy = mouse.y - mouse.ly
        const d = Math.hypot(dx, dy)

        mouse.v = d
        mouse.vs += (d - mouse.vs) * 0.1
        mouse.vs = Math.min(100, mouse.vs)

        // Previous mouse position
        mouse.lx = mouse.x
        mouse.ly = mouse.y

        // Mouse angle
        mouse.a = Math.atan2(dy, dx)

        // Animation
        if (containerRef.current) {
            containerRef.current.style.setProperty('--x', `${mouse.sx}px`)
            containerRef.current.style.setProperty('--y', `${mouse.sy}px`)
        }

        movePoints(time)
        drawLines()

        rafRef.current = requestAnimationFrame(tick)
    }

    return (
        <div
            ref={containerRef}
            style={{
                backgroundColor,
                position: 'relative',
                margin: 0,
                padding: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                '--x': '-0.5rem',
                '--y': '50%',
            } as React.CSSProperties}
        >
            <svg
                ref={svgRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                }}
                xmlns="http://www.w3.org/2000/svg"
            />
            {/* Hidden 20x20 probe element to detect editor zoom level and size changes */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
        </div>
    )
}

// Display name for Framer UI
InteractiveWaveBackground.displayName = "Interactive Wave Background"

// Property controls for Framer
addPropertyControls(InteractiveWaveBackground, {
    strokeColor: {
        type: ControlType.Color,
        title: "Stroke",
        defaultValue: "#ffffff",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    waveSpeed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    waveAmplitude: {
        type: ControlType.Number,
        title: "Amplitude",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    mouseInfluence: {
        type: ControlType.Number,
        title: "Influence",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    seed: {
        type: ControlType.Number,
        title: "Seed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    lineSpacing: {
        type: ControlType.Number,
        title: "Amount",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})