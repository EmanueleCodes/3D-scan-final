/**
 * GSAP Horizontal Slider Component
 *
 * A React component that creates an infinite horizontal scrolling slider using GSAP.
 * Features include:
 * - Infinite horizontal loop with seamless wrapping
 * - Drag-to-scroll functionality with momentum
 * - Click navigation (prev/next buttons and direct slide selection)
 * - Center-focused navigation (active slide stays centered)
 * - Responsive design with inline CSS
 * - TypeScript support with full type safety
 * - Developed by @emanuelecodes for Adriano Reis
 * This component serves as a reference implementation for building similar
 * horizontal scrolling interfaces with GSAP and React.
 */

import React, { useRef, useState } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"
import { Draggable } from "gsap/Draggable"
import { InertiaPlugin } from "gsap/InertiaPlugin"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Register GSAP plugins for drag functionality and momentum scrolling
gsap.registerPlugin(Draggable, InertiaPlugin)

/**
 * Configuration interface for the horizontal loop
 *
 * @interface LoopConfig
 * @property {boolean} paused - Whether the timeline starts paused (default: true)
 * @property {boolean} draggable - Enable drag-to-scroll functionality
 * @property {boolean|HTMLElement|string} center - Center element for positioning calculations
 * @property {number} speed - Animation speed multiplier (default: 1)
 * @property {number|boolean} snap - Snap configuration for smooth positioning
 * @property {string|number} paddingRight - Additional padding for the loop
 * @property {boolean} reversed - Whether to reverse the timeline direction
 * @property {number} repeat - Number of times to repeat the timeline
 * @property {Function} onChange - Callback fired when the active element changes
 */
interface LoopConfig {
    paused?: boolean
    draggable?: boolean
    center?: boolean | HTMLElement | string
    speed?: number
    snap?: number | boolean
    paddingRight?: string | number
    reversed?: boolean
    repeat?: number
    gap?: number
    onChange?: (element: HTMLElement, index: number) => void
}

/**
 * Extended GSAP Timeline interface with custom horizontal loop methods
 *
 * This interface extends the base GSAP Timeline to include methods
 * specifically designed for horizontal scrolling functionality.
 *
 * @interface HorizontalLoopTimeline
 * @extends gsap.core.Timeline
 */
interface HorizontalLoopTimeline {
    /** Navigate to a specific slide by index */
    toIndex: (
        index: number,
        vars?: gsap.TweenVars
    ) => gsap.core.Tween | gsap.core.Timeline
    /** Get the index of the slide closest to the current timeline position */
    closestIndex: (setCurrent?: boolean) => number
    /** Get the current active slide index */
    current: () => number
    /** Navigate to the next slide */
    next: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline
    /** Navigate to the previous slide */
    previous: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline
    /** Array of timeline positions for each slide */
    times: number[]
    /** GSAP Draggable instance for drag functionality */
    draggable?: any
    /** Get the total time of the timeline */
    totalTime: (value?: number, suppressEvents?: boolean) => number
    /** Get the raw time of the timeline */
    rawTime: (value?: number) => number
    /** Get the duration of the timeline */
    duration: (value?: number) => number
    /** All other GSAP Timeline methods */
    [key: string]: any
}

/**
 * Main Slider Component
 *
 * This is the main React component that renders the horizontal slider.
 * It uses useGSAP for proper GSAP integration with React lifecycle.
 *
 * Key features:
 * - Dynamic slides based on content array
 * - Drag-to-scroll with momentum
 * - Click navigation (prev/next buttons)
 * - Direct slide selection by clicking
 * - Responsive component support
 * - Seamless infinite loop with smart duplication
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function Carousel({
    dragFactor = 0.5,
    draggable = true,
    clickNavigation = true,
    variableWidths = true,
    content = [],
    autoplay = {
        enabled: false,
        duration: 3,
        direction: "right",
        throwAware: "No follow",
    },
    ui = {
        backgroundColor: "#000000",
        padding: "0px",
        borderRadius: "0px",
        shadow: "0px 0px 0px rgba(0,0,0,0)",
        gap: 20,
    },
    buttonsUI = {
        verticalAlign: "center",
        horizontalAlign: "center",
        gap: 20,
        insetX: 20,
        insetY: 20,
    },
    leftControl = null,
    rightControl = null,
    buttonsNavigation = true,
    slidesUI = {
        central: "Same style",
        slideSizing: {
            mode: "fill-width",
            aspectRatio: "16:9",
            customAspectRatio: "16:9",
            fixedWidth: 300,
            fixedHeight: 200,
            fillMode: "fill",
        },
        allSlides: {
            backgroundColor: "rgba(0,0,0,0.1)",
            border: "1px solid rgba(0,0,0,0.2)",
            radius: "10px",
            shadow: "0px 0px 0px rgba(0,0,0,0)",
            scale: 1,
            opacity: 1,
        },
        centralSlide: {
            backgroundColor: "rgba(0,0,0,0.1)",
            border: "1px solid rgba(0,0,0,0.2)",
            radius: "10px",
            shadow: "0px 0px 0px rgba(0,0,0,0)",
            scale: 1.1,
            opacity: 1,
        },
    },
}: {
    dragFactor?: number
    draggable?: boolean
    clickNavigation?: boolean
    variableWidths?: boolean
    content?: React.ReactNode[]
    autoplay?: {
        enabled: boolean
        duration: number
        direction: "left" | "right"
        throwAware: "Follow" | "No follow"
    }
    ui?: {
        backgroundColor?: string
        padding?: string
        borderRadius?: string
        shadow?: string
        gap?: number
    }
    buttonsUI?: {
        verticalAlign?: "top" | "center" | "bottom"
        horizontalAlign?: "center" | "space-between"
        gap?: number
        insetX?: number
        insetY?: number
    }
    leftControl?: React.ReactNode
    rightControl?: React.ReactNode
    buttonsNavigation?: boolean
    slidesUI?: {
        central: "Same style" | "Customize style"
        slideSizing?: {
            mode: "fill" | "aspect-ratio" | "fixed-dimensions" | "fill-width"
            aspectRatio?: "16:9" | "4:3" | "1:1" | "3:2" | "21:9" | "custom"
            customAspectRatio?: string
            fixedWidth?: number
            fixedHeight?: number
            fillMode?: "fill" | "contain" | "cover"
        }
        allSlides: {
            backgroundColor?: string
            border?: string | { width?: string; style?: string; color?: string }
            radius?: string
            shadow?: string
            scale?: number
            opacity?: number
        }
        centralSlide: {
            backgroundColor?: string
            border?: string | { width?: string; style?: string; color?: string }
            radius?: string
            shadow?: string
            scale?: number
            opacity?: number
        }
    }
}) {
    // React refs for DOM elements
    const wrapperRef = useRef<HTMLDivElement>(null) // Reference to the wrapper container
    const boxesRef = useRef<HTMLDivElement[]>([]) // Array of slide element references
    const loopRef = useRef<HorizontalLoopTimeline | null>(null) // Reference to the GSAP timeline
    const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null) // Reference to autoplay timer

    // Stable box widths - generated once and reused to prevent animation issues
    // CRITICAL: Box widths must remain stable across React re-renders to prevent
    // GSAP animation calculations from breaking. Random widths calculated during
    // render cause timeline position miscalculations and animation glitches.
    const boxWidths = useRef<number[]>([])

    // React state for component behavior
    const [showOverflow, setShowOverflow] = useState(false) // Toggle for showing overflow content
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null) // Currently active slide

    // Refs for tracking drag state without causing re-renders
    const isDraggingRef = useRef(false) // Track if user is currently dragging
    const isThrowingRef = useRef(false) // Track if throwing animation is active
    const dragStartMouseXRef = useRef(0) // Track where mouse drag started to determine direction
    const dragEndMouseXRef = useRef(0) // Track where mouse drag ended
    const currentAutoplayDirectionRef = useRef<"left" | "right">(
        autoplay.direction
    ) // Current autoplay direction

    /**
     * Make a component responsive by cloning it with updated styles
     * 
     * This function takes a React component and makes it fill the available space
     * while preserving its internal styling and functionality.
     */
    const makeComponentResponsive = (component: React.ReactNode, key: string | number) => {
        if (!React.isValidElement(component)) {
            return component
        }

        // Clone the component with responsive styles
        return React.cloneElement(component, {
            key,
            style: {
                ...(component.props as any).style,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            },
        } as any)
    }

    /**
     * Calculate slide dimensions based on sizing mode
     */
    const calculateSlideDimensions = (containerWidth: number, containerHeight: number) => {
        const mode = slidesUI.slideSizing?.mode || "fill-width"
        
        switch (mode) {
            case "fill-width":
                return {
                    width: containerWidth,
                    height: containerHeight * 0.8, // 80% of container height
                    objectFit: "cover" as any,
                }
            
            case "aspect-ratio":
                const aspectRatio = slidesUI.slideSizing?.aspectRatio || "16:9"
                let ratio = 16/9 // default
                
                if (aspectRatio === "4:3") ratio = 4/3
                else if (aspectRatio === "1:1") ratio = 1
                else if (aspectRatio === "3:2") ratio = 3/2
                else if (aspectRatio === "21:9") ratio = 21/9
                else if (aspectRatio === "custom") {
                    const customRatio = slidesUI.slideSizing?.customAspectRatio || "16:9"
                    const [w, h] = customRatio.split(":").map(Number)
                    ratio = w / h
                }
                
                const slideWidth = 200 // Fixed width for aspect ratio mode
                return {
                    width: slideWidth,
                    height: slideWidth / ratio,
                    objectFit: "cover" as any,
                }
            
            case "fixed-dimensions":
                return {
                    width: slidesUI.slideSizing?.fixedWidth || 300,
                    height: slidesUI.slideSizing?.fixedHeight || 200,
                    objectFit: "cover" as any,
                }
            
            case "fill":
                const fillMode = slidesUI.slideSizing?.fillMode || "fill"
                return {
                    width: containerWidth * 0.8,
                    height: containerHeight * 0.8,
                    objectFit: fillMode as any,
                }
            
            default:
                return {
                    width: 200,
                    height: 150,
                    objectFit: "cover" as any,
                }
        }
    }

    /**
     * Creates a horizontal infinite loop animation using GSAP
     *
     * This function implements the core logic for creating a seamless horizontal
     * scrolling experience. It's based on the GSAP horizontal loop helper but
     * adapted for React with useGSAP.
     *
     * Key concepts:
     * - Uses xPercent for responsive positioning
     * - Creates seamless loops by duplicating elements virtually
     * - Calculates precise timing for smooth transitions
     * - Supports drag functionality with momentum
     *
     * @param {HTMLElement[]} items - Array of DOM elements to animate
     * @param {LoopConfig} config - Configuration object for the loop
     * @returns {HorizontalLoopTimeline|null} - GSAP timeline with custom methods, or null if no items
     */
    function createHorizontalLoop(
        items: HTMLElement[],
        config: LoopConfig
    ): HorizontalLoopTimeline | null {
        // Early return if no items provided
        if (!items.length) return null

        // Extract configuration values with defaults
        const onChange = config.onChange
        let lastIndex = 0 // Track the last active index to detect changes

        /**
         * Create the main GSAP timeline
         *
         * This timeline will contain all the horizontal scrolling animations.
         * The onUpdate callback fires whenever the timeline progresses, allowing
         * us to detect when the active slide changes.
         */
        const tl = gsap.timeline({
            repeat: config.repeat, // Number of times to repeat the entire loop
            onUpdate: onChange
                ? function () {
                      // Get the current slide index based on timeline position
                      const i = (tl as any).closestIndex()
                      if (lastIndex !== i) {
                          lastIndex = i
                          // Fire the onChange callback when slide changes
                          onChange(items[i], i)
                      }
                  }
                : undefined,
            paused: config.paused, // Start paused so we can control it manually
            defaults: { ease: "none" }, // No easing for smooth continuous scrolling
            onReverseComplete: () => {
                // Handle reverse completion for seamless looping
                tl.totalTime(tl.rawTime() + tl.duration() * 100)
            },
        }) as unknown as HorizontalLoopTimeline

        // Core variables for the horizontal loop
        const length = items.length // Number of slides
        const startX = items[0].offsetLeft // Starting X position of the first slide
        const times: number[] = [] // Timeline positions for each slide
        const widths: number[] = [] // Width of each slide
        const spaceBefore: number[] = [] // Space before each slide (for gaps)
        const xPercents: number[] = [] // X position as percentage of width
        let curIndex = 0 // Current active slide index
        let indexIsDirty = false // Flag to track if index needs recalculation

        // Configuration values
        const center = config.center // Center element for positioning calculations
        const pixelsPerSecond = (config.speed || 1) * 100 // Animation speed in pixels per second
        const snap =
            config.snap === false
                ? (v: number) => v
                : gsap.utils.snap(
                      typeof config.snap === "number" ? config.snap : 1
                  )
        let timeOffset = 0 // Offset for centering calculations

        // Determine the container element for centering
        // If center is true, use the parent of the first item
        // If center is an element/string, use that element
        // Otherwise, fall back to the parent node
        const container =
            center === true
                ? items[0].parentNode
                : (center
                      ? typeof center === "string"
                          ? gsap.utils.toArray(center)[0]
                          : center
                      : null) || items[0].parentNode
        let totalWidth: number // Total width of all slides combined

        /**
         * Calculate the total width of all slides combined
         *
         * This includes the width of all slides plus any spacing and padding.
         * Used for determining the loop distance and centering calculations.
         * For infinite loops, we need to include the gap that appears between
         * the last slide and the first slide when wrapping around.
         */
        const getTotalWidth = () => {
            // Calculate total width including CSS margins
            const gap = (config as any).gap ?? 0
            let total = 0
            for (let i = 0; i < length; i++) {
                total += widths[i]
                // Add gap between all slides for consistent spacing in infinite loop
                total += gap
            }
            return total + (parseFloat(String(config.paddingRight)) || 0)
        }

        /**
         * Populate width and position data for all slides
         *
         * This function measures each slide and calculates its position relative
         * to other slides. It's called whenever the layout changes (resize, etc.)
         * to ensure accurate positioning.
         */
        const populateWidths = () => {
            if (!container) return

            // Get the container's bounding rectangle as reference
            let b1 = (container as Element).getBoundingClientRect()
            let b2: DOMRect

            items.forEach((el, i) => {
                // Get the actual width of each slide
                widths[i] = parseFloat(
                    gsap.getProperty(el, "width", "px") as string
                )

                // Calculate X position as percentage of width for responsive positioning
                xPercents[i] = snap(
                    (parseFloat(gsap.getProperty(el, "x", "px") as string) /
                        widths[i]) *
                        100 +
                        (gsap.getProperty(el, "xPercent") as number)
                )

                // Calculate space before this slide (for gaps between slides)
                // This accounts for the margin-right gap applied to each slide
                b2 = el.getBoundingClientRect()
                spaceBefore[i] = b2.left - (i ? b1.right : b1.left)
                b1 = b2 // Update reference for next iteration
            })

            // Apply xPercent positioning to all slides for responsive behavior
            gsap.set(items, {
                xPercent: (i: number) => xPercents[i],
            })

            // Update total width calculation
            totalWidth = getTotalWidth()
        }

        let timeWrap: (time: number) => number // Function to wrap time values for seamless looping

        /**
         * Calculate time offsets for centering
         *
         * This function adjusts the timeline positions so that the active slide
         * appears centered in the container. It calculates how much to offset
         * each slide's timeline position based on the container width.
         */
        const populateOffsets = () => {
            if (!container) return

            const containerWidth = (container as HTMLElement).offsetWidth

            // Calculate time offset for centering
            // This determines how much to shift the timeline so the active slide is centered
            timeOffset = center
                ? (tl.duration() * (containerWidth / 2)) / totalWidth
                : 0

            // Debug logging for centering calculations
            console.log("Centering debug:", {
                containerWidth,
                totalWidth,
                timeOffset,
                center: !!center,
            })

            // Apply centering offset to each slide's timeline position
            center &&
                times.forEach((t, i) => {
                    times[i] = timeWrap(
                        tl.labels["label" + i] +
                            (tl.duration() * widths[i]) / 2 / totalWidth -
                            timeOffset
                    )
                })
        }

        /**
         * Find the closest value in an array, accounting for wrapping
         *
         * This utility function finds which slide is closest to the current
         * timeline position, taking into account that the timeline wraps around.
         *
         * @param {number[]} values - Array of timeline positions
         * @param {number} value - Current timeline position
         * @param {number} wrap - Wrap value for circular calculations
         * @returns {number} - Index of the closest slide
         */
        const getClosest = (values: number[], value: number, wrap: number) => {
            let i = values.length
            let closest = 1e10 // Start with a very large number
            let index = 0
            let d: number

            // Check each slide's position
            while (i--) {
                d = Math.abs(values[i] - value)

                // Handle wrapping for infinite mode
                if (d > wrap / 2) {
                    d = wrap - d
                }

                // Update closest if this slide is closer
                if (d < closest) {
                    closest = d
                    index = i
                }
            }
            return index
        }

        const populateTimeline = () => {
            let i: number,
                item: HTMLElement,
                curX: number,
                distanceToStart: number,
                distanceToLoop: number
            tl.clear()
            
            // Get gap value for timeline calculations
            const gap = (config as any).gap ?? 0
            
            // INFINITE MODE: Complex loop structure for seamless infinite scrolling
            for (i = 0; i < length; i++) {
                item = items[i]
                curX = (xPercents[i] / 100) * widths[i]
                
                // Calculate distance to start including gap
                distanceToStart = item.offsetLeft + curX - startX
                // Add gap to the loop distance for proper infinite loop spacing
                distanceToLoop = distanceToStart + widths[i] * (gsap.getProperty(item, "scaleX") as number) + gap
                
                tl.to(
                    item,
                    {
                        xPercent: snap(
                            ((curX - distanceToLoop) / widths[i]) * 100
                        ),
                        duration: distanceToLoop / pixelsPerSecond,
                    },
                    0
                )
                    .fromTo(
                        item,
                        {
                            xPercent: snap(
                                ((curX - distanceToLoop + totalWidth) /
                                    widths[i]) *
                                    100
                            ),
                        },
                        {
                            xPercent: xPercents[i],
                            duration:
                                (curX - distanceToLoop + totalWidth - curX) /
                                pixelsPerSecond,
                            immediateRender: false,
                        },
                        distanceToLoop / pixelsPerSecond
                    )
                    .add("label" + i, distanceToStart / pixelsPerSecond)
                times[i] = distanceToStart / pixelsPerSecond
            }
            timeWrap = gsap.utils.wrap(0, tl.duration())
        }

        const refresh = (deep: boolean) => {
            const progress = tl.progress()
            tl.progress(0, true)
            populateWidths()
            deep && populateTimeline()
            populateOffsets()
            deep && tl.draggable && tl.paused()
                ? tl.time(times[curIndex], true)
                : tl.progress(progress, true)
        }

        const onResize = () => refresh(true)
        let proxy: HTMLElement

        // Initial setup
        gsap.set(items, { x: 0 })

        populateWidths()
        populateTimeline()
        populateOffsets()
        window.addEventListener("resize", onResize)

        function toIndex(index: number, vars: gsap.TweenVars = {}) {
            // INFINITE MODE: Logic with wrapping for seamless infinite scrolling
            Math.abs(index - curIndex) > length / 2 &&
                (index += index > curIndex ? -length : length)
            const newIndex = gsap.utils.wrap(0, length, index)
            let time = times[newIndex]
            if (time > tl.time() !== index > curIndex && index !== curIndex) {
                time += tl.duration() * (index > curIndex ? 1 : -1)
            }
            if (time < 0 || time > tl.duration()) {
                vars.modifiers = { time: timeWrap }
            }
            curIndex = newIndex
            vars.overwrite = true
            gsap.killTweensOf(proxy)
            return vars.duration === 0
                ? tl.time(timeWrap(time))
                : tl.tweenTo(time, vars)
        }

        tl.toIndex = (index: number, vars?: gsap.TweenVars) =>
            toIndex(index, vars)
        tl.closestIndex = (setCurrent: boolean = false) => {
            const index = getClosest(times, tl.time(), tl.duration())
            if (setCurrent) {
                curIndex = index
                indexIsDirty = false
            }
            return index
        }
        tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex)
        tl.next = (vars?: gsap.TweenVars) => {
            const currentIndex = tl.current()
            return toIndex(currentIndex + 1, vars)
        }
        tl.previous = (vars?: gsap.TweenVars) => {
            const currentIndex = tl.current()
            return toIndex(currentIndex - 1, vars)
        }
        tl.times = times
        
        // Initialize infinite mode timeline
        tl.progress(1, true).progress(0, true)
        
        if (config.reversed) {
            ;(tl.vars as any).onReverseComplete?.()
            tl.reverse()
        }

        if (config.draggable && typeof Draggable === "function") {
            proxy = document.createElement("div")
            const wrap = gsap.utils.wrap(0, 1)
            let ratio: number,
                startProgress: number,
                draggable: any,
                lastSnap: number,
                initChangeX: number,
                wasPlaying: boolean,
                isDragActive = false

            const align = () => {
                const newProgress = startProgress + (draggable.startX - draggable.x) * ratio
                // Infinite mode: use wrapping for seamless infinite scrolling
                tl.progress(wrap(newProgress))
            }
            const syncIndex = () => tl.closestIndex(true)

            // Check if mouse is inside carousel area
            const isMouseInsideCarousel = (clientX: number, clientY: number) => {
                if (!container) return false
                const rect = (container as HTMLElement).getBoundingClientRect()
                return (
                    clientX >= rect.left &&
                    clientX <= rect.right &&
                    clientY >= rect.top &&
                    clientY <= rect.bottom
                )
            }

            // Global mouse event handlers
            const handleGlobalMouseDown = (e: MouseEvent) => {
                // Only start drag if mouse is inside carousel
                if (isMouseInsideCarousel(e.clientX, e.clientY) && !isDragActive) {
                    isDragActive = true
                    draggable.startDrag(e)
                }
            }

            const handleGlobalMouseUp = (e: MouseEvent) => {
                // Always handle mouse up, even if outside carousel
                if (isDragActive) {
                    isDragActive = false
                    draggable.endDrag(e)
                }
            }

            const handleGlobalMouseMove = (e: MouseEvent) => {
                // Only handle mouse move if drag is active
                if (isDragActive) {
                    draggable.updateDrag(e)
                }
            }

            // Add global event listeners
            document.addEventListener('mousedown', handleGlobalMouseDown)
            document.addEventListener('mouseup', handleGlobalMouseUp)
            document.addEventListener('mousemove', handleGlobalMouseMove)

            draggable = Draggable.create(proxy, {
                trigger: null, // Disable GSAP's built-in trigger system
                type: "x",
                onPressInit() {
                    const x = this.x
                    gsap.killTweensOf(tl)
                    wasPlaying = !tl.paused()
                    tl.pause()
                    startProgress = tl.progress()
                    refresh(false)
                    ratio = 1 / totalWidth
                    initChangeX = startProgress / -ratio - x
                    gsap.set(proxy, { x: startProgress / -ratio })

                    // Set dragging state and stop autoplay
                    isDraggingRef.current = true
                    // Store actual mouse coordinates for direction detection
                    dragStartMouseXRef.current =
                        this.pointerX || this.startX || 0
                    stopAutoplay()
                },
                onDrag: function () {
                    align()
                    // Track current mouse position for direction detection
                    dragEndMouseXRef.current = this.pointerX || this.x || 0
                },
                onThrowUpdate: align,
                overshootTolerance: 0,
                inertia: true,
                /**
                 * max
                 */
                maxDuration: 4 * (1.1 - dragFactor),
                snap(value: number) {
                    if (Math.abs(startProgress / -ratio - this.x) < 10) {
                        return lastSnap + initChangeX
                    }
                    
                    // INFINITE MODE: Snap logic with wrapping for seamless infinite scrolling
                    const time = -(value * ratio) * tl.duration()
                    const wrappedTime = timeWrap(time)
                    const snapTime =
                        times[getClosest(times, wrappedTime, tl.duration())]
                    let dif = snapTime - wrappedTime
                    Math.abs(dif) > tl.duration() / 2 &&
                        (dif += dif < 0 ? tl.duration() : -tl.duration())
                    lastSnap = (time + dif) / tl.duration() / -ratio
                    return lastSnap
                },
                onRelease() {
                    syncIndex()
                    isDraggingRef.current = false // User released, no longer dragging

                    // Update autoplay direction based on drag direction if throwAware is enabled
                    if (autoplay.throwAware === "Follow") {
                        const mouseDistance =
                            dragEndMouseXRef.current -
                            dragStartMouseXRef.current
                        // Use mouse movement to determine direction
                        // Positive distance = dragged right (go left/previous)
                        // Negative distance = dragged left (go right/next)
                        currentAutoplayDirectionRef.current =
                            mouseDistance > 0 ? "left" : "right"

                        console.log("Throw-aware direction update:", {
                            startMouseX: dragStartMouseXRef.current,
                            endMouseX: dragEndMouseXRef.current,
                            mouseDistance: mouseDistance,
                            newDirection: currentAutoplayDirectionRef.current,
                        })
                    }

                    // Check if throwing animation will start
                    if (draggable.isThrowing) {
                        isThrowingRef.current = true
                        indexIsDirty = true
                    }
                },
                onThrowComplete: () => {
                    syncIndex()
                    isThrowingRef.current = false // Throwing animation completed
                    wasPlaying && tl.play()

                    // Restart autoplay after throwing completes
                    if (autoplay.enabled) {
                        setTimeout(startAutoplay, 10) // Restart after 1 second delay
                    }
                },
            })[0]
            tl.draggable = draggable

            // Store cleanup function for global event listeners
            ;(tl as any).cleanupGlobalDrag = () => {
                document.removeEventListener('mousedown', handleGlobalMouseDown)
                document.removeEventListener('mouseup', handleGlobalMouseUp)
                document.removeEventListener('mousemove', handleGlobalMouseMove)
            }
        }

        // Center the first slide after initialization
        // This ensures slide 1 appears centered rather than at the left edge
        if (center && times.length > 0) {
            // Use the existing toIndex method to navigate to slide 1 (index 0)
            // This will handle all the centering calculations properly
            console.log("Centering to slide 1...")
            toIndex(0, { duration: 0, ease: "none" })
            
            console.log("Centered first slide:", {
                currentIndex: tl.current(),
                time: tl.time(),
                progress: tl.progress()
            })
        }

        // Update current index after centering
        tl.closestIndex(true)
        lastIndex = curIndex
        onChange && onChange(items[curIndex], curIndex)

        // Debug initial position
        console.log("Initial timeline state:", {
            mode: "infinite",
            progress: tl.progress(),
            time: tl.time(),
            duration: tl.duration(),
            currentIndex: tl.current(),
            times: times.slice(0, 5), // First 5 times for debugging
            length,
        })

        // Store cleanup function for later use
        ;(tl as any).cleanup = () => {
            window.removeEventListener("resize", onResize)
            // Clean up global drag event listeners if they exist
            if ((tl as any).cleanupGlobalDrag) {
                ;(tl as any).cleanupGlobalDrag()
            }
        }

        return tl
    }

    /**
     * Initialize the horizontal loop using useGSAP
     *
     * useGSAP is the recommended way to integrate GSAP with React. It automatically
     * handles cleanup when the component unmounts and provides better performance
     * than manual useEffect + GSAP context management.
     *
     * Key benefits:
     * - Automatic cleanup of GSAP animations
     * - Proper React lifecycle integration
     * - Scoped animations to prevent conflicts
     * - Better performance and memory management
     */
    useGSAP(
        () => {
            // Small delay to ensure DOM is fully rendered before initializing
            // This prevents issues with element measurements during initial render
            const timer = setTimeout(() => {
                if (boxesRef.current.length === 0) return

                console.log(
                    "Initializing horizontal loop with",
                    boxesRef.current.length,
                    "boxes"
                )

                /**
                 * Create the horizontal loop with configuration
                 *
                 * Configuration options:
                 * - paused: true - Start paused so we can control it manually
                 * - draggable: true - Enable drag-to-scroll functionality
                 * - center: wrapperRef.current - Use wrapper element for centering calculations
                 * - onChange: Callback fired when the active slide changes
                 */
                const currentGap = ui?.gap
                console.log("Current gap value:", currentGap)
                
                const loop = createHorizontalLoop(boxesRef.current, {
                    paused: true,
                    draggable: draggable, // Use the property control value
                    center: wrapperRef.current || true, // Pass the wrapper element for proper centering
                    gap: currentGap, // Pass the gap value for proper loop calculations
                    onChange: (element: HTMLElement, index: number) => {
                        // Update React state when active slide changes
                        setActiveElement(element)

                        // Remove active class from all slides
                        boxesRef.current.forEach((box) => {
                            if (box) box.classList.remove("active")
                        })

                        // Add active class to the current slide
                        element.classList.add("active")
                    },
                })

                if (loop) {
                    loopRef.current = loop

                    // Add click handlers to boxes (only if clickNavigation is enabled)
                    if (clickNavigation) {
                        boxesRef.current.forEach((box, i) => {
                            if (box) {
                                const clickHandler = () => {
                                    stopAutoplay() // Stop autoplay when user clicks
                                    if (loop && loop.toIndex) {
                                        loop.toIndex(i, {
                                            duration: 0.8,
                                            ease: "power1.inOut",
                                        })
                                    }
                                    // Restart autoplay after user interaction
                                    if (autoplay.enabled) {
                                        setTimeout(startAutoplay, 10) // Restart after 1 second delay
                                    }
                                }
                                box.addEventListener("click", clickHandler)

                                // Store the handler for cleanup
                                ;(box as any).__clickHandler = clickHandler
                            }
                        })
                    }

                    // Initialize autoplay direction
                    currentAutoplayDirectionRef.current = autoplay.direction

                    // Start autoplay if enabled
                    if (autoplay.enabled) {
                        startAutoplay()
                    }

                    // Return cleanup function - useGSAP will handle this automatically
                    return () => {
                        clearTimeout(timer)
                        stopAutoplay() // Stop autoplay on cleanup

                        // Custom cleanup for event listeners
                        boxesRef.current.forEach((box) => {
                            if (box && (box as any).__clickHandler) {
                                box.removeEventListener(
                                    "click",
                                    (box as any).__clickHandler
                                )
                            }
                        })

                        // Call the timeline's cleanup function
                        if ((loop as any).cleanup) {
                            ;(loop as any).cleanup()
                        }
                    }
                }
            }, 10) // 100ms delay

            return () => clearTimeout(timer)
        },
        {
            scope: wrapperRef,
            dependencies: [dragFactor, draggable, clickNavigation, variableWidths, content, ui?.gap, autoplay, slidesUI],
        }
    ) // Scope to wrapper element

    /**
     * Autoplay Functions
     *
     * These functions handle the automatic progression of slides.
     */
    const startAutoplay = () => {
        if (
            !autoplay.enabled ||
            !loopRef.current ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return

        // Don't start autoplay if user is dragging or throwing
        if (isDraggingRef.current || isThrowingRef.current) return

        // Clear any existing timer
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current)
        }

        // Start new timer
        autoplayTimerRef.current = setInterval(() => {
            // Check again before advancing - user might have started dragging
            if (
                loopRef.current &&
                !isDraggingRef.current &&
                !isThrowingRef.current
            ) {
                const currentIndex = loopRef.current.current()
                
                // Use current direction for autoplay
                if (currentAutoplayDirectionRef.current === "right") {
                    if (loopRef.current.next) {
                        loopRef.current.next({
                            duration: 0.8,
                            ease: "power1.inOut",
                        })
                    }
                } else if (currentAutoplayDirectionRef.current === "left") {
                    if (loopRef.current.previous) {
                        loopRef.current.previous({
                            duration: 0.8,
                            ease: "power1.inOut",
                        })
                    }
                }
            }
        }, autoplay.duration * 1000) // Convert seconds to milliseconds
    }

    const stopAutoplay = () => {
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current)
            autoplayTimerRef.current = null
        }
    }

    /**
     * Event Handlers for Navigation
     *
     * These functions handle user interactions with the slider controls.
     * They use the GSAP timeline methods to animate between slides.
     */

    /**
     * Navigate to the next slide
     *
     * Uses the timeline's next() method to smoothly animate to the next slide
     * with a custom duration and easing function.
     * Seamlessly wraps around to the beginning in infinite mode.
     */
    const handleNext = () => {
        stopAutoplay() // Stop autoplay when user interacts
        if (loopRef.current && loopRef.current.next) {
            loopRef.current.next({ duration: 0.4, ease: "power1.inOut" })
        }
        // Restart autoplay after user interaction
        if (autoplay.enabled) {
            setTimeout(startAutoplay, 10) // Restart after 1 second delay
        }
    }

    /**
     * Navigate to the previous slide
     *
     * Uses the timeline's previous() method to smoothly animate to the previous slide
     * with a custom duration and easing function.
     * Seamlessly wraps around to the end in infinite mode.
     */
    const handlePrev = () => {
        stopAutoplay() // Stop autoplay when user interacts
        if (loopRef.current && loopRef.current.previous) {
            loopRef.current.previous({ duration: 0.4, ease: "power1.inOut" })
        }
        // Restart autoplay after user interaction
        if (autoplay.enabled) {
            setTimeout(startAutoplay, 10) // Restart after 1 second delay
        }
    }

    /**
     * Toggle overflow visibility
     *
     * This allows users to see slides that extend beyond the visible area,
     * which is useful for debugging or showing the full slider content.
     */
    const handleToggleOverflow = () => {
        setShowOverflow(!showOverflow)
    }

    /**
     * Generate Slide Elements
     *
     * Creates 11 slide elements with different gray shades and variable widths.
     * Each slide is assigned to a ref for GSAP manipulation.
     *
     * Design pattern:
     * - Different gray shade for each slide
     * - Variable widths generated once and stored in ref for stability
     * - Each slide gets a ref for GSAP timeline integration
     */
    
    // Calculate how many slides we actually need to fill the container
    const calculateRequiredSlides = () => {
        // Use content length, fallback to 5 if empty
        const actualSlideCount = content.length > 0 ? content.length : 5
        if (actualSlideCount === 0) return 5 // Minimum for infinite loop
        
        const containerWidth = wrapperRef.current?.clientWidth || 600
        const gap = ui?.gap || 20
        
        // Calculate slide width based on sizing mode
        const dimensions = calculateSlideDimensions(containerWidth, 400) // Use 400 as default height
        let averageSlideWidth = dimensions.width
        
        // Override with variable widths logic if enabled
        if (variableWidths) {
            // For variable widths, use average of random range
            averageSlideWidth = (150 + 350) / 2 // Average of 150-350 range
        }
        
        const effectiveSlideWidth = averageSlideWidth + gap
        const slidesNeeded = Math.ceil(containerWidth / effectiveSlideWidth)
        
        // Ensure we have enough for seamless infinite loop
        // Rule: At least 3x the actual slide count, or enough to fill container, minimum 5
        const minForLoop = Math.max(actualSlideCount * 3, 5)
        const finalCount = Math.max(slidesNeeded + 2, minForLoop) // +2 for smooth transitions
        
        console.log("Slide calculation:", {
            contentLength: content.length,
            actualSlideCount,
            containerWidth,
            averageSlideWidth,
            effectiveSlideWidth,
            slidesNeeded,
            minForLoop,
            finalCount
        })
        
        return finalCount
    }

    // Generate stable widths once on first render or when variableWidths or content changes
    const lastVariableWidthsRef = useRef(variableWidths)
    const lastContentLengthRef = useRef(content.length)
    const lastContainerWidthRef = useRef(0)
    
    const requiredSlides = calculateRequiredSlides()
    const containerWidth = wrapperRef.current?.clientWidth || 600
    
    if (boxWidths.current.length === 0 || 
        lastVariableWidthsRef.current !== variableWidths || 
        lastContentLengthRef.current !== content.length ||
        Math.abs(lastContainerWidthRef.current - containerWidth) > 50) { // Recalculate if container size changed significantly
        
        lastVariableWidthsRef.current = variableWidths
        lastContentLengthRef.current = content.length
        lastContainerWidthRef.current = containerWidth
        
        boxWidths.current = Array.from({ length: requiredSlides }, (_, i) => {
            if (variableWidths) {
                // Variable widths: special width for slide 5, random for others
                if (i === 4) return 350 // Special width for slide 5
                return Math.floor(Math.random() * (350 - 150 + 1)) + 150 // Random width between 150px and 350px
            } else {
                // Use sizing mode for consistent widths
                const dimensions = calculateSlideDimensions(containerWidth, 400)
                return dimensions.width
            }
        })
        console.log("Generated stable box widths:", boxWidths.current)
    }

    const boxes = Array.from({ length: requiredSlides }, (_, i) => {
        // Use content length, fallback to 5 if empty
        const actualSlideCount = content.length > 0 ? content.length : 5
        // Cycle through the actual slide count for content
        const contentIndex = i % actualSlideCount
        
        // Get content for this slide (if available)
        const slideContent = content.length > 0 && content[contentIndex] 
            ? makeComponentResponsive(content[contentIndex], `slide-${i}`)
            : null

        // Generate different gray shades for each slide based on content index
        const grayShade = actualSlideCount > 1 
            ? Math.floor((contentIndex / (actualSlideCount - 1)) * 200) + 50 // Range from 50 to 250
            : 150 // Single color for single slide
        const backgroundColor = `rgb(${grayShade}, ${grayShade}, ${grayShade})`

        return (
            <div
                key={i}
                ref={(el) => {
                    // Store reference for GSAP timeline
                    if (el) boxesRef.current[i] = el
                }}
                className="box"
                style={{
                    flexShrink: 0,
                    height: "80%",
                    width: `${boxWidths.current[i]}px`, // Use stable width from ref
                    minWidth: "150px",
                    marginRight: `${ui?.gap || 0}px`, // Add gap to all slides for consistent infinite loop spacing
                }}
            >
                <div
                    className="box__inner"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative" as const,
                        cursor: "pointer",
                        width: "100%",
                        height: "100%",
                        backgroundColor: slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)",
                        border: typeof slidesUI.allSlides.border === 'string' 
                            ? slidesUI.allSlides.border 
                            : slidesUI.allSlides.border 
                                ? `${slidesUI.allSlides.border.width || '1px'} ${slidesUI.allSlides.border.style || 'solid'} ${slidesUI.allSlides.border.color || 'rgba(0,0,0,0.2)'}`
                                : "1px solid rgba(0,0,0,0.2)",
                        borderRadius: slidesUI.allSlides.radius || "10px",
                        boxShadow: slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0,0)",
                        transform: `scale(${slidesUI.allSlides.scale || 1})`,
                        opacity: slidesUI.allSlides.opacity || 1,
                        fontSize: "36px",
                        fontWeight: "medium",
                        color: "#3D3D3D",
                        textAlign: "center",
                        lineHeight: "1",
                        padding: "0px", // Remove padding to let content fill the space
                    }}
                >
                    {slideContent || <p>{contentIndex + 1}</p>}
                </div>
            </div>
        )
    })

    /**
     * Component Render
     *
     * The component renders a complete horizontal slider with:
     * - Navigation controls (prev/next/toggle buttons)
     * - Slider container with overflow control
     * - Individual slide elements with gradient borders
     * - Inline CSS for gradient theming and active states
     */
    return (
        <div
            style={{
                fontFamily: "system-ui",
                background: ui?.backgroundColor || "#000000",
                padding: ui?.padding || "0px",
                borderRadius: ui?.borderRadius || "0px",
                boxShadow: ui?.shadow || "0px 0px 0px rgba(0,0,0,0)",
                color: "white",
                textAlign: "center" as const,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column" as const,
                height: "100%",
                width: "100%",
                margin: 0,
                overflow: "visible",
            }}
        >
            {/* Inline CSS for active states */}
            <style>
                {`
          /* Apply transition to all box inner elements */
          .box .box__inner {
            transition: transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease;
          }
          
          /* Active slide styling - use dynamic values */
          .box.active .box__inner {
            transform: scale(${slidesUI.central === "Customize style" ? slidesUI.centralSlide.scale || 1.1 : slidesUI.allSlides.scale || 1.1}) !important;
            opacity: ${slidesUI.central === "Customize style" ? slidesUI.centralSlide.opacity || 1 : slidesUI.allSlides.opacity || 1} !important;
            box-shadow: ${slidesUI.central === "Customize style" ? slidesUI.centralSlide.shadow || "0px 0px 0px rgba(0,0,0,0)" : slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0)"} !important;
            background-color: ${slidesUI.central === "Customize style" ? slidesUI.centralSlide.backgroundColor || "rgba(0,0,0,0.1)" : slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)"} !important;
            border: ${slidesUI.central === "Customize style" 
                ? (typeof slidesUI.centralSlide.border === 'string' 
                    ? slidesUI.centralSlide.border 
                    : slidesUI.centralSlide.border 
                        ? `${slidesUI.centralSlide.border.width || '1px'} ${slidesUI.centralSlide.border.style || 'solid'} ${slidesUI.centralSlide.border.color || 'rgba(0,0,0,0.2)'}`
                        : "1px solid rgba(0,0,0,0.2)")
                : (typeof slidesUI.allSlides.border === 'string' 
                    ? slidesUI.allSlides.border 
                    : slidesUI.allSlides.border 
                        ? `${slidesUI.allSlides.border.width || '1px'} ${slidesUI.allSlides.border.style || 'solid'} ${slidesUI.allSlides.border.color || 'rgba(0,0,0,0.2)'}`
                        : "1px solid rgba(0,0,0,0.2)")
            } !important;
            border-radius: ${slidesUI.central === "Customize style" ? slidesUI.centralSlide.radius || "10px" : slidesUI.allSlides.radius || "10px"} !important;
          }
        `}
            </style>

            {/* Navigation Buttons - Absolutely Positioned */}
            {buttonsNavigation && (
                <>
                    {/* Previous Button */}
                    {leftControl && (
                        <div
                            style={{
                                position: "absolute",
                                top:
                                    buttonsUI.verticalAlign === "top"
                                        ? `${buttonsUI.insetY || 20}px`
                                        : buttonsUI.verticalAlign === "bottom"
                                          ? "auto"
                                          : "50%",
                                bottom:
                                    buttonsUI.verticalAlign === "bottom"
                                        ? `${buttonsUI.insetY || 20}px`
                                        : "auto",
                                left:
                                    buttonsUI.horizontalAlign ===
                                    "space-between"
                                        ? `${buttonsUI.insetX || 20}px`
                                        : buttonsUI.horizontalAlign === "center"
                                          ? `calc(50% - ${buttonsUI.gap || 20}px)`
                                          : "50%",
                                right: "auto",
                                transform:
                                    buttonsUI.horizontalAlign === "center" &&
                                    buttonsUI.verticalAlign === "center"
                                        ? "translateX(-100%) translateY(-50%)"
                                        : buttonsUI.horizontalAlign === "center"
                                          ? "translateX(-100%)"
                                          : buttonsUI.verticalAlign === "center"
                                            ? "translateY(-50%)"
                                            : "none",
                                zIndex: 10,
                                cursor: "pointer",
                            }}
                            onClick={handlePrev}
                        >
                            {leftControl}
                        </div>
                    )}

                    {/* Next Button */}
                    {rightControl && (
                        <div
                            style={{
                                position: "absolute",
                                top:
                                    buttonsUI.verticalAlign === "top"
                                        ? `${buttonsUI.insetY || 20}px`
                                        : buttonsUI.verticalAlign === "bottom"
                                          ? "auto"
                                          : "50%",
                                bottom:
                                    buttonsUI.verticalAlign === "bottom"
                                        ? `${buttonsUI.insetY || 20}px`
                                        : "auto",
                                left: "auto",
                                right:
                                    buttonsUI.horizontalAlign ===
                                    "space-between"
                                        ? `${buttonsUI.insetX || 20}px`
                                        : buttonsUI.horizontalAlign === "center"
                                          ? `calc(50% - ${buttonsUI.gap || 20}px)`
                                          : "50%",
                                transform:
                                    buttonsUI.horizontalAlign === "center" &&
                                    buttonsUI.verticalAlign === "center"
                                        ? "translateX(100%) translateY(-50%)"
                                        : buttonsUI.horizontalAlign === "center"
                                          ? "translateX(100%)"
                                          : buttonsUI.verticalAlign === "center"
                                            ? "translateY(-50%)"
                                            : "none",
                                zIndex: 10,
                                cursor: "pointer",
                            }}
                            onClick={handleNext}
                        >
                            {rightControl}
                        </div>
                    )}
                </>
            )}

            {/* Debug Info */}
            <div
                style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    fontSize: "12px",
                    zIndex: 1000,
                }}
            >
                Mode: Infinite | Content: {content.length} | Generated: {requiredSlides} | Sizing: {slidesUI.slideSizing?.mode || "fill-width"} | Gap: {ui?.gap ?? 20}px
            </div>

            {/* Toggle Overflow Button - Commented Out */}
            {/* <button
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "transparent",
                        color: "white",
                        border: "2px solid #808080",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        transition: "all 0.3s ease",
                    }}
                onClick={handleToggleOverflow}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#333")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                    }
                >
                toggle overflow
            </button> */}

            <div
                ref={wrapperRef}
                style={{
                    height: "100%",
                    maxHeight: "100%",
                    width: "100%",
                    maxWidth: "100%",
                    position: "relative" as const,
                    display: "flex",
                    alignItems: "center",
                    overflow: showOverflow ? "visible" : "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "row" as const,
                        flexWrap: "nowrap" as const,
                        // Gap is handled by margin-right on each slide for consistent infinite loop spacing
                    }}
                >
                    {boxes}
                </div>
            </div>
        </div>
    )
}

addPropertyControls(Carousel, {
    draggable: {
        type: ControlType.Boolean,
        title: "Draggable",
        defaultValue: true,
    },
    dragFactor: {
        type: ControlType.Number,
        title: "Drag",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props: any) => !props.draggable,
    },
    clickNavigation: {
        type: ControlType.Boolean,
        title: "Click Nav",
        defaultValue: true,
    },
    variableWidths: {
        type: ControlType.Boolean,
        title: "Variable Widths",
        defaultValue: true,
    },
    content: {
        type: ControlType.Array,
        title: "Content",
        maxCount: 10,
        control: {
            type: ControlType.ComponentInstance,
        },
        description: "Add components to display in slides. More components at [Framer University](https://frameruni.link/cc).",
    },
    autoplay: {
        type: ControlType.Object,
        title: "Autoplay",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: false,
            },
            duration: {
                type: ControlType.Number,
                title: "Duration",
                min: 1,
                max: 10,
                step: 0.5,
                defaultValue: 3,
            },
            direction: {
                type: ControlType.Enum,
                title: "Direction",
                options: ["left", "right"],

                defaultValue: "right",
                displaySegmentedControl: true,

                optionIcons: ["direction-left", "direction-right"],
            },
            throwAware: {
                type: ControlType.Enum,
                title: "On Throw",
                options: ["Follow", "No follow"],
                defaultValue: "No follow",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
        },
    },
    ui: {
        type: ControlType.Object,
        title: "UI",
        controls: {
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#000000",
            },
            padding: {
                // @ts-ignore - ControlType.Padding exists but may not be in types
                type: ControlType.Padding,
                title: "Padding",
                defaultValue: "0px",
            },
            borderRadius: {
                // @ts-ignore - ControlType.BorderRadius exists but may not be in types
                type: ControlType.BorderRadius,
                title: "Border Radius",
                defaultValue: "0px",
            },
            shadow: {
                // @ts-ignore - ControlType.Shadow exists but may not be in types
                type: ControlType.BoxShadow,
                title: "Shadow",
                defaultValue: "0px 0px 0px rgba(0,0,0,0)",
            },
            gap: {
                type: ControlType.Number,
                title: "Slide Gap",
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 20,
            },
        },
    },
    slidesUI: {
        type: ControlType.Object,
        title: "Slides UI",
        controls: {
            central: {
                type: ControlType.Enum,
                title: "Central",
                options: ["Same style", "Customize style"],
                optionTitles: ["Same style", "Customize style"],
                defaultValue: "Same style",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            slideSizing: {
                type: ControlType.Object,
                title: "Slide Sizing",
                controls: {
                    mode: {
                        type: ControlType.Enum,
                        title: "Mode",
                        options: ["fill-width", "aspect-ratio", "fixed-dimensions", "fill"],
                        optionTitles: ["Fill Width", "Aspect Ratio", "Fixed Dimensions", "Fill"],
                        defaultValue: "fill-width",
                        displaySegmentedControl: true,
                        segmentedControlDirection: "vertical",
                    },
                    aspectRatio: {
                        type: ControlType.Enum,
                        title: "Aspect Ratio",
                        options: ["16:9", "4:3", "1:1", "3:2", "21:9", "custom"],
                        optionTitles: ["16:9", "4:3", "1:1", "3:2", "21:9", "Custom"],
                        defaultValue: "16:9",
                        displaySegmentedControl: true,
                        segmentedControlDirection: "vertical",
                        hidden: (props: any) => props?.mode !== "aspect-ratio",
                    },
                    customAspectRatio: {
                        type: ControlType.String,
                        title: "Custom Ratio",
                        placeholder: "16:9",
                        defaultValue: "16:9",
                        hidden: (props: any) => props?.mode !== "aspect-ratio" || props?.aspectRatio !== "custom",
                    },
                    fixedWidth: {
                        type: ControlType.Number,
                        title: "Width",
                        min: 100,
                        max: 800,
                        step: 10,
                        defaultValue: 300,
                        hidden: (props: any) => props?.mode !== "fixed-dimensions",
                    },
                    fixedHeight: {
                        type: ControlType.Number,
                        title: "Height",
                        min: 100,
                        max: 600,
                        step: 10,
                        defaultValue: 200,
                        hidden: (props: any) => props?.mode !== "fixed-dimensions",
                    },
                    fillMode: {
                        type: ControlType.Enum,
                        title: "Fill Mode",
                        options: ["fill", "contain", "cover"],
                        optionTitles: ["Fill", "Contain", "Cover"],
                        defaultValue: "fill",
                        displaySegmentedControl: true,
                        segmentedControlDirection: "vertical",
                        hidden: (props: any) => props?.mode !== "fill",
                    },
                },
            },
            allSlides: {
                type: ControlType.Object,
                title: "All Slides",
                controls: {
                    backgroundColor: {
                        type: ControlType.Color,
                        title: "Background",
                        defaultValue: "rgba(0,0,0,0.1)",
                    },
                    border: {
                        // @ts-ignore - ControlType.Border exists but may not be in types
                        type: ControlType.Border,
                        title: "Border",
                        defaultValue: "1px solid rgba(0,0,0,0.2)",
                    },
                    radius: {
                        // @ts-ignore - ControlType.BorderRadius exists but may not be in types
                        type: ControlType.BorderRadius,
                        title: "Radius",
                        defaultValue: "10px",
                    },
                    shadow: {
                        // @ts-ignore - ControlType.BoxShadow exists but may not be in types
                        type: ControlType.BoxShadow,
                        title: "Shadow",
                        defaultValue: "0px 0px 0px rgba(0,0,0,0)",
                    },
                    scale: {
                        type: ControlType.Number,
                        title: "Scale",
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                        defaultValue: 1,
                    },
                    opacity: {
                        type: ControlType.Number,
                        title: "Opacity",
                        min: 0,
                        max: 1,
                        step: 0.1,
                        defaultValue: 1,
                    },
                },
            },
            centralSlide: {
                type: ControlType.Object,
                title: "Central Slide",
                hidden: (props: any) => props.slidesUI?.central !== "Customize style",
                controls: {
                    backgroundColor: {
                        type: ControlType.Color,
                        title: "Background",
                        defaultValue: "rgba(0,0,0,0.1)",
                    },
                    border: {
                        // @ts-ignore - ControlType.Border exists but may not be in types
                        type: ControlType.Border,
                        title: "Border",
                        defaultValue: "1px solid rgba(0,0,0,0.2)",
                    },
                    radius: {
                        // @ts-ignore - ControlType.BorderRadius exists but may not be in types
                        type: ControlType.BorderRadius,
                        title: "Radius",
                        defaultValue: "10px",
                    },
                    shadow: {
                        // @ts-ignore - ControlType.BoxShadow exists but may not be in types
                        type: ControlType.BoxShadow,
                        title: "Shadow",
                        defaultValue: "0px 0px 0px rgba(0,0,0,0)",
                    },
                    scale: {
                        type: ControlType.Number,
                        title: "Scale",
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                        defaultValue: 1.1,
                    },
                    opacity: {
                        type: ControlType.Number,
                        title: "Opacity",
                        min: 0,
                        max: 1,
                        step: 0.1,
                        defaultValue: 1,
                    },
                },
            },
        },
    },

    buttonsNavigation: {
        type: ControlType.Boolean,
        title: "Buttons Nav",
        defaultValue: true,
    },
    leftControl: {
        // @ts-ignore - ControlType.ComponentInstance exists but may not be in types
        type: ControlType.ComponentInstance,
        title: "Left Control",
        hidden: (props: any) => !props.buttonsNavigation,
    },
    rightControl: {
        // @ts-ignore - ControlType.ComponentInstance exists but may not be in types
        type: ControlType.ComponentInstance,
        title: "Right Control",
        hidden: (props: any) => !props.buttonsNavigation,
    },
    buttonsUI: {
        type: ControlType.Object,
        title: "Buttons UI",
        hidden: (props: any) => !props.buttonsNavigation,
        controls: {
            verticalAlign: {
                type: ControlType.Enum,
                title: "Vertical Align",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            horizontalAlign: {
                type: ControlType.Enum,
                title: "Horizontal Align",
                options: ["center", "space-between"],
                optionTitles: ["Center", "Space Between"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 100,
                step: 5,
                defaultValue: 20,
                hidden: (props: any) =>
                    props.buttonsUI?.horizontalAlign !== "center",
            },
            insetX: {
                type: ControlType.Number,
                title: "X Inset",
                min: -100,
                max: 100,
                step: 5,
                defaultValue: 20,
            },
            insetY: {
                type: ControlType.Number,
                title: "Y Inset",
                min: -100,
                max: 100,
                step: 5,
                defaultValue: 20,
            },
        },
    },
})

Carousel.displayName = "Adriano's Carousel"
