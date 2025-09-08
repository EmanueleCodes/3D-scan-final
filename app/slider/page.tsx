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

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react"
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
 * - Flexible slide sizing (fill-width, aspect-ratio, fixed-dimensions, fill)
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
            mode: "fill" | "fill-width" | "fill-height" | "aspect-ratio" | "fixed-dimensions"
            aspectRatio?: "16:9" | "4:3" | "1:1" | "3:2" | "21:9" | "custom"
            customAspectRatio?: string
            fixedWidth?: number
            fixedHeight?: number
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
    const resizeObserverRef = useRef<ResizeObserver | null>(null) // Reference to ResizeObserver
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Debounce timeout for resize

    // Stable box widths - generated once and reused to prevent animation issues
    // CRITICAL: Box widths must remain stable across React re-renders to prevent
    // GSAP animation calculations from breaking. Random widths calculated during
    // render cause timeline position miscalculations and animation glitches.
    const boxWidths = useRef<number[]>([])
    const boxHeights = useRef<number[]>([])
    const containerDimensions = useRef({ width: 0, height: 0 })
    const lastValidContent = useRef<React.ReactNode[]>([]) // Track last valid content

    // React state for component behavior
    const [showOverflow, setShowOverflow] = useState(false) // Toggle for showing overflow content
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null) // Currently active slide
    const [containerReady, setContainerReady] = useState(false) // Track when container has proper dimensions

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
     * while preserving its internal styling and functionality with proper type safety.
     */
    const makeComponentResponsive = useCallback((component: React.ReactNode, key: string | number) => {
        // Handle non-React elements safely
        if (!React.isValidElement(component)) {
            return component
        }

        try {
            // Safely extract existing styles
            const existingStyle = (component.props && typeof component.props === 'object' && 'style' in component.props) 
                ? component.props.style as React.CSSProperties || {} 
                : {}

        // Clone the component with responsive styles
            return React.cloneElement(component as React.ReactElement, {
            key,
            style: {
                    ...existingStyle,
                width: "100%",
                height: "100%",
            },
            })
        } catch (error) {
            console.warn('Failed to make component responsive:', error)
            return component
        }
    }, [])

    /**
     * Calculate slide dimensions based on sizing mode with proper validation and responsive behavior
     */
    const calculateSlideDimensions = useCallback((containerWidth: number, containerHeight: number, validContent?: React.ReactNode[]) => {
        // CRITICAL: Don't calculate dimensions if container has no size yet
        // This prevents the flash of small slides during initial render
        if (!containerWidth || !containerHeight || containerWidth === 0 || containerHeight === 0) {
            console.log("Container not ready, using fallback dimensions")
            return {
                width: 300, // Use a reasonable fallback
                height: 200,
                objectFit: "cover" as const,
            }
        }
        
        // Validate input dimensions
        const safeContainerWidth = Math.max(containerWidth, 100) // Minimum 100px width
        const safeContainerHeight = Math.max(containerHeight, 100) // Minimum 100px height
        
        const mode = slidesUI.slideSizing?.mode || "fill-width"
        
        switch (mode) {
            case "fill-width":
                // For fill-width, slides should truly fill the available width
                // Calculate how many slides can reasonably fit, then make each slide fill proportionally
                const gap = Math.max(ui?.gap ?? 20, 0)
                
                // Determine optimal number of visible slides based on container width
                let slidesToShow = 1
                if (safeContainerWidth >= 400) slidesToShow = 2
                if (safeContainerWidth >= 800) slidesToShow = 3
                if (safeContainerWidth >= 1200) slidesToShow = 4
                
                // Calculate available width after accounting for gaps
                const totalGapWidth = gap * (slidesToShow - 1)
                const availableWidth = safeContainerWidth - totalGapWidth
                const slideWidth = availableWidth / slidesToShow
                
                // Ensure minimum viable slide width
                const minSlideWidth = 200
                const finalSlideWidth = Math.max(slideWidth, minSlideWidth)
                
                // If slides would be too small, reduce the number of slides
                if (slideWidth < minSlideWidth && slidesToShow > 1) {
                    slidesToShow = Math.max(1, Math.floor(safeContainerWidth / (minSlideWidth + gap)))
                    const adjustedTotalGapWidth = gap * (slidesToShow - 1)
                    const adjustedAvailableWidth = safeContainerWidth - adjustedTotalGapWidth
                    const adjustedSlideWidth = adjustedAvailableWidth / slidesToShow
                    return {
                        width: adjustedSlideWidth,
                        // Ignore aspect ratio in fill-width mode: base height on container only
                        height: safeContainerHeight * 0.85,
                        objectFit: "cover" as const,
                    }
                }
                
                return {
                    width: finalSlideWidth,
                    // Ignore aspect ratio in fill-width mode: base height on container only
                    height: safeContainerHeight * 0.85,
                    objectFit: "cover" as const,
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
                    try {
                        const [w, h] = customRatio.split(":").map(Number)
                        if (w > 0 && h > 0) {
                            ratio = w / h
                        }
                    } catch {
                        ratio = 16/9 // Fallback to default if custom ratio is invalid
                    }
                }
                
                // NEW LOGIC: Fill the smaller dimension to 100%, calculate the other based on aspect ratio
                // Use full container dimensions (not safe dimensions with minimums)
                const containerAspectRatio = containerWidth / containerHeight
                const slideAspectRatio = ratio
                
                let aspectSlideWidth: number
                let aspectSlideHeight: number
                
                if (containerAspectRatio > slideAspectRatio) {
                    // Container is wider than slide aspect ratio
                    // Fill height to 100%, calculate width based on aspect ratio
                    aspectSlideHeight = containerHeight // Fill 100% of container height
                    aspectSlideWidth = aspectSlideHeight * slideAspectRatio
                } else {
                    // Container is taller than slide aspect ratio  
                    // Fill width to 100%, calculate height based on aspect ratio
                    aspectSlideWidth = containerWidth // Fill 100% of container width
                    aspectSlideHeight = aspectSlideWidth / slideAspectRatio
                }
                
                // Ensure minimum dimensions
                const minDimension = 100
                if (aspectSlideWidth < minDimension) {
                    aspectSlideWidth = minDimension
                    aspectSlideHeight = aspectSlideWidth / slideAspectRatio
                }
                if (aspectSlideHeight < minDimension) {
                    aspectSlideHeight = minDimension
                    aspectSlideWidth = aspectSlideHeight * slideAspectRatio
                }
                
                return {
                    width: aspectSlideWidth,
                    height: aspectSlideHeight,
                    objectFit: "cover" as const,
                }
            
            case "fixed-dimensions":
                const fixedWidth = slidesUI.slideSizing?.fixedWidth || 300
                const fixedHeight = slidesUI.slideSizing?.fixedHeight || 200
                
                // Debug fixed dimensions calculation
                console.log("Fixed dimensions debug:", {
                    requestedWidth: fixedWidth,
                    requestedHeight: fixedHeight,
                    containerWidth: safeContainerWidth,
                    containerHeight: safeContainerHeight,
                    maxWidth: safeContainerWidth * 0.9,
                    maxHeight: safeContainerHeight * 0.9,
                    finalWidth: Math.min(fixedWidth, safeContainerWidth * 0.9),
                    finalHeight: Math.min(fixedHeight, safeContainerHeight * 0.9)
                })
                
                // Ensure fixed dimensions don't exceed container bounds
                return {
                    width: Math.min(fixedWidth, safeContainerWidth * 0.9),
                    height: Math.min(fixedHeight, safeContainerHeight * 0.9),
                    objectFit: "cover" as const,
                }
            
            case "fill":
                return {
                    width: containerWidth, // 100% of actual container width (not safe)
                    height: containerHeight, // 100% of actual container height (not safe)
                    objectFit: "fill" as const,
                }
            
            case "fill-width":
                const fillWidth = slidesUI.slideSizing?.fixedHeight || 300
                return {
                    width: containerWidth, // 100% of actual container width (not safe)
                    height: fillWidth, // Use specified height
                    objectFit: "cover" as const,
                }
            
            case "fill-height":
                const fillHeight = slidesUI.slideSizing?.fixedWidth || 200
                return {
                    width: fillHeight, // Use specified width
                    height: containerHeight, // 100% of actual container height (not safe)
                    objectFit: "cover" as const,
                }
            
            default:
                // Fallback with responsive sizing
                return {
                    width: Math.min(250, safeContainerWidth * 0.6),
                    height: Math.min(180, safeContainerHeight * 0.6),
                    objectFit: "cover" as const,
                }
        }
    }, [slidesUI.slideSizing])

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

        // GSAP horizontal loop initialization

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
         * Include gap for proper infinite loop spacing
         */
        const getTotalWidth = () => {
            // Total width calculation - include gap after last slide for infinite loop
            const gap = (config as any).gap ?? 0
            return items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * (gsap.getProperty(items[length-1], "scaleX") as number) + gap + (parseFloat(String(config.paddingRight)) || 0)
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
                try {
                    // Get the actual width of each slide with fallback
                    const gsapWidth = gsap.getProperty(el, "width", "px") as string
                    const computedWidth = parseFloat(gsapWidth)
                    
                    // Simplified debug (only for first slide)
                    if (i === 0) {
                        console.log("First slide measurement:", {
                            computed: computedWidth,
                            element: el.offsetWidth,
                            expected: boxWidths.current[i]
                        })
                    }
                    
                    // Use computed style as fallback if GSAP can't measure
                    if (isNaN(computedWidth) || computedWidth <= 0) {
                        const computedStyle = window.getComputedStyle(el)
                        const fallbackWidth = parseFloat(computedStyle.width)
                        widths[i] = isNaN(fallbackWidth) ? 250 : fallbackWidth // 250px as last resort
                        console.warn(`GSAP width measurement failed for slide ${i}, using fallback:`, widths[i])
                    } else {
                        widths[i] = computedWidth
                    }

                // Calculate X position as percentage of width for responsive positioning
                    const gsapX = gsap.getProperty(el, "x", "px") as string
                    const gsapXPercent = gsap.getProperty(el, "xPercent") as number
                    const xValue = parseFloat(gsapX) || 0
                    const xPercentValue = gsapXPercent || 0
                    
                xPercents[i] = snap(
                        (xValue / Math.max(widths[i], 1)) * 100 + xPercentValue
                )

                // Calculate space before this slide
                // For infinite loop, use consistent gap instead of measuring actual spacing
                const gap = (config as any).gap ?? 0
                if (i === 0) {
                    spaceBefore[i] = 0 // First slide has no space before
                } else {
                    spaceBefore[i] = gap // Use the configured gap consistently
                }
                
                // Debug space calculation (only for first slide)
                if (i === 0) {
                    console.log("Space calculation:", {
                        spaceValue: spaceBefore[i],
                        elementWidth: el.offsetWidth,
                        gap: gap
                    })
                }
                
                // Update b1 for next iteration (still needed for some calculations)
                b2 = el.getBoundingClientRect()
                b1 = b2
                } catch (error) {
                    console.error(`Error measuring slide ${i}:`, error)
                    // Fallback values
                    widths[i] = 250
                    xPercents[i] = 0
                    spaceBefore[i] = 0
                }
            })

            // Apply xPercent positioning to all slides for responsive behavior
            try {
            gsap.set(items, {
                xPercent: (i: number) => xPercents[i],
            })
            } catch (error) {
                console.error('Error setting xPercent positioning:', error)
            }

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
            // Shift by half the container width in timeline units so that each slide's CENTER aligns with container center.
            timeOffset = center
                ? (tl.duration() * (containerWidth / 2)) / totalWidth
                : 0

            // Debug centering
            console.log("Centering debug:", {
                containerWidth,
                totalWidth,
                timeOffset,
                center: !!center,
                averageSlideWidth: totalWidth / length
            })

            // Apply centering offset to each slide's timeline position (use slide centers)
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
            
            // Populate timeline with slides
            
            // INFINITE MODE: Don't add gap to individual slides in loop calculation
            // The gap is already included in the spaceBefore measurements from getBoundingClientRect
            for (i = 0; i < length; i++) {
                item = items[i]
                curX = (xPercents[i] / 100) * widths[i]
                
                // Calculate distances - spaceBefore already includes the gap from CSS margin-right
                distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0]
                
                // For infinite loop, add gap after last slide to ensure proper spacing
                const gap = (config as any).gap ?? 0
                const isLastSlide = i === length - 1
                distanceToLoop = distanceToStart + widths[i] * (gsap.getProperty(item, "scaleX") as number) + (isLastSlide ? gap : 0)
                
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
        gsap.set(items, { x: 0, xPercent: 0 })

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

        // CENTERING FIX: Set timeline to start at center position
        // This ensures the first visible slide appears centered
        if (center && times.length > 0) {
            // Force a complete refresh to ensure all calculations are correct
            refresh(true)
            
            // Set timeline to start at the center of the first content group
            // For 3 content items, start at the middle (index 1)
            const middleIndex = Math.floor(length / 2)
            const centerTime = times[middleIndex] || times[0]
            
            // Set the timeline to the center position immediately
            tl.time(centerTime, true)
            
            // Debug centering
            console.log("Initial centering applied:", {
                middleIndex,
                centerTime,
                currentIndex: tl.current(),
                progress: tl.progress(),
                totalWidth: getTotalWidth(),
                containerWidth: container ? (container as HTMLElement).offsetWidth : 0
            })
        }

        // Update current index after centering
        tl.closestIndex(true)
        lastIndex = curIndex
        onChange && onChange(items[curIndex], curIndex)

        // Debug timeline and duplication issues
        console.log("Timeline debug:", {
            progress: tl.progress(),
            duration: tl.duration(),
            currentIndex: tl.current(),
            totalWidth: getTotalWidth(),
            widths: widths.slice(0, 3),
            spaceBefore: spaceBefore.slice(0, 3),
            timesArray: times.slice(0, 3),
            actualSlideCount: length
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

    // Add initialization state to prevent race conditions
    const initializationRef = useRef({ isInitializing: false, isInitialized: false })

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
            // Prevent multiple simultaneous initializations
            if (initializationRef.current.isInitializing || initializationRef.current.isInitialized) {
                    return
                }

            initializationRef.current.isInitializing = true
            
            // Use requestAnimationFrame for better timing coordination
            const initFrame = requestAnimationFrame(() => {
                // NEW APPROACH: Pass all static slides to GSAP
                // All 6 slides are static containers with cycling content
                const allSlides = boxesRef.current.filter(Boolean)
                
                // DYNAMIC FIX: Ensure we have enough slides to fill the container
                if (allSlides.length < slideData.finalCount) {
                    console.warn(`Not enough slides rendered yet: ${allSlides.length}/${slideData.finalCount}, retrying...`)
                    // Retry after a short delay
                    setTimeout(() => {
                        const retrySlides = boxesRef.current.filter(Boolean)
                        if (retrySlides.length >= slideData.finalCount) {
                            console.log("Retry successful, proceeding with", retrySlides.length, "slides")
                            // Re-run the initialization logic here
                        } else {
                            console.warn("Retry failed, still not enough slides")
                        }
                    }, 100)
                    return
                }
                
                // FIX: Ensure all elements are in the DOM before passing to GSAP
                const validSlides = allSlides.filter(slide => {
                    const isInDOM = document.contains(slide)
                    const isVisible = window.getComputedStyle(slide).display !== 'none'
                    return isInDOM && isVisible
                })
                
                console.log("DEBUG: NEW APPROACH - All static slides:", allSlides.length, "valid slides:", validSlides.length, "total rendered:", boxesRef.current.length)
                
                // Validate that we have slides and container
                if (validSlides.length === 0 || !wrapperRef.current) {
                    console.warn("Cannot initialize carousel: missing slides or container")
                    return
                }

                // Ensure container has dimensions - single check with fallback
                const containerRect = wrapperRef.current.getBoundingClientRect()
                if (containerRect.width === 0 || containerRect.height === 0) {
                    console.log("Container not ready, using fallback dimensions")
                    // Use fallback dimensions instead of retrying
                    containerDimensions.current = { width: 600, height: 400 }
                } else {
                containerDimensions.current = { width: containerRect.width, height: containerRect.height }
                }
                
                setContainerReady(true)


                /**
                 * Create the horizontal loop with configuration
                 *
                 * Configuration options:
                 * - paused: true - Start paused so we can control it manually
                 * - draggable: true - Enable drag-to-scroll functionality
                 * - center: wrapperRef.current - Use wrapper element for centering calculations
                 * - onChange: Callback fired when the active slide changes
                 */
                const currentGap = Math.max(ui?.gap ?? 20, 0)
                
                // DEBUG: Log the slides being passed to GSAP
                console.log("DEBUG: NEW APPROACH - Creating loop with static slides:", {
                    totalSlides: validSlides.length,
                    expectedSlides: slideData.finalCount,
                    contentItems: slideData.validContent.length,
                    slideElements: validSlides.map((el, i) => ({
                        index: i,
                        element: el,
                        hasElement: !!el,
                        width: el?.offsetWidth || 0,
                        visible: el ? window.getComputedStyle(el).display !== 'none' : false
                    }))
                })
                
                // FIX: Add delay to ensure all 6 slides are rendered
                setTimeout(() => {
                    // Re-check all slides after delay
                    const allSlidesAfterDelay = boxesRef.current.filter(Boolean)
                    
                    if (allSlidesAfterDelay.length < slideData.finalCount) {
                        console.warn(`Still not enough slides after delay: ${allSlidesAfterDelay.length}/${slideData.finalCount}`)
                        return
                    }
                    
                    const finalValidSlides = allSlidesAfterDelay.filter(slide => {
                        const isInDOM = document.contains(slide)
                        const isVisible = window.getComputedStyle(slide).display !== 'none'
                        return isInDOM && isVisible
                    })
                    
                    console.log("DEBUG: Final valid slides after delay:", finalValidSlides.length, "out of", allSlidesAfterDelay.length)
                    
                    if (finalValidSlides.length === 0) {
                        console.warn("No valid slides found after delay")
                        return
                    }
                    
                try {
                const loop = createHorizontalLoop(finalValidSlides, {
                    paused: true,
                    draggable: draggable, // Use the property control value
                    center: wrapperRef.current || true, // Pass the wrapper element for proper centering
                    gap: currentGap, // Pass the gap value for proper loop calculations
                    onChange: (element: HTMLElement, index: number) => {
                        // Debounce onChange to prevent excessive state updates
                        requestAnimationFrame(() => {
                            try {
                        // Update React state when active slide changes
                        setActiveElement(element)

                        // Remove active class from all slides
                        boxesRef.current.forEach((box) => {
                            if (box) box.classList.remove("active")
                        })

                        // Add active class to the current slide
                                if (element) element.classList.add("active")
                            } catch (error) {
                                console.error("Error in onChange callback:", error)
                            }
                        })
                    },
                })

                if (loop) {
                    loopRef.current = loop
                    initializationRef.current.isInitialized = true

                    // Add click handlers to boxes (only if clickNavigation is enabled)
                    if (clickNavigation) {
                        boxesRef.current.forEach((box, i) => {
                            if (box) {
                                const clickHandler = () => {
                                        try {
                                    stopAutoplay() // Stop autoplay when user clicks
                                    if (loop && loop.toIndex) {
                                        loop.toIndex(i, {
                                            duration: 0.8,
                                            ease: "power1.inOut",
                                        })
                                    }
                                    // Restart autoplay after user interaction
                                    if (autoplay.enabled) {
                                                setTimeout(startAutoplay, 10) // Restart after delay
                                            }
                                        } catch (error) {
                                            console.error("Error in click handler:", error)
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

                    // CENTERING FIX: Ensure centering happens after everything is set up
                    // Use a small delay to ensure DOM is fully ready
                    setTimeout(() => {
                        if (loop && loop.times && loop.times.length > 0) {
                            // Calculate the middle index for dynamic number of slides
                            // Center on the middle slide for proper initial display
                            const middleIndex = Math.floor(loop.times.length / 2)
                            const centerTime = loop.times[middleIndex] || loop.times[0]
                            
                            // Force refresh and re-center using the loop reference
                            if ((loop as any).refresh) {
                                (loop as any).refresh(true)
                            }
                            
                            // Set timeline to center position
                            if (loop.time) {
                                loop.time(centerTime, true)
                            }
                            
                            if (loop.closestIndex) {
                                loop.closestIndex(true)
                            }
                            console.log("Delayed centering applied to time:", centerTime, "index:", middleIndex)
                        }
                    }, 100)

                    // Return cleanup function - useGSAP will handle this automatically
                    return () => {
                        cancelAnimationFrame(initFrame)
                        initializationRef.current.isInitializing = false
                        initializationRef.current.isInitialized = false
                        stopAutoplay() // Stop autoplay on cleanup

                        // Custom cleanup for event listeners
                        boxesRef.current.forEach((box) => {
                            if (box && (box as any).__clickHandler) {
                                    try {
                                box.removeEventListener(
                                    "click",
                                    (box as any).__clickHandler
                                )
                                    } catch (error) {
                                        console.warn("Error removing click handler:", error)
                                    }
                            }
                        })

                        // Call the timeline's cleanup function
                        if ((loop as any).cleanup) {
                                try {
                            ;(loop as any).cleanup()
                                } catch (error) {
                                    console.warn("Error in timeline cleanup:", error)
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error creating horizontal loop:", error)
                    initializationRef.current.isInitializing = false
                    // Return basic cleanup even if loop creation failed
                    return () => {
                        cancelAnimationFrame(initFrame)
                        initializationRef.current.isInitializing = false
                        initializationRef.current.isInitialized = false
                        stopAutoplay()
                    }
                }
                }, 50) // Close setTimeout with 50ms delay
            })

            return () => {
                cancelAnimationFrame(initFrame)
                initializationRef.current.isInitializing = false
                initializationRef.current.isInitialized = false
            }
        },
        {
            scope: wrapperRef,
            // STABILITY FIX: Reduce dependencies to prevent unnecessary re-initializations
            dependencies: [dragFactor, draggable, clickNavigation, content.length, ui?.gap, autoplay.enabled, autoplay.direction, slidesUI.slideSizing?.mode, containerReady],
        }
    ) // Scope to wrapper element

    /**
     * Autoplay Functions
     *
     * These functions handle the automatic progression of slides.
     */
    const startAutoplay = () => {
        try {
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

            // Validate autoplay duration
            const duration = Math.max(autoplay.duration || 3, 0.5) // Minimum 0.5 seconds

        // Start new timer
        autoplayTimerRef.current = setInterval(() => {
                try {
            // Check again before advancing - user might have started dragging
            if (
                loopRef.current &&
                !isDraggingRef.current &&
                !isThrowingRef.current
            ) {
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
                } catch (error) {
                    console.error("Error in autoplay advancement:", error)
                    stopAutoplay() // Stop autoplay if there's an error
                }
            }, duration * 1000) // Convert seconds to milliseconds
        } catch (error) {
            console.error("Error starting autoplay:", error)
        }
    }

    const stopAutoplay = () => {
        try {
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current)
            autoplayTimerRef.current = null
            }
        } catch (error) {
            console.error("Error stopping autoplay:", error)
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
        try {
        stopAutoplay() // Stop autoplay when user interacts
        if (loopRef.current && loopRef.current.next) {
            loopRef.current.next({ duration: 0.4, ease: "power1.inOut" })
        }
        // Restart autoplay after user interaction
        if (autoplay.enabled) {
                setTimeout(startAutoplay, 10) // Restart after delay
            }
        } catch (error) {
            console.error("Error navigating to next slide:", error)
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
        try {
        stopAutoplay() // Stop autoplay when user interacts
        if (loopRef.current && loopRef.current.previous) {
            loopRef.current.previous({ duration: 0.4, ease: "power1.inOut" })
        }
        // Restart autoplay after user interaction
        if (autoplay.enabled) {
                setTimeout(startAutoplay, 10) // Restart after delay
            }
        } catch (error) {
            console.error("Error navigating to previous slide:", error)
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
    
    /**
     * ResizeObserver callback with debouncing for performance
     * STABILITY FIX: Prevent resize conflicts during animations
     */
    const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
        if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current)
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
            const entry = entries[0]
            if (entry) {
                const { width, height } = entry.contentRect
                const prevWidth = containerDimensions.current.width
                const prevHeight = containerDimensions.current.height
                
                // Only update if there's a significant change (prevents excessive recalculations)
                if (Math.abs(width - prevWidth) > 20 || Math.abs(height - prevHeight) > 20) {
                    // STABILITY FIX: Don't clear widths during resize - recalculate instead
                    const wasPlaying = loopRef.current && !loopRef.current.paused()
                    
                    // Pause animations during resize to prevent conflicts
                    if (loopRef.current && wasPlaying) {
                        loopRef.current.pause()
                    }
                    
                    containerDimensions.current = { width, height }
                    
                    // Recalculate slide widths without clearing the array
                    if (content.length > 0) {
                        const dimensions = calculateSlideDimensions(width, height, content)
                        const slideWidth = Math.max(dimensions.width, 50)
                        boxWidths.current = boxWidths.current.map(() => slideWidth)
                    }
                    
                    // DYNAMIC FIX: Recalculate slides when container size changes
                    console.log("Resize detected, updating dimensions:", { width, height })
                    
                    // Update container dimensions
                    containerDimensions.current = { width, height }
                    
                    // Force a re-render to recalculate slide count
                    setContainerReady(false)
                    setTimeout(() => setContainerReady(true), 10)
                    
                    // Resume animations after a short delay
                    if (loopRef.current && wasPlaying) {
                        setTimeout(() => {
                            if (loopRef.current) loopRef.current.play()
                        }, 50)
                    }
                }
            }
        }, 150) // Increased debounce for better stability
    }, [calculateSlideDimensions, content])

    /**
     * Setup ResizeObserver for container width detection
     * STABILITY FIX: Better initialization and cleanup
     */
    useEffect(() => {
        if (!wrapperRef.current) return
        
        // Initialize ResizeObserver with error handling
        try {
        resizeObserverRef.current = new ResizeObserver(handleResize)
        resizeObserverRef.current.observe(wrapperRef.current)
        
            // Get initial dimensions with fallback
        const rect = wrapperRef.current.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
        containerDimensions.current = { width: rect.width, height: rect.height }
            } else {
                // Use fallback dimensions if measurement fails
                containerDimensions.current = { width: 600, height: 400 }
            }
        } catch (error) {
            console.warn("ResizeObserver initialization failed:", error)
            // Fallback to window resize for older browsers
            const handleWindowResize = () => {
                if (wrapperRef.current) {
                    const rect = wrapperRef.current.getBoundingClientRect()
                    if (rect.width > 0 && rect.height > 0) {
                        containerDimensions.current = { width: rect.width, height: rect.height }
                    }
                }
            }
            window.addEventListener('resize', handleWindowResize)
            
            return () => {
                window.removeEventListener('resize', handleWindowResize)
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current)
                }
            }
        }
        
        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect()
            }
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
        }
    }, [handleResize])

    /**
     * Calculate how many slides we actually need with proper validation and limits
     * DYNAMIC APPROACH: Calculate slides needed to fill container width
     */
    const calculateRequiredSlides = useCallback(() => {
        // Validate content array
        const validContent = Array.isArray(content) ? content.filter(item => item != null) : []
        const actualSlideCount = Math.max(validContent.length, 3) // Minimum 3 for infinite loop
        
        // DYNAMIC APPROACH: Calculate slides needed to fill container
        const containerWidth = containerDimensions.current.width
        const gap = Math.max(ui?.gap ?? 20, 0)
        
        if (containerWidth > 0) {
            // Calculate how many slides we need to fill the container
            // We need at least 2x the content for infinite loop, but more if container is wide
            const minSlides = actualSlideCount * 2 // Minimum for infinite loop
            
            // Calculate slide width (use first slide width if available, otherwise estimate)
            // For very short slides, we need a better estimation strategy
            let estimatedSlideWidth = boxWidths.current[0] || 300
            
            // If we have very short slides, ensure minimum width for proper filling
            if (estimatedSlideWidth < 100) {
                // For very short slides, estimate based on container and content count
                const minSlideWidth = Math.max(150, containerWidth / 8) // At least 150px or 1/8 of container
                estimatedSlideWidth = Math.max(estimatedSlideWidth, minSlideWidth)
            }
            
            const slideWidthWithGap = estimatedSlideWidth + gap
            
            // Calculate how many slides we need to fill the container with some overflow
            const slidesNeeded = Math.ceil((containerWidth * 1.5) / slideWidthWithGap) // 1.5x for smooth scrolling
            
            // CRITICAL FIX: Ensure finalCount is always a multiple of actualSlideCount
            // This ensures proper content cycling and infinite loop behavior
            const rawFinalCount = Math.max(minSlides, slidesNeeded)
            const finalCount = Math.ceil(rawFinalCount / actualSlideCount) * actualSlideCount
            
            // SAFETY CHECK: Ensure we have enough slides for very wide containers
            // For very wide containers, we might need more than 1.5x to ensure smooth scrolling
            const minSlidesForWideContainer = Math.ceil(containerWidth / slideWidthWithGap) + actualSlideCount
            const finalCountWithSafety = Math.max(finalCount, minSlidesForWideContainer)
            const finalFinalCount = Math.ceil(finalCountWithSafety / actualSlideCount) * actualSlideCount
            
            console.log("Dynamic slide calculation:", {
                containerWidth,
                estimatedSlideWidth,
                slideWidthWithGap,
                slidesNeeded,
                minSlides,
                rawFinalCount,
                actualSlideCount,
                finalCount,
                minSlidesForWideContainer,
                finalCountWithSafety,
                finalFinalCount,
                multiples: finalFinalCount / actualSlideCount
            })
        
        return { finalCount: finalFinalCount, actualSlideCount, validContent }
        } else {
            // Fallback: use minimum slides if container width not available
            const finalCount = actualSlideCount * 2
        return { finalCount, actualSlideCount, validContent }
        }
    }, [content, ui?.gap])

    /**
     * Generate stable slide widths - SIMPLIFIED
     */
    const generateSlideWidths = useCallback(() => {
        const { finalCount, validContent } = calculateRequiredSlides()
        
        // Use current container dimensions
        const containerWidth = containerDimensions.current.width
        const containerHeight = containerDimensions.current.height
        
        // If container not ready, use fallback
        if (!containerWidth || !containerHeight) {
            boxWidths.current = Array.from({ length: finalCount }, () => 300)
            boxHeights.current = Array.from({ length: finalCount }, () => 200)
            return { finalCount, validContent }
        }
        
        // Calculate width and height once and use for all slides
        const dimensions = calculateSlideDimensions(containerWidth, containerHeight, validContent)
        const slideWidth = Math.max(dimensions.width, 50)
        const slideHeight = Math.max(dimensions.height, 50)
        
        // For fill modes, use the specified dimensions instead of calculated ones
        let finalWidth = slideWidth
        let finalHeight = slideHeight
        if (slidesUI.slideSizing?.mode === "fill-height") {
            finalWidth = slidesUI.slideSizing?.fixedWidth || 200
            finalHeight = containerHeight // Will be overridden by CSS to 100%
        } else if (slidesUI.slideSizing?.mode === "fill-width") {
            finalWidth = containerWidth // Will be overridden by CSS to 100%
            finalHeight = slidesUI.slideSizing?.fixedHeight || 300
        }
        
        // Generate same width and height for all slides - simpler and more stable
        boxWidths.current = Array.from({ length: finalCount }, () => finalWidth)
        boxHeights.current = Array.from({ length: finalCount }, () => finalHeight)
        
        console.log("Simplified slide generation:", {
            contentCount: validContent.length,
            totalSlides: finalCount,
            slideWidth,
            slideHeight,
            finalWidth,
            finalHeight,
            mode: slidesUI.slideSizing?.mode
        })
        
        return { finalCount, validContent }
    }, [calculateRequiredSlides, calculateSlideDimensions])

    // DYNAMIC FIX: Recalculate slides when container size changes
    const slideData = useMemo(() => {
        if (!containerReady) return { finalCount: 3, validContent: content }
        return generateSlideWidths()
    }, [containerReady, generateSlideWidths, content.length, containerDimensions.current.width, ui?.gap]) // Include container width and gap
    
    // Debug: Log the actual boxWidths being used (only when container is ready)
    if (containerReady && slideData.finalCount > 0) {
        console.log("Box widths being used:", boxWidths.current.slice(0, 3))
    }

    const boxes = Array.from({ length: slideData.finalCount }, (_, i) => {
        const { validContent, finalCount } = slideData
        const actualSlideCount = Math.max(validContent.length, 1)
        
        // NEW APPROACH: Cycle through content for each static slide
        const contentIndex = actualSlideCount > 0 ? i % actualSlideCount : 0
        
        // Content cycling for static slides
        
        // Get content for this slide with error handling
        let slideContent: React.ReactNode = null
        try {
            if (validContent.length > 0 && validContent[contentIndex]) {
                slideContent = makeComponentResponsive(validContent[contentIndex], `slide-${i}`)
            }
        } catch (error) {
            console.warn(`Error processing slide content at index ${contentIndex}:`, error)
            slideContent = null
        }

        // Generate different gray shades for each slide based on content index with validation
        const grayShade = actualSlideCount > 1 
            ? Math.floor((contentIndex / Math.max(actualSlideCount - 1, 1)) * 150) + 75 // Range from 75 to 225
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
                    // Dynamic height based on mode
                    height: slidesUI.slideSizing?.mode === "fill-height" 
                        ? "100%" // Fill height mode: use full height
                        : slidesUI.slideSizing?.mode === "fill-width" 
                            ? `${slidesUI.slideSizing?.fixedHeight || 300}px` // Fill width mode: use specified height
                        : slidesUI.slideSizing?.mode === "aspect-ratio"
                            ? `${boxHeights.current[i] || 200}px` // Aspect ratio mode: use calculated height
                            : "85%", // Other modes: use 85%
                    // Dynamic width based on mode
                    width: slidesUI.slideSizing?.mode === "fill-width"
                        ? "100%" // Fill width mode: use full width
                        : slidesUI.slideSizing?.mode === "fill-height"
                            ? `${slidesUI.slideSizing?.fixedWidth || 200}px` // Fill height mode: use specified width
                        : slidesUI.slideSizing?.mode === "aspect-ratio"
                            ? `${boxWidths.current[i] || 250}px` // Aspect ratio mode: use calculated width
                            : `${boxWidths.current[i] || 250}px`, // Other modes: use calculated width
                    minWidth: slidesUI.slideSizing?.mode === "fill-height" 
                        ? `${slidesUI.slideSizing?.fixedWidth || 200}px` // Use specified width as minimum
                        : "100px", // Other modes: use 100px minimum
                    maxWidth: "none", // Remove max-width constraint for fill-width mode
                    marginRight: `${Math.max(ui?.gap ?? 20, 0)}px`, // Ensure gap is non-negative
                    display: "flex", // Ensure slide container is flex
                    flexDirection: "column" as const,
                    position: "relative" as const,
                }}
            >
                <div
                    className="box__inner"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative" as const,
                        cursor: clickNavigation ? "pointer" : "default",
                        width: "100%",
                        height: "100%",
                        // Ensure no CSS aspect ratio interferes when mode is not "aspect-ratio"
                        aspectRatio: slidesUI.slideSizing?.mode === "aspect-ratio" ? undefined : "auto",
                        backgroundColor: slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)",
                        border: typeof slidesUI.allSlides.border === 'string' 
                            ? slidesUI.allSlides.border 
                            : slidesUI.allSlides.border 
                                ? `${slidesUI.allSlides.border.width || '1px'} ${slidesUI.allSlides.border.style || 'solid'} ${slidesUI.allSlides.border.color || 'rgba(0,0,0,0.2)'}`
                                : "1px solid rgba(0,0,0,0.2)",
                        borderRadius: slidesUI.allSlides.radius || "10px",
                        boxShadow: slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0,0)",
                        transform: `scale(${Math.max(slidesUI.allSlides.scale || 1, 0.1)})`, // Ensure scale is positive
                        opacity: Math.max(Math.min(slidesUI.allSlides.opacity || 1, 1), 0), // Clamp opacity between 0 and 1
                        fontSize: "clamp(16px, 4vw, 36px)", // Responsive font size
                        fontWeight: "medium",
                        color: "#3D3D3D",
                        textAlign: "center",
                        lineHeight: "1.2",
                        padding: "8px", // Small padding for better content spacing
                        overflow: "hidden", // Prevent content overflow
                    }}
                >
                    {slideContent || (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "inherit",
                            fontWeight: "inherit",
                            color: "inherit"
                        }}>
                            <p style={{ margin: 0 }}>{contentIndex + 1}</p>
                        </div>
                    )}
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
                overflow: "visible"
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
                                        ? `${buttonsUI.insetY ?? 20}px`
                                        : buttonsUI.verticalAlign === "bottom"
                                          ? "auto"
                                          : "50%",
                                bottom:
                                    buttonsUI.verticalAlign === "bottom"
                                        ? `${buttonsUI.insetY ?? 20}px`
                                        : "auto",
                                left:
                                    buttonsUI.horizontalAlign ===
                                    "space-between"
                                        ? `${buttonsUI.insetX ?? 20}px`
                                        : buttonsUI.horizontalAlign === "center"
                                          ? `calc(50% - ${buttonsUI.gap ?? 20}px)`
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
                                        ? `${buttonsUI.insetY ?? 20}px`
                                        : buttonsUI.verticalAlign === "bottom"
                                          ? "auto"
                                          : "50%",
                                bottom:
                                    buttonsUI.verticalAlign === "bottom"
                                        ? `${buttonsUI.insetY ?? 20}px`
                                        : "auto",
                                left: "auto",
                                right:
                                    buttonsUI.horizontalAlign ===
                                    "space-between"
                                        ? `${buttonsUI.insetX ?? 20}px`
                                        : buttonsUI.horizontalAlign === "center"
                                          ? `calc(50% - ${buttonsUI.gap ?? 20}px)`
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
                    overflowX: "hidden",
                    overflowY: "visible", 
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
                hidden: (props: any) => !props.enabled,
            },
            direction: {
                type: ControlType.Enum,
                title: "Direction",
                options: ["left", "right"],

                defaultValue: "right",
                displaySegmentedControl: true,
                hidden: (props: any) => !props.enabled,
                optionIcons: ["direction-left", "direction-right"],
            },
            throwAware: {
                type: ControlType.Enum,
                title: "On Throw",
                options: ["Follow", "No follow"],
                defaultValue: "No follow",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) => !props.enabled,
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
                        options: ["fill", "fill-width", "fill-height", "aspect-ratio", "fixed-dimensions"],
                        optionTitles: ["Fill", "Fill Width", "Fill Height", "Aspect Ratio", "Fixed Dimensions"],
                        defaultValue: "fill-width",
                        displaySegmentedControl: true,
                        segmentedControlDirection: "vertical",
                    },
                    aspectRatio: {
                        type: ControlType.Enum,
                        title: "Ratio",
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
                        hidden: (props: any) => props?.mode !== "fixed-dimensions" && props?.mode !== "fill-height",
                    },
                    fixedHeight: {
                        type: ControlType.Number,
                        title: "Height",
                        min: 100,
                        max: 600,
                        step: 10,
                        defaultValue: 200,
                        hidden: (props: any) => props?.mode !== "fixed-dimensions" && props?.mode !== "fill-width",
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
                hidden: (props: any) => props.central !== "Customize style",
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
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            horizontalAlign: {
                type: ControlType.Enum,
                title: "Horizontal",
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
                    props.horizontalAlign !== "center",
            },
            insetX: {
                type: ControlType.Number,
                title: "X Inset",
                min: -100,
                max: 100,
                step: 5,
                defaultValue: 20,
                hidden: (props: any) => props.horizontalAlign === "center",
            },
            insetY: {
                type: ControlType.Number,
                title: "Y Inset",
                min: -100,
                max: 100,
                step: 5,
                defaultValue: 20,
                hidden: (props: any) => props.verticalAlign === "center",
            },
        },
    },
    content: {
        type: ControlType.Array,
        title: "Content",
        maxCount: 10,
        control: {
            type: ControlType.ComponentInstance,
        },
    },
})

Carousel.displayName = "Adriano's Carousel"
