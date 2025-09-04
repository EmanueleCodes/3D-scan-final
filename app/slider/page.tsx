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
 * - 11 slides with different gradient borders
 * - Drag-to-scroll with momentum
 * - Click navigation (prev/next buttons)
 * - Direct slide selection by clicking
 * - Toggle overflow visibility
 * - Responsive design with inline CSS
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
}: {
    dragFactor?: number
    draggable?: boolean
    clickNavigation?: boolean
}) {
    // React refs for DOM elements
    const wrapperRef = useRef<HTMLDivElement>(null) // Reference to the wrapper container
    const boxesRef = useRef<HTMLDivElement[]>([]) // Array of slide element references
    const loopRef = useRef<HorizontalLoopTimeline | null>(null) // Reference to the GSAP timeline

    // React state for component behavior
    const [showOverflow, setShowOverflow] = useState(false) // Toggle for showing overflow content
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null) // Currently active slide

    /**
     * CSS Custom Properties for Theming
     *
     * These variables define the color scheme and gradients used throughout
     * the component. They can be easily modified to change the visual theme.
     */
    const cssVariables = {
        "--color-just-black": "#000000", // Main background color
        "--color-surface50": "#808080", // Border and accent color
        "--gradient-macha": "linear-gradient(45deg, #4CAF50, #8BC34A)", // Green gradient
        "--gradient-summer-fair": "linear-gradient(45deg, #FF9800, #FFC107)", // Orange gradient
        "--gradient-orange-crush": "linear-gradient(45deg, #FF5722, #FF9800)", // Red-orange gradient
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
        config: LoopConfig,
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
         */
        const getTotalWidth = () =>
            items[length - 1].offsetLeft +
            (xPercents[length - 1] / 100) * widths[length - 1] -
            startX +
            spaceBefore[0] +
            items[length - 1].offsetWidth *
                (gsap.getProperty(items[length - 1], "scaleX") as number) +
            (parseFloat(String(config.paddingRight)) || 0)

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

                // Handle wrapping - if distance is more than half the wrap value,
                // check the other direction around the circle
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
            for (i = 0; i < length; i++) {
                item = items[i]
                curX = (xPercents[i] / 100) * widths[i]
                distanceToStart =
                    item.offsetLeft + curX - startX + spaceBefore[0]
                distanceToLoop =
                    distanceToStart +
                    widths[i] * (gsap.getProperty(item, "scaleX") as number)
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
        tl.next = (vars?: gsap.TweenVars) => toIndex(tl.current() + 1, vars)
        tl.previous = (vars?: gsap.TweenVars) => toIndex(tl.current() - 1, vars)
        tl.times = times
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
                wasPlaying: boolean

            const align = () => {
                tl.progress(
                    wrap(
                        startProgress + (draggable.startX - draggable.x) * ratio
                    )
                )
            }
            const syncIndex = () => tl.closestIndex(true)

            draggable = Draggable.create(proxy, {
                trigger: items[0].parentNode as Element,
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
                },
                onDrag: align,
                onThrowUpdate: align,
                overshootTolerance: 0,
                inertia: true,
                /**
                 * max
                 */
                maxDuration: 4 * (1.1-dragFactor),
                snap(value: number) {
                    if (Math.abs(startProgress / -ratio - this.x) < 10) {
                        return lastSnap + initChangeX
                    }
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
                    draggable.isThrowing && (indexIsDirty = true)
                },
                onThrowComplete: () => {
                    syncIndex()
                    wasPlaying && tl.play()
                },
            })[0]
            tl.draggable = draggable
        }

        tl.closestIndex(true)
        lastIndex = curIndex
        onChange && onChange(items[curIndex], curIndex)

        // Debug initial position
        console.log("Initial timeline state:", {
            progress: tl.progress(),
            time: tl.time(),
            duration: tl.duration(),
            currentIndex: tl.current(),
            times: times.slice(0, 5), // First 5 times for debugging
        })

        // Store cleanup function for later use
        ;(tl as any).cleanup = () =>
            window.removeEventListener("resize", onResize)

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
                const loop = createHorizontalLoop(
                    boxesRef.current,
                    {
                        paused: true,
                        draggable: draggable, // Use the property control value
                        center: wrapperRef.current || true, // Pass the wrapper element for proper centering
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
                    },
                )

                if (loop) {
                    loopRef.current = loop

                    // Add click handlers to boxes (only if clickNavigation is enabled)
                    if (clickNavigation) {
                        boxesRef.current.forEach((box, i) => {
                            if (box) {
                                const clickHandler = () => {
                                    if (loop && loop.toIndex) {
                                        loop.toIndex(i, {
                                            duration: 0.8,
                                            ease: "power1.inOut",
                                        })
                                    }
                                }
                                box.addEventListener("click", clickHandler)

                                // Store the handler for cleanup
                                ;(box as any).__clickHandler = clickHandler
                            }
                        })
                    }

                    // Return cleanup function - useGSAP will handle this automatically
                    return () => {
                        clearTimeout(timer)
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
            }, 100) // 100ms delay

            return () => clearTimeout(timer)
        },
        { scope: wrapperRef, dependencies: [dragFactor, draggable, clickNavigation] }
    ) // Scope to wrapper element

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
     */
    const handleNext = () => {
        if (loopRef.current && loopRef.current.next) {
            loopRef.current.next({ duration: 0.4, ease: "power1.inOut" })
        }
    }

    /**
     * Navigate to the previous slide
     *
     * Uses the timeline's previous() method to smoothly animate to the previous slide
     * with a custom duration and easing function.
     */
    const handlePrev = () => {
        if (loopRef.current && loopRef.current.previous) {
            loopRef.current.previous({ duration: 0.4, ease: "power1.inOut" })
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
     * Creates 11 slide elements with alternating gradient borders.
     * Each slide has a unique number and is assigned to a ref for GSAP manipulation.
     *
     * Design pattern:
     * - Cycle through 3 different gradient classes
     * - Special width for slide 5 (index 4) to demonstrate variable sizing
     * - Each slide gets a ref for GSAP timeline integration
     */
    const boxes = Array.from({ length: 11 }, (_, i) => {
        // Cycle through 3 gradient classes for visual variety
        const gradientClass =
            i % 3 === 0
                ? "gradient-orange-crush"
                : i % 3 === 1
                  ? "gradient-summer-fair"
                  : "gradient-macha"

        return (
            <div
                key={i}
                ref={(el) => {
                    // Store reference for GSAP timeline
                    if (el) boxesRef.current[i] = el
                }}
                className={`box ${gradientClass}`}
                style={{
                    padding: "0.5rem",
                    flexShrink: 0,
                    height: "80%",
                    width: i === 4 ? "350px" : "150px", // Special width for slide 5, otherwise fixed width
                    minWidth: "150px",
                }}
            >
                <div
                    className="box__inner"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative" as const,
                        fontSize: "21px",
                        cursor: "pointer",
                        width: "100%",
                        height: "100%",
                        background:
                            "linear-gradient(#000000, #000000) padding-box, var(--gradient) border-box",
                        border: "3px solid transparent",
                        borderRadius: "10px",
                    }}
                >
                    <p
                        style={{
                            WebkitTextFillColor: "transparent",
                            background: "var(--gradient)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            fontSize: "3rem",
                            margin: 0,
                        }}
                    >
                        {i + 1}
                    </p>
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
                background: cssVariables["--color-just-black"],
                color: "white",
                textAlign: "center" as const,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column" as const,
                height: "100%",
                width: "100%",
                margin: 0,
                padding: 0,
            }}
        >
            {/* Inline CSS for gradient theming and active states */}
            <style>
                {`
          /* Apply gradient colors to each slide type */
          .box.gradient-macha { --gradient: ${cssVariables["--gradient-macha"]}; }
          .box.gradient-summer-fair { --gradient: ${cssVariables["--gradient-summer-fair"]}; }
          .box.gradient-orange-crush { --gradient: ${cssVariables["--gradient-orange-crush"]}; }
          
          /* Active slide scaling effect */
          .box.active .box__inner {
            transform: scale(1.1);
            transition: transform 0.3s ease;
          }
        `}
            </style>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap" as const,
                    marginBottom: "2rem",
                    gap: "1rem",
                }}
            >
                <button
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
                    onClick={handlePrev}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#333")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                    }
                >
                    prev
                </button>
                <button
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
                </button>
                <button
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
                    onClick={handleNext}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#333")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                    }
                >
                    next
                </button>
            </div>

            <div
                ref={wrapperRef}
                style={{
                    height: "300px",
                    maxHeight: "50vh",
                    width: "70%",
                    borderLeft: "dashed 2px #808080",
                    borderRight: "dashed 2px #808080",
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
    clickNavigation: {
        type: ControlType.Boolean,
        title: "Click Navigation",
        defaultValue: true,
    },
    dragFactor: {
        type: ControlType.Number,
        title: "Drag",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden:(props:any)=>!props.draggable
    },
})

Carousel.displayName = "Adriano's Carousel"
