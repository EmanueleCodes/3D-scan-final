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
 * - Unified GSAP-only animation control
 * - Developed by @emanuelecodes for Adriano Reis
 * This component serves as a reference implementation for building similar
 * horizontal scrolling interfaces with GSAP and React.
 *
 * UNIFIED ANIMATION STRATEGY (GSAP-ONLY):
 * - ALL animations handled by GSAP for maximum control and consistency
 * - Single duration and easing control for all animations (animation.duration, animation.easing)
 * - Slide transitions, visual effects (scale, opacity, shadows), and dots all use same timing
 * - Consistent timing across all navigation methods: dots, click navigation, autoplay, and button controls
 * - No CSS transitions - everything is GSAP-powered for better performance and control
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react"
import {
    gsap,
    useGSAP,
    Draggable,
    InertiaPlugin,
    //@ts-ignore
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/clients-projects/carousel1.js"
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
         //@ts-ignore
        vars?: gsap.TweenVars
         //@ts-ignore
    ) => gsap.core.Tween | gsap.core.Timeline
    /** Get the index of the slide closest to the current timeline position */
    closestIndex: (setCurrent?: boolean) => number
    /** Get the current active slide index */
    current: () => number
    /** Navigate to the next slide */ //@ts-ignore
    next: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline
    /** Navigate to the previous slide */  //@ts-ignore
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
 * - Drag-to-scroll with momentum (configurable with fluid prop)
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
        disabledStyle: "none",
        disabledScale: 0.7,
        disabledOpacity: 0.3,
    },
    leftControl = null,
    rightControl = null,
    buttonsNavigation = true,
    finiteMode = false,
    fluid = true,
    threshold = 100,
    slideAlignment = "left",
    dotsUI = {
        enabled: false,
        size: 8,
        gap: 12,
        activeOpacity: 1,
        inactiveOpacity: 0.3,
        activeScale: 1.2,
        backgroundColor: "#000000",
        verticalAlign: "bottom",
        horizontalAlign: "center",
        insetX: 0,
        insetY: 20,
    },
    slidesUI = {
        central: "Same style",
        slideSizing: {
            mode: "fill-width",
            aspectRatio: "16:9",
            customAspectRatio: "16:9",
            aspectRatioFillPercentage: 100,
            fixedWidth: 300,
            fixedHeight: 200,
            relativeWidth: 80,
            relativeHeight: 60,
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
    animation = {
        duration: 0.4,
        easing: "power1.inOut",
        elasticAmplitude: 1,
        elasticPeriod: 0.3,
        backIntensity: 1.7,
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
        disabledStyle?: "none" | "styled"
        disabledScale?: number
        disabledOpacity?: number
    }
    leftControl?: React.ReactNode
    rightControl?: React.ReactNode
    buttonsNavigation?: boolean
    finiteMode?: boolean
    fluid?: boolean
    threshold?: number
    slideAlignment?: "left" | "center" | "right"
    dotsUI?: {
        enabled?: boolean
        size?: number
        gap?: number
        activeOpacity?: number
        inactiveOpacity?: number
        activeScale?: number
        backgroundColor?: string
        verticalAlign?: "top" | "center" | "bottom"
        horizontalAlign?: "left" | "center" | "right"
        insetX?: number
        insetY?: number
    }
    slidesUI?: {
        central: "Same style" | "Customize style"
        slideSizing?: {
            mode:
                | "fill"
                | "fill-width"
                | "fill-height"
                | "aspect-ratio"
                | "fixed-dimensions"
                | "relative-dimensions"
            aspectRatio?: "16:9" | "4:3" | "1:1" | "3:2" | "21:9" | "custom"
            customAspectRatio?: string
            aspectRatioFillPercentage?: number
            fixedWidth?: number
            fixedHeight?: number
            relativeWidth?: number
            relativeHeight?: number
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
    animation?: {
        duration?: number
        easing?: string
        elasticAmplitude?: number
        elasticPeriod?: number
        backIntensity?: number
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
    const [activeSlideIndex, setActiveSlideIndex] = useState(0) // Current slide index for dots
    const [containerReady, setContainerReady] = useState(false) // Track when container has proper dimensions
    const [isFullyInitialized, setIsFullyInitialized] = useState(false) // Track when all GSAP setup and centering is complete

    // Refs for tracking drag state without causing re-renders
    const isDraggingRef = useRef(false) // Track if user is currently dragging
    const isThrowingRef = useRef(false) // Track if throwing animation is active
    const dragStartMouseXRef = useRef(0) // Track where mouse drag started to determine direction
    const dragEndMouseXRef = useRef(0) // Track where mouse drag ended
    const currentAutoplayDirectionRef = useRef<"left" | "right">(
        autoplay.direction
    ) // Current autoplay direction

    /**
     * Construct easing string with parameters for elastic and back easing functions
     *
     * This function takes the base easing type and constructs the full easing string
     * with parameters for elastic and back easing functions.
     */
    const getEasingString = useCallback(
        (easing: string) => {
            if (easing.startsWith("elastic")) {
                const amplitude = animation.elasticAmplitude || 1
                const period = animation.elasticPeriod || 0.3
                return `${easing}(${amplitude},${period})`
            } else if (easing.startsWith("back")) {
                const intensity = animation.backIntensity || 1.7
                return `${easing}(${intensity})`
            }
            return easing
        },
        [
            animation.elasticAmplitude,
            animation.elasticPeriod,
            animation.backIntensity,
        ]
    )

    /**
     * Apply initial styling to all slides using gsap.set
     *
     * This function sets the initial visual state for all slides
     * immediately without animation, ensuring proper styling on first load.
     */
    const applyInitialStylingToAllSlides = useCallback(() => {
        boxesRef.current.forEach((slideElement, i) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Determine if this is the active/central slide
            let isCentralSlide = false

            if (finiteMode) {
                // In finite mode, use the activeSlideIndex state
                isCentralSlide = i === activeSlideIndex
            } else {
                // In infinite mode, also use the activeSlideIndex state for consistency
                isCentralSlide = i === activeSlideIndex
            }

            const isCentralCustomized = slidesUI.central === "Customize style"

            // Get the appropriate style values
            const targetScale =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.scale || 1.1
                    : slidesUI.allSlides.scale || 1

            const targetOpacity =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.opacity || 1
                    : slidesUI.allSlides.opacity || 1

            const targetBackgroundColor =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.backgroundColor || "rgba(0,0,0,0.1)"
                    : slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)"

            const targetBorder =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.border
                    : slidesUI.allSlides.border

            const targetRadius =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.radius || "10px"
                    : slidesUI.allSlides.radius || "10px"

            const targetShadow =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.shadow ||
                      "0px 0px 0px rgba(0,0,0,0)"
                    : slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0,0)"

            // Create border shadow effect
            let borderShadow = ""
            if (targetBorder && typeof targetBorder === "object") {
                const borderWidth = (targetBorder as any).borderWidth || "1px"
                const borderColor =
                    (targetBorder as any).borderColor || "rgba(0,0,0,0.2)"
                const widthValue =
                    typeof borderWidth === "string"
                        ? parseInt(borderWidth.replace("px", "")) || 1
                        : parseInt(String(borderWidth)) || 1
                borderShadow = `0 0 0 ${widthValue}px ${borderColor}`
            } else if (typeof targetBorder === "string") {
                const parts = targetBorder.split(" ")
                const width = parts[0] || "1px"
                const color = parts[2] || "rgba(0,0,0,0.2)"
                const widthValue = parseInt(width.replace("px", "")) || 1
                borderShadow = `0 0 0 ${widthValue}px ${color}`
            } else {
                borderShadow = "0 0 0 1px rgba(0,0,0,0.2)"
            }

            // Combine existing shadow with border shadow
            const finalShadow =
                targetShadow && targetShadow !== "0px 0px 0px rgba(0,0,0,0)"
                    ? `${borderShadow}, ${targetShadow}`
                    : borderShadow

            // Apply initial styling directly to DOM (immediate, no animation, can't be overridden)
            innerElement.style.transform = `scale(${targetScale})`
            innerElement.style.opacity = String(targetOpacity)
            innerElement.style.backgroundColor = targetBackgroundColor
            innerElement.style.boxShadow = finalShadow
            innerElement.style.borderRadius = targetRadius
            innerElement.style.transformOrigin = "center"

            // Also set with GSAP for consistency, but with immediate render
            gsap.set(innerElement, {
                scale: targetScale,
                opacity: targetOpacity,
                backgroundColor: targetBackgroundColor,
                boxShadow: finalShadow,
                borderRadius: targetRadius,
                transformOrigin: "center",
                immediateRender: true,
                duration: 0, // Force immediate
            })
        })
    }, [slidesUI, finiteMode, activeSlideIndex])

    /**
     * Apply initial central slide styling using gsap.set
     *
     * This function sets the initial visual state for the central slide
     * immediately without animation, ensuring proper styling on first load.
     */
    const applyInitialCentralSlideStyling = useCallback(
        (slideElement: HTMLElement) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Get the appropriate style values for central slide
            const isCentralCustomized = slidesUI.central === "Customize style"
            const targetScale = isCentralCustomized
                ? slidesUI.centralSlide.scale || 1.1
                : slidesUI.allSlides.scale || 1.1
            const targetOpacity = isCentralCustomized
                ? slidesUI.centralSlide.opacity || 1
                : slidesUI.allSlides.opacity || 1
            const targetBackgroundColor = isCentralCustomized
                ? slidesUI.centralSlide.backgroundColor || "rgba(0,0,0,0.1)"
                : slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)"
            const targetBorder = isCentralCustomized
                ? slidesUI.centralSlide.border
                : slidesUI.allSlides.border
            const targetRadius = isCentralCustomized
                ? slidesUI.centralSlide.radius || "10px"
                : slidesUI.allSlides.radius || "10px"
            const targetShadow = isCentralCustomized
                ? slidesUI.centralSlide.shadow || "0px 0px 0px rgba(0,0,0,0)"
                : slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0,0)"

            // Create border shadow effect
            let borderShadow = ""
            if (targetBorder && typeof targetBorder === "object") {
                const borderWidth = (targetBorder as any).borderWidth || "1px"
                const borderColor =
                    (targetBorder as any).borderColor || "rgba(0,0,0,0.2)"
                const widthValue =
                    typeof borderWidth === "string"
                        ? parseInt(borderWidth.replace("px", "")) || 1
                        : parseInt(String(borderWidth)) || 1
                borderShadow = `0 0 0 ${widthValue}px ${borderColor}`
            } else if (typeof targetBorder === "string") {
                const parts = targetBorder.split(" ")
                const width = parts[0] || "1px"
                const color = parts[2] || "rgba(0,0,0,0.2)"
                const widthValue = parseInt(width.replace("px", "")) || 1
                borderShadow = `0 0 0 ${widthValue}px ${color}`
            } else {
                borderShadow = "0 0 0 1px rgba(0,0,0,0.2)"
            }

            // Combine existing shadow with border shadow
            const finalShadow =
                targetShadow && targetShadow !== "0px 0px 0px rgba(0,0,0,0)"
                    ? `${borderShadow}, ${targetShadow}`
                    : borderShadow

            gsap.set(innerElement, {
                scale: targetScale,
                opacity: targetOpacity,
                backgroundColor: targetBackgroundColor,
                boxShadow: finalShadow,
                borderRadius: targetRadius,
                transformOrigin: "center",
                immediateRender: true,
            })
        },
        [slidesUI]
    )

    /**
     * Animate slide visual properties using GSAP
     *
     * This function handles all visual effects (scale, opacity, shadows, etc.)
     * using GSAP for consistent timing and better performance.
     */
    const animateSlideVisuals = useCallback(
        (slideElement: HTMLElement, isActive: boolean) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Get the appropriate style values based on whether it's active and central slide customization
            const isCentralCustomized = slidesUI.central === "Customize style"
            const targetScale = isActive
                ? isCentralCustomized
                    ? slidesUI.centralSlide.scale || 1.1
                    : slidesUI.allSlides.scale || 1.1
                : slidesUI.allSlides.scale || 1

            const targetOpacity = isActive
                ? isCentralCustomized
                    ? slidesUI.centralSlide.opacity || 1
                    : slidesUI.allSlides.opacity || 1
                : slidesUI.allSlides.opacity || 1

            const targetBackgroundColor = isActive
                ? isCentralCustomized
                    ? slidesUI.centralSlide.backgroundColor || "rgba(0,0,0,0.1)"
                    : slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)"
                : slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)"

            const targetBorder = isActive
                ? isCentralCustomized
                    ? slidesUI.centralSlide.border
                    : slidesUI.allSlides.border
                : slidesUI.allSlides.border

            // Get existing shadow
            const existingShadow = isActive
                ? isCentralCustomized
                    ? slidesUI.centralSlide.shadow ||
                      "0px 0px 0px rgba(0,0,0,0)"
                    : slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0)"
                : slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0)"

            // Create border shadow effect
            let borderShadow = ""
            if (targetBorder && typeof targetBorder === "object") {
                const borderWidth = (targetBorder as any).borderWidth || "1px"
                const borderColor =
                    (targetBorder as any).borderColor || "rgba(0,0,0,0.2)"
                // Handle both string and number borderWidth values
                const widthValue =
                    typeof borderWidth === "string"
                        ? parseInt(borderWidth.replace("px", "")) || 1
                        : parseInt(String(borderWidth)) || 1
                borderShadow = `0 0 0 ${widthValue}px ${borderColor}`
            } else if (typeof targetBorder === "string") {
                const parts = targetBorder.split(" ")
                const width = parts[0] || "1px"
                const color = parts[2] || "rgba(0,0,0,0.2)"
                const widthValue = parseInt(width.replace("px", "")) || 1
                borderShadow = `0 0 0 ${widthValue}px ${color}`
            } else {
                borderShadow = "0 0 0 1px rgba(0,0,0,0.2)"
            }

            // Combine existing shadow with border shadow
            const targetShadow =
                existingShadow && existingShadow !== "0px 0px 0px rgba(0,0,0,0)"
                    ? `${borderShadow}, ${existingShadow}`
                    : borderShadow

            const targetRadius = isActive
                ? isCentralCustomized
                    ? slidesUI.centralSlide.radius || "10px"
                    : slidesUI.allSlides.radius || "10px"
                : slidesUI.allSlides.radius || "10px"

            // During initial setup, use gsap.set() for immediate styling
            if (isInitialSetupRef.current) {
                gsap.set(innerElement, {
                    scale: targetScale,
                    opacity: targetOpacity,
                    backgroundColor: targetBackgroundColor,
                    boxShadow: targetShadow,
                    borderRadius: targetRadius,
                    transformOrigin: "center",
                    immediateRender: true,
                })
            } else {
                // Kill any existing animations on this element to prevent conflicts
                gsap.killTweensOf(innerElement)

                // For subsequent animations, use gsap.to() with user timing
                gsap.to(innerElement, {
                    scale: targetScale,
                    opacity: targetOpacity,
                    backgroundColor: targetBackgroundColor,
                    boxShadow: targetShadow,
                    borderRadius: targetRadius,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                    transformOrigin: "center",
                    overwrite: true, // Overwrite any existing animations on this element
                })
            }
        },
        [slidesUI, animation.duration, animation.easing, getEasingString]
    )

    /**
     * Animate dots using GSAP
     *
     * This function handles dot animations (scale, opacity) using GSAP
     * for consistent timing with slide transitions.
     */
    const animateDots = useCallback(
        (activeIndex: number) => {
            const dots = document.querySelectorAll("[data-dot-index]")
            dots.forEach((dot, index) => {
                const isActive = index === activeIndex
                const targetScale = isActive ? dotsUI.activeScale || 1.2 : 1
                const targetOpacity = isActive
                    ? dotsUI.activeOpacity || 1
                    : dotsUI.inactiveOpacity || 0.3

                gsap.to(dot, {
                    scale: targetScale,
                    opacity: targetOpacity,
                    duration: (animation.duration || 0.4) * 0.6, // Slightly faster than slide transitions
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            })
        },
        [dotsUI, animation.duration, animation.easing, getEasingString]
    )

    /**
     * Apply initial styling to navigation buttons using gsap.set
     *
     * This function sets the initial visual state for buttons
     * immediately without animation, ensuring proper styling on first load.
     */
    const applyInitialButtonStyling = useCallback(() => {
        const leftButton = document.querySelector(
            '[data-button="prev"]'
        ) as HTMLElement
        const rightButton = document.querySelector(
            '[data-button="next"]'
        ) as HTMLElement

        if (leftButton) {
            // In finite mode, first slide means prev button is disabled
            const isPrevDisabled = finiteMode && activeSlideIndex === 0

            if (isPrevDisabled) {
                // Set disabled state immediately
                gsap.set(leftButton, {
                    scale: buttonsUI.disabledScale ?? 1,
                    opacity: buttonsUI.disabledOpacity ?? 0,
                    immediateRender: true,
                    duration: 0,
                })
            } else {
                // Set enabled state immediately
                gsap.set(leftButton, {
                    scale: 1,
                    opacity: 1,
                    immediateRender: true,
                    duration: 0,
                })
            }
        }

        if (rightButton) {
            // In finite mode, check if next button should be disabled
            // Use boxesRef.current.length since slideData might not be initialized yet
            const totalSlides = boxesRef.current.length || 1
            const isNextDisabled =
                finiteMode && activeSlideIndex === totalSlides - 1

            if (isNextDisabled) {
                // Set disabled state immediately
                gsap.set(rightButton, {
                    scale: buttonsUI.disabledScale ?? 1,
                    opacity: buttonsUI.disabledOpacity ?? 0,
                    immediateRender: true,
                    duration: 0,
                })
            } else {
                // Set enabled state immediately
                gsap.set(rightButton, {
                    scale: 1,
                    opacity: 1,
                    immediateRender: true,
                    duration: 0,
                })
            }
        }
    }, [
        finiteMode,
        activeSlideIndex,
        buttonsUI.disabledScale,
        buttonsUI.disabledOpacity,
        boxesRef,
    ])

    // Animation function for navigation buttons
    const animateButtons = useCallback(
        (isPrevDisabled: boolean, isNextDisabled: boolean) => {
            const leftButton = document.querySelector(
                '[data-button="prev"]'
            ) as HTMLElement
            const rightButton = document.querySelector(
                '[data-button="next"]'
            ) as HTMLElement

            if (leftButton) {
                if (isPrevDisabled) {
                    // For disabled buttons, animate to disabled state with user timing
                    const disabledOpacity = buttonsUI.disabledOpacity ?? 0

                    gsap.to(leftButton, {
                        scale: buttonsUI.disabledScale ?? 1,
                        opacity: disabledOpacity,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                } else {
                    gsap.to(leftButton, {
                        scale: 1,
                        opacity: 1,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                }
            }

            if (rightButton) {
                if (isNextDisabled) {
                    // For disabled buttons, animate to disabled state with user timing
                    gsap.to(rightButton, {
                        scale: buttonsUI.disabledScale ?? 1,
                        opacity: buttonsUI.disabledOpacity ?? 0,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                } else {
                    // For enabled buttons, animate to enabled state
                    gsap.to(rightButton, {
                        scale: 1,
                        opacity: 1,
                        duration: animation.duration || 0.4,
                        ease: getEasingString(
                            animation.easing || "power1.inOut"
                        ),
                    })
                }
            }
        },
        [
            animation.duration,
            animation.easing,
            getEasingString,
            buttonsUI.disabledScale,
            buttonsUI.disabledOpacity,
        ]
    )

    /**
     * Make a component responsive by cloning it with updated styles
     *
     * This function takes a React component and makes it fill the available space
     * while preserving its internal styling and functionality with proper type safety.
     */
    const makeComponentResponsive = useCallback(
        (component: React.ReactNode, key: string | number) => {
            // Handle non-React elements safely
            if (!React.isValidElement(component)) {
                return component
            }

            try {
                // Safely extract existing styles
                const existingStyle =
                    component.props &&
                    typeof component.props === "object" &&
                    "style" in component.props
                        ? (component.props.style as React.CSSProperties) || {}
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
                return component
            }
        },
        []
    )

    /**
     * Calculate dots positioning based on alignment settings
     */
    const calculateDotsPosition = useCallback(() => {
        if (!dotsUI.enabled || !finiteMode) return { display: "none" }

        const containerWidth = containerDimensions.current.width
        const containerHeight = containerDimensions.current.height

        if (containerWidth === 0 || containerHeight === 0)
            return { display: "none" }

        // Calculate vertical position
        let top = "auto"
        let bottom = "auto"
        let transform = "translateY(0)"

        if (dotsUI.verticalAlign === "top") {
            top = `${dotsUI.insetY || 0}px`
        } else if (dotsUI.verticalAlign === "bottom") {
            bottom = `${dotsUI.insetY || 0}px`
        } else if (dotsUI.verticalAlign === "center") {
            top = "50%"
            transform = "translateY(-50%)"
        }

        // Calculate horizontal position
        let left = "auto"
        let right = "auto"
        let justifyContent = "center"

        if (dotsUI.horizontalAlign === "left") {
            left = `${dotsUI.insetX || 0}px`
            justifyContent = "flex-start"
        } else if (dotsUI.horizontalAlign === "right") {
            right = `${dotsUI.insetX || 0}px`
            justifyContent = "flex-end"
        } else if (dotsUI.horizontalAlign === "center") {
            left = "50%"
            transform =
                transform === "translateY(-50%)"
                    ? "translate(-50%, -50%)"
                    : "translateX(-50%)"
            justifyContent = "center"
        }

        return {
            position: "absolute" as const,
            top,
            bottom,
            left,
            right,
            transform,
            display: "flex",
            gap: `${dotsUI.gap || 12}px`,
            justifyContent,
            alignItems: "center",
            zIndex: 100,
        }
    }, [
        dotsUI,
        finiteMode,
        containerDimensions.current.width,
        containerDimensions.current.height,
    ])

    /**
     * Calculate slide dimensions based on sizing mode with proper validation and responsive behavior
     */
    const calculateSlideDimensions = useCallback(
        (
            containerWidth: number,
            containerHeight: number,
            validContent?: React.ReactNode[]
        ) => {
            // CRITICAL: Don't calculate dimensions if container has no size yet
            // This prevents the flash of small slides during initial render
            if (
                !containerWidth ||
                !containerHeight ||
                containerWidth === 0 ||
                containerHeight === 0
            ) {
                // Use reasonable fallback dimensions that work well in canvas
                const fallbackWidth = 400
                const fallbackHeight = 300

                return {
                    width: fallbackWidth,
                    height: fallbackHeight,
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
                        slidesToShow = Math.max(
                            1,
                            Math.floor(
                                safeContainerWidth / (minSlideWidth + gap)
                            )
                        )
                        const adjustedTotalGapWidth = gap * (slidesToShow - 1)
                        const adjustedAvailableWidth =
                            safeContainerWidth - adjustedTotalGapWidth
                        const adjustedSlideWidth =
                            adjustedAvailableWidth / slidesToShow
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
                    const aspectRatio =
                        slidesUI.slideSizing?.aspectRatio || "16:9"
                    let ratio = 16 / 9 // default

                    if (aspectRatio === "4:3") ratio = 4 / 3
                    else if (aspectRatio === "1:1") ratio = 1
                    else if (aspectRatio === "3:2") ratio = 3 / 2
                    else if (aspectRatio === "21:9") ratio = 21 / 9
                    else if (aspectRatio === "custom") {
                        const customRatio =
                            slidesUI.slideSizing?.customAspectRatio || "16:9"
                        try {
                            const [w, h] = customRatio.split(":").map(Number)
                            if (w > 0 && h > 0) {
                                ratio = w / h
                            }
                        } catch {
                            ratio = 16 / 9 // Fallback to default if custom ratio is invalid
                        }
                    }

                    // NEW LOGIC: Fill the smaller dimension to user-specified percentage, calculate the other based on aspect ratio
                    // Use full container dimensions (not safe dimensions with minimums)
                    const containerAspectRatio =
                        containerWidth / containerHeight
                    const slideAspectRatio = ratio
                    const fillPercentage =
                        (slidesUI.slideSizing?.aspectRatioFillPercentage ||
                            100) / 100

                    let aspectSlideWidth: number
                    let aspectSlideHeight: number

                    if (containerAspectRatio > slideAspectRatio) {
                        // Container is wider than slide aspect ratio
                        // Fill height to user-specified percentage, calculate width based on aspect ratio
                        aspectSlideHeight = containerHeight * fillPercentage // Fill percentage of container height
                        aspectSlideWidth = aspectSlideHeight * slideAspectRatio
                    } else {
                        // Container is taller than slide aspect ratio
                        // Fill width to user-specified percentage, calculate height based on aspect ratio
                        aspectSlideWidth = containerWidth * fillPercentage // Fill percentage of container width
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

                case "relative-dimensions":
                    const relativeWidth =
                        (slidesUI.slideSizing?.relativeWidth || 80) / 100
                    const relativeHeight =
                        (slidesUI.slideSizing?.relativeHeight || 60) / 100

                    return {
                        width: containerWidth * relativeWidth,
                        height: containerHeight * relativeHeight,
                        objectFit: "cover" as const,
                    }

                case "fixed-dimensions":
                    const fixedWidth = slidesUI.slideSizing?.fixedWidth || 300
                    const fixedHeight = slidesUI.slideSizing?.fixedHeight || 200

                    // Use exact dimensions from property controls
                    return {
                        width: fixedWidth,
                        height: fixedHeight,
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
        },
        [slidesUI.slideSizing, finiteMode]
    )

    /**
     * Creates a finite timeline animation using GSAP
     *
     * This function creates a simple horizontal timeline without infinite loop.
     * Slides move from first to last without duplication.
     *
     * @param {HTMLElement[]} items - Array of DOM elements to animate
     * @param {LoopConfig} config - Configuration object for the timeline
     * @returns {HorizontalLoopTimeline|null} - GSAP timeline with custom methods, or null if no items
     */
    function createFiniteTimeline(
        items: HTMLElement[],
        config: LoopConfig,
        alignment: "left" | "center" | "right" = "left"
    ): HorizontalLoopTimeline | null {
        // Early return if no items provided
        if (!items.length) return null

        // Extract configuration values with defaults
        const onChange = config.onChange
        let lastIndex = 0 // Track the last active index to detect changes

        // Create a simple timeline
        const tl = gsap.timeline({ paused: true }) as any

        // Calculate total width and positions
        const containerWidth = items[0]?.parentElement?.offsetWidth || 0
        const totalWidth = items.reduce((sum, item, i) => {
            const width = item.offsetWidth
            const gap = i < items.length - 1 ? config.gap || 0 : 0
            return sum + width + gap
        }, 0)

        // Position slides horizontally - start with slide 0 in active position
        // Use the same calculation as toIndex but with slide 0 as the active slide
        items.forEach((item, i) => {
            // Calculate where slide i should be when slide 0 is active
            // This is the same as toIndex(0) but for each individual slide
            let initialX = -(i - 0) * (item.offsetWidth + (config.gap || 0))

            if (alignment === "center") {
                // Center slide 0 within the container
                const containerWidth = items[0]?.parentElement?.offsetWidth || 0
                const slideWidth = items[0].offsetWidth
                initialX += (containerWidth - slideWidth) / 2
            } else if (alignment === "right") {
                // Align slide 0 to the right edge
                const containerWidth = items[0]?.parentElement?.offsetWidth || 0
                const slideWidth = items[0].offsetWidth
                initialX += containerWidth - slideWidth
            }

            gsap.set(item, { x: initialX })
        })

        // Initial positioning is now handled above, no need for duplicate timeline animations

        // Add custom methods to match HorizontalLoopTimeline interface
        tl.toIndex = (index: number, options?: any) => {
            if (index >= 0 && index < items.length) {
                // Calculate target position based on alignment
                let targetX =
                    -index * (items[0].offsetWidth + (config.gap || 0))

                if (alignment === "center") {
                    // Center the active slide within the container
                    const containerWidth =
                        items[0]?.parentElement?.offsetWidth || 0
                    const slideWidth = items[0].offsetWidth
                    targetX += (containerWidth - slideWidth) / 2
                } else if (alignment === "right") {
                    // Align the active slide to the right edge
                    const containerWidth =
                        items[0]?.parentElement?.offsetWidth || 0
                    const slideWidth = items[0].offsetWidth
                    targetX += containerWidth - slideWidth
                }
                // For "left" alignment, targetX remains as calculated

                const tween = gsap.to(items, {
                    x: targetX,
                    duration: options?.duration || animation.duration,
                    ease:
                        options?.ease ||
                        getEasingString(animation.easing || "power1.inOut"),
                })

                // Update lastIndex to track current position
                lastIndex = index

                // Update active element
                if (onChange && items[index]) {
                    onChange(items[index], index)
                }

                return tween
            }

            return tl
        }

        tl.closestIndex = () => {
            // Find the slide closest to center
            const containerWidth = items[0]?.parentElement?.offsetWidth || 0
            const centerX = containerWidth / 2
            let closestIndex = 0
            let minDistance = Infinity

            items.forEach((item, i) => {
                const itemX = gsap.getProperty(item, "x") as number
                const itemCenter = itemX + item.offsetWidth / 2
                const distance = Math.abs(itemCenter - centerX)

                if (distance < minDistance) {
                    minDistance = distance
                    closestIndex = i
                }
            })

            return closestIndex
        }

        tl.current = () => lastIndex
        tl.next = () => {
            const nextIndex = Math.min(lastIndex + 1, items.length - 1)

            return tl.toIndex(nextIndex)
        }
        tl.previous = () => {
            const prevIndex = Math.max(lastIndex - 1, 0)

            return tl.toIndex(prevIndex)
        }

        // Set up draggable if enabled (but disable in finite mode with click navigation to prevent conflicts)
        if (config.draggable && !(finiteMode && clickNavigation)) {
            const draggableInstance = Draggable.create(items, {
                type: "x",
                bounds: {
                    minX: -(
                        totalWidth - (items[0]?.parentElement?.offsetWidth || 0)
                    ),
                    maxX: 0,
                },
                inertia: true,
                // Prevent draggable from interfering with click navigation
                allowEventDefault: false,
                onPress: function () {
                    // Only allow dragging if it's not a click (check for movement)
                    this.allowDrag = false
                },
                onDragStart: function () {
                    // Only start dragging if there's actual movement
                    if (Math.abs(this.getVelocity("x")) > 0.1) {
                        this.allowDrag = true
                    }
                },
                onDrag: function () {
                    if (!this.allowDrag) return
                    // Update active element during drag
                    const closestIndex = tl.closestIndex()
                    if (closestIndex !== lastIndex) {
                        lastIndex = closestIndex
                        if (onChange && items[closestIndex]) {
                            onChange(items[closestIndex], closestIndex)
                        }
                    }
                },
            })[0]

            if (draggableInstance) {
                tl.draggable = draggableInstance
            }
        }

        // Center the first slide on initial load if in center alignment mode
        if (alignment === "center") {
            // Use a small delay to ensure container dimensions are available
            setTimeout(() => {
                const containerWidth = items[0]?.parentElement?.offsetWidth || 0
                const slideWidth = items[0].offsetWidth
                if (containerWidth > 0 && slideWidth > 0) {
                    const centerOffset = (containerWidth - slideWidth) / 2
                    gsap.set(items, { x: centerOffset })
                }
            }, 10)
        } else if (alignment === "right") {
            // Right align the first slide on initial load
            setTimeout(() => {
                const containerWidth = items[0]?.parentElement?.offsetWidth || 0
                const slideWidth = items[0].offsetWidth
                if (containerWidth > 0 && slideWidth > 0) {
                    const rightOffset = containerWidth - slideWidth
                    gsap.set(items, { x: rightOffset })
                }
            }, 10)
        }

        // Fallback click handler for when draggable is disabled but click navigation is enabled
        if (
            (!config.draggable || (finiteMode && clickNavigation)) &&
            clickNavigation
        ) {
            items.forEach((item, index) => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation()
                    try {
                        stopAutoplay() // Stop autoplay when user clicks

                        // Use the same simple pattern as buttons navigation
                        // Just call toIndex directly, let onChange handle the visual updates
                        tl.toIndex(index, {
                            duration: animation.duration,
                            ease: getEasingString(
                                animation.easing || "power1.inOut"
                            ),
                        })

                        // Restart autoplay after user interaction
                        if (autoplay.enabled) {
                            setTimeout(startAutoplay, 10)
                        }
                    } catch (error) {}
                })
            })
        }

        return tl
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
            return (
                items[length - 1].offsetLeft +
                (xPercents[length - 1] / 100) * widths[length - 1] -
                startX +
                spaceBefore[0] +
                items[length - 1].offsetWidth *
                    (gsap.getProperty(items[length - 1], "scaleX") as number) +
                gap +
                (parseFloat(String(config.paddingRight)) || 0)
            )
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
                    const gsapWidth = gsap.getProperty(
                        el,
                        "width",
                        "px"
                    ) as string
                    const computedWidth = parseFloat(gsapWidth)

                    // Use computed style as fallback if GSAP can't measure
                    if (isNaN(computedWidth) || computedWidth <= 0) {
                        const computedStyle = window.getComputedStyle(el)
                        const fallbackWidth = parseFloat(computedStyle.width)
                        widths[i] = isNaN(fallbackWidth) ? 250 : fallbackWidth // 250px as last resort
                    } else {
                        widths[i] = computedWidth
                    }

                    // Calculate X position as percentage of width for responsive positioning
                    const gsapX = gsap.getProperty(el, "x", "px") as string
                    const gsapXPercent = gsap.getProperty(
                        el,
                        "xPercent"
                    ) as number
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

                    // Update b1 for next iteration (still needed for some calculations)
                    b2 = el.getBoundingClientRect()
                    b1 = b2
                } catch (error) {
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
            } catch (error) {}

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
                distanceToStart =
                    item.offsetLeft + curX - startX + spaceBefore[0]

                // For infinite loop, add gap after last slide to ensure proper spacing
                const gap = (config as any).gap ?? 0
                const isLastSlide = i === length - 1
                distanceToLoop =
                    distanceToStart +
                    widths[i] * (gsap.getProperty(item, "scaleX") as number) +
                    (isLastSlide ? gap : 0)

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

         //@ts-ignore
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
        //@ts-ignore
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
         //@ts-ignore
        tl.next = (vars?: gsap.TweenVars) => {
            const currentIndex = tl.current()
            return toIndex(currentIndex + 1, vars)
        }
         //@ts-ignore
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
                const newProgress =
                    startProgress + (draggable.startX - draggable.x) * ratio

                tl.progress(wrap(newProgress))
            }
            const syncIndex = () => {
                // Only sync index if we actually dragged
                if (draggable && draggable.allowDrag) {
                    return tl.closestIndex(true)
                } else {
                    return tl.current()
                }
            }

            // Check if mouse is inside carousel area
            const isMouseInsideCarousel = (
                clientX: number,
                clientY: number
            ) => {
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
                if (
                    isMouseInsideCarousel(e.clientX, e.clientY) &&
                    !isDragActive
                ) {
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
            document.addEventListener("mousedown", handleGlobalMouseDown)
            document.addEventListener("mouseup", handleGlobalMouseUp)
            document.addEventListener("mousemove", handleGlobalMouseMove)

            draggable = Draggable.create(proxy, {
                trigger: null, // Disable GSAP's built-in trigger system
                type: "x",
                // Prevent draggable from interfering with clicks
                allowEventDefault: false,
                onPress() {
                    // Store the initial mouse position for click detection
                    this.pressX = this.pointerX || this.startX || 0
                    this.pressY = this.pointerY || this.startY || 0
                    this.isClick = true // Assume it's a click until proven otherwise
                    this.allowDrag = false // Start with drag disabled
                },
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

                    // Store actual mouse coordinates for direction detection
                    dragStartMouseXRef.current =
                        this.pointerX || this.startX || 0
                    
                    // Store starting index for non-fluid mode
                    this.startIndex = tl.closestIndex ? tl.closestIndex() : 0
                    
                    stopAutoplay()
                },
                onDragStart() {
                    // Don't enable dragging yet - wait for actual movement
                },
                onDrag: function () {
                    // Check if this is the first movement - enable dragging if so
                    if (!this.allowDrag && this.isClick) {
                        const currentX = this.pointerX || this.x || 0
                        const currentY = this.pointerY || this.y || 0
                        const hasMoved =
                            Math.abs(currentX - (this.pressX || 0)) > 5 ||
                            Math.abs(currentY - (this.pressY || 0)) > 5

                        if (hasMoved) {
                            this.isClick = false
                            this.allowDrag = true
                            isDraggingRef.current = true
                        }
                    }

                    if (!this.allowDrag) {
                        return
                    }

                    if (!fluid) {
                        // NON-FLUID MODE: Check threshold and navigate immediately
                        const dragDistance = startProgress / -ratio - this.x
                        
                        // Calculate smart threshold based on card width
                        const cardWidth = items[0]?.offsetWidth || 300
                        const maxThreshold = cardWidth / 2 // Maximum is half card width
                        const smartThreshold = Math.min(threshold, maxThreshold)
                        
                        if (Math.abs(dragDistance) > smartThreshold) {
                            // Determine target slide based on direction
                            const startIndex = this.startIndex !== undefined ? this.startIndex : (tl.closestIndex ? tl.closestIndex() : 0)
                            const targetIndex = dragDistance > 0 
                                ? (startIndex + 1) % length  // Next slide
                                : (startIndex - 1 + length) % length  // Previous slide
                            
                            // Navigate to target slide immediately
                            try {
                                stopAutoplay() // Stop autoplay when user drags
                                tl.toIndex(targetIndex, {
                                    duration: animation.duration,
                                    ease: getEasingString(animation.easing || "power1.inOut"),
                                })
                                
                                // Restart autoplay after user interaction
                                if (autoplay.enabled) {
                                    setTimeout(startAutoplay, 10)
                                }
                                
                                // Stop drag detection - we've navigated
                                this.allowDrag = false
                                isDraggingRef.current = false
                                return
                            } catch (error) {}
                        } else {
                            // Still within threshold - allow cursor following
                            align()
                        }
                    } else {
                        // FLUID MODE: Original behavior - natural cursor following
                        align()
                    }
                    
                    // Track current mouse position for direction detection
                    dragEndMouseXRef.current = this.pointerX || this.x || 0
                },
                onThrowUpdate: function () {
                    // Allow throwing if we have a genuine drag (allowDrag is true) and fluid mode is enabled
                    if (this.allowDrag && fluid) {
                        align()
                    } else if (!fluid) {
                        // NON-FLUID MODE: Prevent any throwing updates - keep at current position
                        // This ensures the manual release logic takes full control
                    }
                },
                overshootTolerance: 0,
                inertia: fluid, // Only use inertia in fluid mode
                /**
                 * max
                 */
                maxDuration: fluid ? 4 * (1.1 - dragFactor) : 0, // No max duration for non-fluid mode
                snap: fluid ? function(this: any, value: number) {
                    // FLUID MODE: Original snap behavior
                    if (Math.abs(startProgress / -ratio - this.x) < 10) {
                        return lastSnap + initChangeX
                    }

                    // INFINITE MODE: Snap logic with wrapping for seamless infinite scrolling
                    const time = -(value * ratio) * tl.duration()
                    const wrappedTime = timeWrap(time)
                    const snapTime = times[getClosest(times, wrappedTime, tl.duration())]
                    let dif = snapTime - wrappedTime
                    Math.abs(dif) > tl.duration() / 2 &&
                        (dif += dif < 0 ? tl.duration() : -tl.duration())
                    lastSnap = (time + dif) / tl.duration() / -ratio
                    return lastSnap
                } : false, // NON-FLUID MODE: No snapping - let cursor follow directly
                onRelease() {
                    if (this.isClick) {
                        if (clickNavigation) {
                            // This was a click with click nav enabled - trigger navigation
                            const clickedElement = document.elementFromPoint(
                                this.pressX,
                                this.pressY
                            )
                            if (clickedElement) {
                                // Find which slide was clicked
                                const slideElement =
                                    clickedElement.closest(".box")
                                if (slideElement) {
                                    const slideIndex = Array.from(
                                        boxesRef.current
                                    ).indexOf(slideElement as HTMLDivElement)
                                    if (
                                        slideIndex !== -1 &&
                                        loopRef.current &&
                                        loopRef.current.toIndex
                                    ) {
                                        // Use the same simple pattern as buttons navigation
                                        try {
                                            stopAutoplay() // Stop autoplay when user clicks

                                            // Just call toIndex directly, let onChange handle the visual updates
                                            loopRef.current.toIndex(
                                                slideIndex,
                                                {
                                                    duration:
                                                        animation.duration,
                                                    ease: getEasingString(
                                                        animation.easing ||
                                                            "power1.inOut"
                                                    ),
                                                }
                                            )

                                            // Restart autoplay after user interaction
                                            if (autoplay.enabled) {
                                                setTimeout(startAutoplay, 10)
                                            }
                                        } catch (error) {}
                                    }
                                }
                            }
                        } else {
                            // This was just a click with click nav disabled - ignore completely
                        }

                        // Reset state for clicks
                        isDraggingRef.current = false
                        isThrowingRef.current = false

                        // Resume autoplay if it was playing before
                        if (wasPlaying) {
                            tl.play()
                        }

                        // Restart autoplay if enabled
                        if (autoplay.enabled) {
                            setTimeout(startAutoplay, 10)
                        }

                        // Reset for next interaction immediately for clicks
                        this.isClick = true
                        this.allowDrag = false
                    } else if (this.allowDrag) {
                        // This was a real drag
                        isDraggingRef.current = false

                        if (!fluid) {
                            // NON-FLUID MODE: If we reach release, it means we didn't exceed threshold during drag
                            // Just snap back to the starting slide
                            const startIndex = this.startIndex !== undefined ? this.startIndex : (tl.closestIndex ? tl.closestIndex() : 0)
                            
                            try {
                                tl.toIndex(startIndex, {
                                    duration: animation.duration,
                                    ease: getEasingString(animation.easing || "power1.inOut"),
                                })
                            } catch (error) {}
                        } else {
                            // FLUID MODE: Original behavior
                            syncIndex()
                            
                            // Update autoplay direction based on drag direction if throwAware is enabled
                            if (autoplay.throwAware === "Follow") {
                                const mouseDistance =
                                    dragEndMouseXRef.current -
                                    dragStartMouseXRef.current
                                currentAutoplayDirectionRef.current =
                                    mouseDistance > 0 ? "left" : "right"
                            }
                        }

                        // Check if throwing animation will start (only in fluid mode)
                        if (fluid && draggable.isThrowing) {
                            isThrowingRef.current = true
                            indexIsDirty = true

                            // Update styling immediately when throw starts
                            try {
                                const currentIndex = tl.closestIndex
                                    ? tl.closestIndex()
                                    : 0
                                const currentElement =
                                    boxesRef.current[currentIndex]

                                if (currentElement) {
                                    // Update React state immediately
                                    setActiveElement(currentElement)
                                    setActiveSlideIndex(currentIndex)

                                    // Note: Visual updates will be handled by the onChange callback
                                    // when the slide actually changes, preventing animation conflicts
                                }
                            } catch (error) {}
                        }
                    } else {
                        // This was a click but click nav is enabled - let the click handler deal with it
                        isDraggingRef.current = false
                        isThrowingRef.current = false

                        // Reset for next interaction immediately for clicks
                        this.isClick = true
                        this.allowDrag = false
                    }

                    // For drags, don't reset until throwing is complete
                    if (this.allowDrag && !draggable.isThrowing) {
                        // No throwing animation, reset now
                        this.isClick = true
                        this.allowDrag = false
                    }
                },
                onThrowComplete: () => {
                    syncIndex()
                    isThrowingRef.current = false // Throwing animation completed
                    wasPlaying && tl.play()

                    // Reset for next interaction after throwing completes
                    if (draggable) {
                        draggable.isClick = true
                        draggable.allowDrag = false
                    }

                    // Restart autoplay after throwing completes
                    if (autoplay.enabled) {
                        setTimeout(startAutoplay, 10) // Restart after 1 second delay
                    }
                },
            })[0]
            tl.draggable = draggable

            // Store cleanup function for global event listeners
            ;(tl as any).cleanupGlobalDrag = () => {
                document.removeEventListener("mousedown", handleGlobalMouseDown)
                document.removeEventListener("mouseup", handleGlobalMouseUp)
                document.removeEventListener("mousemove", handleGlobalMouseMove)
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
        }

        // Update current index after centering
        tl.closestIndex(true)
        lastIndex = curIndex
        onChange && onChange(items[curIndex], curIndex)

        // Store cleanup function for later use
        ;(tl as any).cleanup = () => {
            window.removeEventListener("resize", onResize)
            // Clean up global drag event listeners if they exist
            if ((tl as any).cleanupGlobalDrag) {
                ;(tl as any).cleanupGlobalDrag()
            }
        }

        // Fallback click handler for when draggable is disabled but click navigation is enabled
        if (
            (!config.draggable || (finiteMode && clickNavigation)) &&
            clickNavigation
        ) {
            items.forEach((item, index) => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation()
                    try {
                        stopAutoplay() // Stop autoplay when user clicks

                        // Use the same simple pattern as buttons navigation
                        // Just call toIndex directly, let onChange handle the visual updates
                        tl.toIndex(index, {
                            duration: animation.duration,
                            ease: getEasingString(
                                animation.easing || "power1.inOut"
                            ),
                        })

                        // Restart autoplay after user interaction
                        if (autoplay.enabled) {
                            setTimeout(startAutoplay, 10)
                        }
                    } catch (error) {}
                })
            })
        }

        return tl
    }

    // Add initialization state to prevent race conditions
    const initializationRef = useRef({
        isInitializing: false,
        isInitialized: false,
    })
    const isInitialSetupRef = useRef(true) // Track if we're in initial setup phase

    // Fallback timeout to ensure component shows up even if initialization fails
    useEffect(() => {
        const fallbackTimeout = setTimeout(() => {
            if (!isFullyInitialized) {
                setIsFullyInitialized(true)
            }
        }, 2000) // 2 second fallback

        return () => clearTimeout(fallbackTimeout)
    }, [isFullyInitialized])

    // Update slide visuals when slidesUI props change
    useEffect(() => {
        if (!isFullyInitialized || !boxesRef.current) return

        // Update all slides with new styling
        boxesRef.current.forEach((slideElement, i) => {
            if (!slideElement) return

            const innerElement = slideElement.querySelector(
                ".box__inner"
            ) as HTMLElement
            if (!innerElement) return

            // Determine if this is the active/central slide
            let isCentralSlide = false

            if (finiteMode) {
                isCentralSlide = i === activeSlideIndex
            } else {
                // In infinite mode, also use the activeSlideIndex state for consistency
                isCentralSlide = i === activeSlideIndex
            }

            const isCentralCustomized = slidesUI.central === "Customize style"

            // Get the appropriate style values
            const targetScale =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.scale || 1.1
                    : slidesUI.allSlides.scale || 1

            const targetOpacity =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.opacity || 1
                    : slidesUI.allSlides.opacity || 1

            const targetBackgroundColor =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.backgroundColor || "rgba(0,0,0,0.1)"
                    : slidesUI.allSlides.backgroundColor || "rgba(0,0,0,0.1)"

            const targetBorder =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.border
                    : slidesUI.allSlides.border

            const targetRadius =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.radius || "10px"
                    : slidesUI.allSlides.radius || "10px"

            const targetShadow =
                isCentralSlide && isCentralCustomized
                    ? slidesUI.centralSlide.shadow ||
                      "0px 0px 0px rgba(0,0,0,0)"
                    : slidesUI.allSlides.shadow || "0px 0px 0px rgba(0,0,0,0)"

            // Create border shadow effect
            let borderShadow = ""
            if (targetBorder && typeof targetBorder === "object") {
                const borderWidth = (targetBorder as any).borderWidth || "1px"
                const borderColor =
                    (targetBorder as any).borderColor || "rgba(0,0,0,0.2)"
                const widthValue =
                    typeof borderWidth === "string"
                        ? parseInt(borderWidth.replace("px", "")) || 1
                        : parseInt(String(borderWidth)) || 1
                borderShadow = `0 0 0 ${widthValue}px ${borderColor}`
            } else if (typeof targetBorder === "string") {
                const parts = targetBorder.split(" ")
                const width = parts[0] || "1px"
                const color = parts[2] || "rgba(0,0,0,0.2)"
                const widthValue = parseInt(width.replace("px", "")) || 1
                borderShadow = `0 0 0 ${widthValue}px ${color}`
            } else {
                borderShadow = "0 0 0 1px rgba(0,0,0,0.2)"
            }

            // Combine existing shadow with border shadow
            const finalShadow =
                targetShadow && targetShadow !== "0px 0px 0px rgba(0,0,0,0)"
                    ? `${borderShadow}, ${targetShadow}`
                    : borderShadow

            // Apply styling with smooth animation
            gsap.to(innerElement, {
                scale: targetScale,
                opacity: targetOpacity,
                backgroundColor: targetBackgroundColor,
                boxShadow: finalShadow,
                borderRadius: targetRadius,
                duration: animation.duration || 0.4,
                ease: getEasingString(animation.easing || "power1.inOut"),
            })
        })
    }, [
        slidesUI,
        finiteMode,
        activeSlideIndex,
        animation.duration,
        animation.easing,
        isFullyInitialized,
        getEasingString,
    ])

    // Update button visuals when buttonsUI props change
    useEffect(() => {
        if (!isFullyInitialized) return

        const leftButton = document.querySelector(
            '[data-button="prev"]'
        ) as HTMLElement
        const rightButton = document.querySelector(
            '[data-button="next"]'
        ) as HTMLElement

        if (leftButton) {
            const isPrevDisabled = finiteMode && activeSlideIndex === 0

            if (isPrevDisabled) {
                gsap.to(leftButton, {
                    scale: buttonsUI.disabledScale ?? 1,
                    opacity: buttonsUI.disabledOpacity ?? 0,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            } else {
                gsap.to(leftButton, {
                    scale: 1,
                    opacity: 1,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
        }

        if (rightButton) {
            const totalSlides = boxesRef.current.length || 1
            const isNextDisabled =
                finiteMode && activeSlideIndex === totalSlides - 1

            if (isNextDisabled) {
                gsap.to(rightButton, {
                    scale: buttonsUI.disabledScale ?? 1,
                    opacity: buttonsUI.disabledOpacity ?? 0,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            } else {
                gsap.to(rightButton, {
                    scale: 1,
                    opacity: 1,
                    duration: animation.duration || 0.4,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
        }
    }, [
        buttonsUI,
        finiteMode,
        activeSlideIndex,
        animation.duration,
        animation.easing,
        isFullyInitialized,
        getEasingString,
    ])

    // Update dots when dotsUI props change
    useEffect(() => {
        if (!isFullyInitialized || !finiteMode || !dotsUI.enabled) return
        animateDots(activeSlideIndex)
    }, [dotsUI, activeSlideIndex, isFullyInitialized, animateDots])

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
            if (
                initializationRef.current.isInitializing ||
                initializationRef.current.isInitialized
            ) {
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
                    // Retry after a short delay
                    setTimeout(() => {
                        const retrySlides = boxesRef.current.filter(Boolean)
                        if (retrySlides.length >= slideData.finalCount) {
                            // Re-run the initialization logic here
                        } else {
                        }
                    }, 100)
                    return
                }

                // FIX: Ensure all elements are in the DOM before passing to GSAP
                const validSlides = allSlides.filter((slide) => {
                    const isInDOM = document.contains(slide)
                    const isVisible =
                        window.getComputedStyle(slide).display !== "none"
                    return isInDOM && isVisible
                })

                // Validate that we have slides and container
                if (validSlides.length === 0 || !wrapperRef.current) {
                    return
                }

                // Ensure container has dimensions - single check with fallback
                const containerRect = wrapperRef.current.getBoundingClientRect()
                if (containerRect.width === 0 || containerRect.height === 0) {
                    // Use fallback dimensions instead of retrying
                    containerDimensions.current = { width: 600, height: 400 }
                } else {
                    containerDimensions.current = {
                        width: containerRect.width,
                        height: containerRect.height,
                    }
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

                // FIX: Add delay to ensure all 6 slides are rendered
                setTimeout(() => {
                    // Re-check all slides after delay
                    const allSlidesAfterDelay = boxesRef.current.filter(Boolean)

                    if (allSlidesAfterDelay.length < slideData.finalCount) {
                        return
                    }

                    const finalValidSlides = allSlidesAfterDelay.filter(
                        (slide) => {
                            const isInDOM = document.contains(slide)
                            const isVisible =
                                window.getComputedStyle(slide).display !==
                                "none"
                            return isInDOM && isVisible
                        }
                    )

                    if (finalValidSlides.length === 0) {
                        return
                    }

                    try {
                        // Use different GSAP logic for finite vs infinite modes
                        let loop: HorizontalLoopTimeline | null = null

                        if (finiteMode) {
                            // Finite mode: create a simple timeline without infinite loop

                            loop = createFiniteTimeline(
                                finalValidSlides,
                                {
                                    paused: true,
                                    draggable: draggable,
                                    center: wrapperRef.current || true,
                                    gap: currentGap,
                                    onChange: (
                                        element: HTMLElement,
                                        index: number
                                    ) => {
                                        // Debounce onChange to prevent excessive state updates
                                        requestAnimationFrame(() => {
                                            try {
                                                // Update React state when active slide changes
                                                setActiveElement(element)
                                                setActiveSlideIndex(index)

                                                // Animate all slides with GSAP (skip during initial setup)
                                                if (
                                                    !isInitialSetupRef.current
                                                ) {
                                                    boxesRef.current.forEach(
                                                        (box, i) => {
                                                            if (box) {
                                                                const isActive =
                                                                    box ===
                                                                    element
                                                                animateSlideVisuals(
                                                                    box,
                                                                    isActive
                                                                )
                                                            }
                                                        }
                                                    )
                                                }

                                                // Animate dots if in finite mode
                                                if (
                                                    finiteMode &&
                                                    dotsUI.enabled
                                                ) {
                                                    animateDots(index)
                                                }

                                                // Animate buttons based on disabled state
                                                if (
                                                    finiteMode &&
                                                    buttonsNavigation
                                                ) {
                                                    const isPrevDisabled =
                                                        index === 0
                                                    const isNextDisabled =
                                                        index ===
                                                        (slideData?.actualSlideCount ||
                                                            1) -
                                                            1
                                                    animateButtons(
                                                        isPrevDisabled,
                                                        isNextDisabled
                                                    )
                                                }
                                            } catch (error) {}
                                        })
                                    },
                                },
                                slideAlignment
                            )
                        } else {
                            // Infinite mode: use horizontal loop
                            loop = createHorizontalLoop(finalValidSlides, {
                                paused: true,
                                draggable: draggable, // Use the property control value
                                center: wrapperRef.current || true, // Pass the wrapper element for proper centering
                                gap: currentGap, // Pass the gap value for proper loop calculations
                                onChange: (
                                    element: HTMLElement,
                                    index: number
                                ) => {
                                    // Debounce onChange to prevent excessive state updates
                                    requestAnimationFrame(() => {
                                        try {
                                            // Update React state when active slide changes
                                            setActiveElement(element)
                                            setActiveSlideIndex(index)

                                            // Animate all slides with GSAP (skip during initial setup)
                                            if (!isInitialSetupRef.current) {
                                                boxesRef.current.forEach(
                                                    (box, i) => {
                                                        if (box) {
                                                            const isActive =
                                                                box === element
                                                            animateSlideVisuals(
                                                                box,
                                                                isActive
                                                            )
                                                        }
                                                    }
                                                )
                                            }

                                            // Animate dots if in finite mode
                                            if (finiteMode && dotsUI.enabled) {
                                                animateDots(index)
                                            }
                                        } catch (error) {}
                                    })
                                },
                            })
                        }

                        if (loop) {
                            loopRef.current = loop
                            initializationRef.current.isInitialized = true

                            // Click navigation is now handled through the draggable system

                            // Initialize autoplay direction
                            currentAutoplayDirectionRef.current =
                                autoplay.direction

                            // Start autoplay if enabled
                            if (autoplay.enabled) {
                                startAutoplay()
                            }

                            // Initialize visual states for all slides and dots
                            setTimeout(() => {
                                // Apply initial styling to ALL slides immediately (no animation)
                                applyInitialStylingToAllSlides()

                                // Apply initial styling to buttons immediately (no animation)
                                if (finiteMode && buttonsNavigation) {
                                    applyInitialButtonStyling()
                                }

                                // Note: We don't need to call animateSlideVisuals here anymore
                                // because applyInitialStylingToAllSlides handles all the initial styling
                                // The slides will animate normally during navigation

                                // Set initial visual state for dots if in finite mode
                                if (finiteMode && dotsUI.enabled) {
                                    animateDots(0) // First dot is active by default
                                }
                            }, 100) // Small delay to ensure DOM is ready

                            // CENTERING FIX: Ensure centering happens after everything is set up
                            // Use a small delay to ensure DOM is fully ready
                            setTimeout(() => {
                                if (
                                    loop &&
                                    loop.times &&
                                    loop.times.length > 0
                                ) {
                                    // Calculate the middle index for dynamic number of slides
                                    // Center on the middle slide for proper initial display
                                    const middleIndex = Math.floor(
                                        loop.times.length / 2
                                    )
                                    const centerTime =
                                        loop.times[middleIndex] || loop.times[0]

                                    // Force refresh and re-center using the loop reference
                                    if ((loop as any).refresh) {
                                        ;(loop as any).refresh(true)
                                    }

                                    // Set timeline to center position
                                    if (loop.time) {
                                        loop.time(centerTime, true)
                                    }

                                    if (loop.closestIndex) {
                                        loop.closestIndex(true)
                                    }
                                }

                                // Mark as fully initialized after all centering is complete

                                setIsFullyInitialized(true)

                                // Allow animations for subsequent interactions
                                isInitialSetupRef.current = false
                            }, 100)

                            // Return cleanup function - useGSAP will handle this automatically
                            return () => {
                                cancelAnimationFrame(initFrame)
                                initializationRef.current.isInitializing = false
                                initializationRef.current.isInitialized = false
                                stopAutoplay() // Stop autoplay on cleanup

                                // Click handlers are now handled by React, no cleanup needed

                                // Call the timeline's cleanup function
                                if ((loop as any).cleanup) {
                                    try {
                                        ;(loop as any).cleanup()
                                    } catch (error) {}
                                }
                            }
                        }
                    } catch (error) {
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
            dependencies: [
                dragFactor,
                draggable,
                clickNavigation,
                content.length,
                ui?.gap,
                autoplay.enabled,
                autoplay.direction,
                slidesUI.slideSizing?.mode,
                containerReady,
            ],
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
                        // Store current index before navigation
                        const currentIndex = loopRef.current.current
                            ? loopRef.current.current()
                            : 0

                        // Use current direction for autoplay
                        if (currentAutoplayDirectionRef.current === "right") {
                            if (loopRef.current.next) {
                                const nextResult = loopRef.current.next({
                                    duration: animation.duration,
                                    ease: getEasingString(
                                        animation.easing || "power1.inOut"
                                    ),
                                })

                                // In finite mode, check if we actually moved to the next slide
                                if (finiteMode) {
                                    // Small delay to let the animation start, then check if we're still at the same index
                                    setTimeout(() => {
                                        const newIndex = loopRef.current
                                            ?.current
                                            ? loopRef.current.current()
                                            : 0

                                        if (newIndex === currentIndex) {
                                            // We didn't move, which means we're at the end
                                            // Reverse direction for next iteration
                                            currentAutoplayDirectionRef.current =
                                                "left"
                                        }
                                    }, 50)
                                }
                            }
                        } else if (
                            currentAutoplayDirectionRef.current === "left"
                        ) {
                            if (loopRef.current.previous) {
                                const prevResult = loopRef.current.previous({
                                    duration: animation.duration,
                                    ease: getEasingString(
                                        animation.easing || "power1.inOut"
                                    ),
                                })

                                // In finite mode, check if we actually moved to the previous slide
                                if (finiteMode) {
                                    // Small delay to let the animation start, then check if we're still at the same index
                                    setTimeout(() => {
                                        const newIndex = loopRef.current
                                            ?.current
                                            ? loopRef.current.current()
                                            : 0

                                        if (newIndex === currentIndex) {
                                            // We didn't move, which means we're at the beginning
                                            // Reverse direction for next iteration
                                            currentAutoplayDirectionRef.current =
                                                "right"
                                        }
                                    }, 50)
                                }
                            }
                        }
                    }
                } catch (error) {
                    stopAutoplay() // Stop autoplay if there's an error
                }
            }, duration * 1000) // Convert seconds to milliseconds
        } catch (error) {}
    }

    const stopAutoplay = () => {
        try {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current)
                autoplayTimerRef.current = null
            }
        } catch (error) {}
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
                loopRef.current.next({
                    duration: animation.duration,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
            // Restart autoplay after user interaction
            if (autoplay.enabled) {
                setTimeout(startAutoplay, 10) // Restart after delay
            }
        } catch (error) {}
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
                loopRef.current.previous({
                    duration: animation.duration,
                    ease: getEasingString(animation.easing || "power1.inOut"),
                })
            }
            // Restart autoplay after user interaction
            if (autoplay.enabled) {
                setTimeout(startAutoplay, 10) // Restart after delay
            }
        } catch (error) {}
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
    const handleResize = useCallback(
        (entries: ResizeObserverEntry[]) => {
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
                    if (
                        Math.abs(width - prevWidth) > 20 ||
                        Math.abs(height - prevHeight) > 20
                    ) {
                        // STABILITY FIX: Don't clear widths during resize - recalculate instead
                        const wasPlaying =
                            loopRef.current && !loopRef.current.paused()

                        // Pause animations during resize to prevent conflicts
                        if (loopRef.current && wasPlaying) {
                            loopRef.current.pause()
                        }

                        containerDimensions.current = { width, height }

                        // Recalculate slide widths without clearing the array
                        if (content.length > 0) {
                            const dimensions = calculateSlideDimensions(
                                width,
                                height,
                                content
                            )
                            const slideWidth = Math.max(dimensions.width, 50)
                            boxWidths.current = boxWidths.current.map(
                                () => slideWidth
                            )
                        }

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
        },
        [calculateSlideDimensions, content]
    )

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
                containerDimensions.current = {
                    width: rect.width,
                    height: rect.height,
                }
            } else {
                // Use fallback dimensions if measurement fails
                containerDimensions.current = { width: 600, height: 400 }
            }
        } catch (error) {
            // Fallback to window resize for older browsers
            const handleWindowResize = () => {
                if (wrapperRef.current) {
                    const rect = wrapperRef.current.getBoundingClientRect()
                    if (rect.width > 0 && rect.height > 0) {
                        containerDimensions.current = {
                            width: rect.width,
                            height: rect.height,
                        }
                    }
                }
            }
            window.addEventListener("resize", handleWindowResize)

            return () => {
                window.removeEventListener("resize", handleWindowResize)
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
        const validContent = Array.isArray(content)
            ? content.filter((item) => item != null)
            : []
        const actualSlideCount = finiteMode
            ? Math.max(validContent.length, 1) // Finite mode: use actual content count
            : Math.max(validContent.length, 3) // Infinite modes: minimum 3 for infinite loop

        // DYNAMIC APPROACH: Calculate slides needed to fill container
        const containerWidth = containerDimensions.current.width
        const gap = Math.max(ui?.gap ?? 20, 0)

        if (containerWidth > 0) {
            // Calculate how many slides we need to fill the container
            // For finite mode, just use the actual slide count
            // For infinite modes, we need at least 2x the content for infinite loop
            const minSlides = finiteMode
                ? actualSlideCount // Finite mode: just the actual slides
                : actualSlideCount * 2 // Infinite modes: minimum for infinite loop

            // Calculate slide width (use first slide width if available, otherwise estimate)
            // For very short slides, we need a better estimation strategy
            let estimatedSlideWidth = boxWidths.current[0] || 300

            // If we have very short slides, ensure minimum width for proper filling
            if (estimatedSlideWidth < 100) {
                // For very short slides, estimate based on container and content count
                const minSlideWidth = Math.max(150, containerWidth / 8) // At least 150px or 1/8 of container
                estimatedSlideWidth = Math.max(
                    estimatedSlideWidth,
                    minSlideWidth
                )
            }

            const slideWidthWithGap = estimatedSlideWidth + gap

            // Calculate how many slides we need to fill the container with some overflow
            const slidesNeeded = finiteMode
                ? actualSlideCount // Finite mode: just use actual slides
                : Math.ceil((containerWidth * 1.5) / slideWidthWithGap) // 1.5x for smooth scrolling

            // CRITICAL FIX: Ensure finalCount is always a multiple of actualSlideCount
            // This ensures proper content cycling and infinite loop behavior
            const rawFinalCount = Math.max(minSlides, slidesNeeded)
            const finalCount = finiteMode
                ? rawFinalCount // Finite mode: use exact count
                : Math.ceil(rawFinalCount / actualSlideCount) * actualSlideCount // Infinite modes: ensure multiples

            // SAFETY CHECK: Ensure we have enough slides for very wide containers
            // For very wide containers, we might need more than 1.5x to ensure smooth scrolling
            const minSlidesForWideContainer =
                Math.ceil(containerWidth / slideWidthWithGap) + actualSlideCount
            const finalCountWithSafety = Math.max(
                finalCount,
                minSlidesForWideContainer
            )
            const finalFinalCount = finiteMode
                ? finalCount // Finite mode: use exact count (no safety check)
                : Math.ceil(finalCountWithSafety / actualSlideCount) *
                  actualSlideCount // Infinite modes: ensure multiples

            return {
                finalCount: finalFinalCount,
                actualSlideCount,
                validContent,
            }
        } else {
            // Fallback: use minimum slides if container width not available
            const finalCount = actualSlideCount * 2
            return { finalCount, actualSlideCount, validContent }
        }
    }, [content, finiteMode, ui?.gap])

    /**
     * Generate stable slide widths - SIMPLIFIED
     */
    const generateSlideWidths = useCallback(() => {
        const { finalCount, actualSlideCount, validContent } =
            calculateRequiredSlides()

        // Use current container dimensions
        const containerWidth = containerDimensions.current.width
        const containerHeight = containerDimensions.current.height

        // If container not ready, use fallback for canvas/preview mode
        if (!containerWidth || !containerHeight) {
            // Use reasonable fallback dimensions that work well in canvas
            const fallbackWidth = 400
            const fallbackHeight = 300
            // Ensure we have at least 6 slides for canvas mode to show the carousel properly
            const canvasFinalCount = Math.max(finalCount, 6)
            boxWidths.current = Array.from(
                { length: canvasFinalCount },
                () => fallbackWidth
            )
            boxHeights.current = Array.from(
                { length: canvasFinalCount },
                () => fallbackHeight
            )
            return {
                finalCount: canvasFinalCount,
                actualSlideCount,
                validContent,
            }
        }

        // Calculate width and height once and use for all slides
        const dimensions = calculateSlideDimensions(
            containerWidth,
            containerHeight,
            validContent
        )
        const slideWidth = Math.max(dimensions.width, 50)
        const slideHeight = Math.max(dimensions.height, 50)

        // For fill modes and fixed dimensions, use the specified dimensions instead of calculated ones
        let finalWidth = slideWidth
        let finalHeight = slideHeight
        if (slidesUI.slideSizing?.mode === "fill-height") {
            finalWidth = slidesUI.slideSizing?.fixedWidth || 200
            finalHeight = containerHeight // Will be overridden by CSS to 100%
        } else if (slidesUI.slideSizing?.mode === "fill-width") {
            finalWidth = containerWidth // Will be overridden by CSS to 100%
            finalHeight = slidesUI.slideSizing?.fixedHeight || 300
        } else if (slidesUI.slideSizing?.mode === "fixed-dimensions") {
            finalWidth = slidesUI.slideSizing?.fixedWidth || 300
            finalHeight = slidesUI.slideSizing?.fixedHeight || 200
        }

        // Generate same width and height for all slides - simpler and more stable
        boxWidths.current = Array.from({ length: finalCount }, () => finalWidth)
        boxHeights.current = Array.from(
            { length: finalCount },
            () => finalHeight
        )

        return { finalCount, actualSlideCount, validContent }
    }, [calculateRequiredSlides, calculateSlideDimensions])

    // DYNAMIC FIX: Recalculate slides when container size changes
    const slideData = useMemo(() => {
        // Always generate slides, even in canvas mode when container isn't ready
        return generateSlideWidths()
    }, [
        generateSlideWidths,
        content.length,
        containerDimensions.current.width,
        ui?.gap,
    ]) // Include container width and gap

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
                slideContent = makeComponentResponsive(
                    validContent[contentIndex],
                    `slide-${i}`
                )
            }
        } catch (error) {
            slideContent = null
        }

        // Generate different gray shades for each slide based on content index with validation
        const grayShade =
            actualSlideCount > 1
                ? Math.floor(
                      (contentIndex / Math.max(actualSlideCount - 1, 1)) * 150
                  ) + 75 // Range from 75 to 225
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
                // Click navigation is now handled through the draggable system
                style={{
                    zIndex: 1, // Ensure slides stay below arrows (zIndex: 21)
                    flexShrink: 0,
                    // Dynamic height based on mode
                    height:
                        slidesUI.slideSizing?.mode === "fill-height"
                            ? "100%" // Fill height mode: use full height
                            : slidesUI.slideSizing?.mode === "fill-width"
                              ? `${slidesUI.slideSizing?.fixedHeight || 300}px` // Fill width mode: use specified height
                              : slidesUI.slideSizing?.mode === "aspect-ratio"
                                ? `${boxHeights.current[i] || 300}px` // Aspect ratio mode: use calculated height
                                : slidesUI.slideSizing?.mode ===
                                    "fixed-dimensions"
                                  ? `${slidesUI.slideSizing?.fixedHeight || 200}px` // Fixed dimensions mode: use exact height
                                  : slidesUI.slideSizing?.mode ===
                                      "relative-dimensions"
                                    ? `${boxHeights.current[i] || 300}px` // Relative dimensions mode: use calculated height
                                    : "85%", // Other modes: use 85%
                    // Dynamic width based on mode
                    width:
                        slidesUI.slideSizing?.mode === "fill-width"
                            ? "100%" // Fill width mode: use full width
                            : slidesUI.slideSizing?.mode === "fill-height"
                              ? `${slidesUI.slideSizing?.fixedWidth || 200}px` // Fill height mode: use specified width
                              : slidesUI.slideSizing?.mode === "aspect-ratio"
                                ? `${boxWidths.current[i] || 400}px` // Aspect ratio mode: use calculated width
                                : slidesUI.slideSizing?.mode ===
                                    "fixed-dimensions"
                                  ? `${slidesUI.slideSizing?.fixedWidth || 300}px` // Fixed dimensions mode: use exact width
                                  : slidesUI.slideSizing?.mode ===
                                      "relative-dimensions"
                                    ? `${boxWidths.current[i] || 400}px` // Relative dimensions mode: use calculated width
                                    : `${boxWidths.current[i] || 400}px`, // Other modes: use calculated width
                    minWidth:
                        slidesUI.slideSizing?.mode === "fill-height"
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
                        aspectRatio:
                            slidesUI.slideSizing?.mode === "aspect-ratio"
                                ? undefined
                                : "auto",
                        backgroundColor:
                            i === activeSlideIndex
                                ? slidesUI.centralSlide?.backgroundColor ||
                                  slidesUI.allSlides.backgroundColor ||
                                  "rgba(0,0,0,0.1)"
                                : slidesUI.allSlides.backgroundColor ||
                                  "rgba(0,0,0,0.1)",
                        border: "none", // Remove regular border
                        borderRadius: "10px", // Default value - GSAP will animate this
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.2)", // Default value - GSAP will animate this
                        transform: `scale(${Math.max(
                            i === activeSlideIndex
                                ? slidesUI.centralSlide?.scale ||
                                      slidesUI.allSlides.scale ||
                                      1
                                : slidesUI.allSlides.scale || 1,
                            0.1
                        )})`, // Ensure scale is positive
                        opacity: Math.max(
                            Math.min(
                                i === activeSlideIndex
                                    ? slidesUI.centralSlide?.opacity ||
                                          slidesUI.allSlides.opacity ||
                                          1
                                    : slidesUI.allSlides.opacity || 1,
                                1
                            ),
                            0
                        ), // Clamp opacity between 0 and 1
                        fontSize: "clamp(16px, 4vw, 36px)", // Responsive font size
                        fontWeight: "medium",
                        overflow: "hidden",
                        color: "#3D3D3D",
                        textAlign: "center",
                        lineHeight: "1.2",
                    }}
                >
                    {slideContent || (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "inherit",
                                fontWeight: "inherit",
                                color: "inherit",
                            }}
                        >
                            <p style={{ margin: 0 }}>{contentIndex + 1}</p>
                        </div>
                    )}
                </div>
            </div>
        )
    })

    /**
     * Main Component Render
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
                boxShadow: ui?.shadow,
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
                position: "relative",
                zIndex: 0,
                // Hide until fully initialized to prevent layout shifts
                opacity: isFullyInitialized ? 1 : 0,
                visibility: isFullyInitialized ? "visible" : "hidden",
                // No transition - instant reveal once logic is complete
            }}
        >
            {/* Loading indicator - only visible while initializing */}
            {!isFullyInitialized && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        opacity: 0.8,
                        fontSize: "14px",
                    }}
                >
                    <div
                        style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderTop: "2px solid white",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                        }}
                    />
                    Initializing...
                </div>
            )}

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            {/* GSAP will handle all animations - no CSS transitions needed */}

            {/* Navigation Buttons - Absolutely Positioned */}
            {buttonsNavigation && (
                <>
                    {/* Previous Button */}
                    {leftControl && (
                        <div
                            data-button="prev"
                            style={{
                                zIndex: 9999,
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

                                cursor:
                                    finiteMode && activeSlideIndex === 0
                                        ? "default"
                                        : "pointer",
                            }}
                            onClick={
                                finiteMode && activeSlideIndex === 0
                                    ? undefined
                                    : (e) => {
                                          e.stopPropagation()
                                          handlePrev()
                                      }
                            }
                        >
                            {leftControl}
                        </div>
                    )}

                    {/* Next Button */}
                    {rightControl && (
                        <div
                            data-button="next"
                            style={{
                                zIndex: 9999,
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

                                cursor:
                                    finiteMode &&
                                    activeSlideIndex ===
                                        (slideData?.actualSlideCount || 1) - 1
                                        ? "default"
                                        : "pointer",
                            }}
                            onClick={
                                finiteMode &&
                                activeSlideIndex ===
                                    (slideData?.actualSlideCount || 1) - 1
                                    ? undefined
                                    : (e) => {
                                          e.stopPropagation()
                                          handleNext()
                                      }
                            }
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
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        overflow: "hidden",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "row" as const,
                        flexWrap: "nowrap" as const,
                        isolation: "isolate", // Create a new stacking context to contain transforms
                        zIndex: 1, // Ensure this container stays below arrows
                        // Add small margin to accommodate scaled content without affecting GSAP calculations
                        margin: "0% 0",
                        // Gap is handled by margin-right on each slide for consistent infinite loop spacing
                    }}
                >
                    {boxes}
                </div>
            </div>

            {/* Dots Navigation - Only show in finite mode when enabled */}
            {finiteMode && dotsUI.enabled && (
                <div style={calculateDotsPosition()}>
                    {Array.from(
                        { length: slideData?.actualSlideCount || 0 },
                        (_, index) => (
                            <button
                                key={index}
                                data-dot-index={index}
                                onClick={() => {
                                    if (
                                        loopRef.current &&
                                        loopRef.current.toIndex
                                    ) {
                                        loopRef.current.toIndex(index, {
                                            duration: animation.duration,
                                            ease: getEasingString(
                                                animation.easing ||
                                                    "power1.inOut"
                                            ),
                                        })
                                    }
                                }}
                                style={{
                                    width: `${dotsUI.size || 8}px`,
                                    height: `${dotsUI.size || 8}px`,
                                    borderRadius: "50%",
                                    border: "none",
                                    backgroundColor:
                                        dotsUI.backgroundColor || "#000000",
                                    cursor: "pointer",
                                    padding: 0,
                                    margin: 0,
                                    // Initial state - GSAP will animate from here
                                    opacity:
                                        index === activeSlideIndex
                                            ? dotsUI.activeOpacity || 1
                                            : dotsUI.inactiveOpacity || 0,
                                    transform:
                                        index === activeSlideIndex
                                            ? `scale(${dotsUI.activeScale || 1.2})`
                                            : "scale(1)",
                                }}
                            />
                        )
                    )}
                </div>
            )}
        </div>
    )
}

addPropertyControls(Carousel, {
    finiteMode: {
        type: ControlType.Boolean,
        title: "Finite Mode",
        defaultValue: false,
    },
    slideAlignment: {
        type: ControlType.Enum,
        title: "Alignment",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
        defaultValue: "left",
        description: "How slides align within the carousel container",
    },
    dotsUI: {
        type: ControlType.Object,
        title: "Dots",
        hidden: (props: any) => !props.finiteMode,
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: false,
            },
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 4,
                max: 20,
                step: 1,
                defaultValue: 8,

                hidden: (props: any) => !props.enabled,
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 4,
                max: 30,
                step: 1,
                defaultValue: 12,

                hidden: (props: any) => !props.enabled,
            },
            activeOpacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0.1,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                description: "Active dot opacity",
                hidden: (props: any) => !props.enabled,
            },
            inactiveOpacity: {
                type: ControlType.Number,
                title: "Inactive",
                min: 0.1,
                max: 1,
                step: 0.1,
                defaultValue: 0.3,
                description: "Inactive dot opacity",
                hidden: (props: any) => !props.enabled,
            },
            activeScale: {
                type: ControlType.Number,
                title: "Active Scale",
                min: 0.5,
                max: 2,
                step: 0.1,
                defaultValue: 1.2,
                hidden: (props: any) => !props.enabled,
            },
            backgroundColor: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#000000",
                hidden: (props: any) => !props.enabled,
            },
            verticalAlign: {
                type: ControlType.Enum,
                title: "Vertical",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "bottom",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) => !props.enabled,
            },
            horizontalAlign: {
                type: ControlType.Enum,
                title: "Horizontal",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                defaultValue: "center",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props: any) => !props.enabled,
            },
            insetX: {
                type: ControlType.Number,
                title: "X Inset",
                min: -100,
                max: 100,
                step: 1,
                defaultValue: 0,

                hidden: (props: any) =>
                    !props.enabled || props.horizontalAlign === "center",
            },
            insetY: {
                type: ControlType.Number,
                title: "Y Inset",
                min: -100,
                max: 100,
                step: 1,
                defaultValue: 20,

                hidden: (props: any) =>
                    !props.enabled || props.verticalAlign === "center",
            },
        },
    },
    draggable: {
        type: ControlType.Boolean,
        title: "Draggable",
        defaultValue: true,
        hidden: (props: any) => props.finiteMode,
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
    fluid: {
        type: ControlType.Boolean,
        title: "Fluid Drag",
        defaultValue: true,
        hidden: (props: any) => props.finiteMode || !props.draggable,
        description: "Enable fluid dragging with momentum (off = discrete slide navigation)",
    },
    threshold: {
        type: ControlType.Number,
        title: "Drag Threshold",
        min: 50,
        max: 500,
        step: 10,
        defaultValue: 100,
        hidden: (props: any) => props.finiteMode || !props.draggable || props.fluid,
        description: "Minimum drag distance to trigger slide change (limited by card width)",
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
                title: "Delay",
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
                        options: [
                            "fill",
                            "fill-width",
                            "fill-height",
                            "aspect-ratio",
                            "fixed-dimensions",
                            "relative-dimensions",
                        ],
                        optionTitles: [
                            "Fill",
                            "Fill Width",
                            "Fill Height",
                            "Aspect Ratio",
                            "Fixed Dimensions",
                            "Relative Dimensions",
                        ],
                        defaultValue: "fill-width",
                        displaySegmentedControl: true,
                        segmentedControlDirection: "vertical",
                    },
                    aspectRatio: {
                        type: ControlType.Enum,
                        title: "Ratio",
                        options: [
                            "16:9",
                            "4:3",
                            "1:1",
                            "3:2",
                            "21:9",
                            "custom",
                        ],
                        optionTitles: [
                            "16:9",
                            "4:3",
                            "1:1",
                            "3:2",
                            "21:9",
                            "Custom",
                        ],
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
                        hidden: (props: any) =>
                            props?.mode !== "aspect-ratio" ||
                            props?.aspectRatio !== "custom",
                    },
                    aspectRatioFillPercentage: {
                        type: ControlType.Number,
                        title: "Fill %",
                        min: 10,
                        max: 100,
                        step: 5,
                        defaultValue: 100,
                        displayStepper: true,
                        hidden: (props: any) => props?.mode !== "aspect-ratio",
                        description:
                            "Percentage of the minimum dimension to fill (e.g., 90% leaves 10% padding)",
                    },
                    fixedWidth: {
                        type: ControlType.Number,
                        title: "Width",
                        min: 100,
                        max: 800,
                        step: 10,
                        defaultValue: 300,
                        hidden: (props: any) =>
                            props?.mode !== "fixed-dimensions" &&
                            props?.mode !== "fill-height",
                    },
                    fixedHeight: {
                        type: ControlType.Number,
                        title: "Height",
                        min: 100,
                        max: 600,
                        step: 10,
                        defaultValue: 200,
                        hidden: (props: any) =>
                            props?.mode !== "fixed-dimensions" &&
                            props?.mode !== "fill-width",
                    },
                    relativeWidth: {
                        type: ControlType.Number,
                        title: "Width %",
                        min: 10,
                        max: 100,
                        step: 5,
                        defaultValue: 80,
                        displayStepper: true,
                        hidden: (props: any) =>
                            props?.mode !== "relative-dimensions",
                        description: "Percentage of container width",
                    },
                    relativeHeight: {
                        type: ControlType.Number,
                        title: "Height %",
                        min: 10,
                        max: 100,
                        step: 5,
                        defaultValue: 60,
                        displayStepper: true,
                        hidden: (props: any) =>
                            props?.mode !== "relative-dimensions",
                        description: "Percentage of container height",
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
                hidden: (props: any) => props.horizontalAlign !== "center",
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
            disabledStyle: {
                type: ControlType.Enum,
                title: "Style",
                options: ["none", "styled"],
                optionTitles: ["No styling", "Style Disabled state"],
                defaultValue: "none",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",

                description: "Style disabled arrows in finite mode",
            },
            disabledScale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.1,
                max: 1.5,
                step: 0.1,
                defaultValue: 0.7,
                displayStepper: true,
                hidden: (props: any) => props.disabledStyle !== "styled",
                description: "Scale factor for disabled arrows",
            },
            disabledOpacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.3,
                displayStepper: true,
                hidden: (props: any) => props.disabledStyle !== "styled",
                description: "Opacity for disabled arrows",
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
    animation: {
        type: ControlType.Object,
        title: "Animation",
        controls: {
            duration: {
                type: ControlType.Number,
                title: "Duration",
                min: 0.1,
                max: 2,
                step: 0.1,
                defaultValue: 0.4,
                description:
                    "Duration for all animations (slide transitions, visual effects, dots)",
            },
            easing: {
                type: ControlType.Enum,
                title: "Easing",
                options: [
                    "none",
                    "power1.inOut",
                    "power1.in",
                    "power1.out",
                    "power2.inOut",
                    "power2.in",
                    "power2.out",
                    "power3.inOut",
                    "power3.in",
                    "power3.out",
                    "back.inOut",
                    "back.in",
                    "back.out",
                    "elastic.inOut",
                    "elastic.in",
                    "elastic.out",
                    "bounce.inOut",
                    "bounce.in",
                    "bounce.out",
                    "circ.inOut",
                    "circ.in",
                    "circ.out",
                    "expo.inOut",
                    "expo.in",
                    "expo.out",
                    "sine.inOut",
                    "sine.in",
                    "sine.out",
                ],
                optionTitles: [
                    "None",
                    "Power1 InOut",
                    "Power1 In",
                    "Power1 Out",
                    "Power2 InOut",
                    "Power2 In",
                    "Power2 Out",
                    "Power3 InOut",
                    "Power3 In",
                    "Power3 Out",
                    "Back InOut",
                    "Back In",
                    "Back Out",
                    "Elastic InOut",
                    "Elastic In",
                    "Elastic Out",
                    "Bounce InOut",
                    "Bounce In",
                    "Bounce Out",
                    "Circ InOut",
                    "Circ In",
                    "Circ Out",
                    "Expo InOut",
                    "Expo In",
                    "Expo Out",
                    "Sine InOut",
                    "Sine In",
                    "Sine Out",
                ],
                defaultValue: "power1.inOut",
                description:
                    "Easing function for all animations (GSAP handles everything)",
            },
            elasticAmplitude: {
                type: ControlType.Number,
                title: "Amplitude",
                min: 0.1,
                max: 3,
                step: 0.1,
                defaultValue: 1,
                hidden: (props: any) => !props.easing?.startsWith("elastic"),
                description:
                    "Amplitude parameter for elastic easing (higher = more bounce)",
            },
            elasticPeriod: {
                type: ControlType.Number,
                title: "Period",
                min: 0.1,
                max: 1,
                step: 0.1,
                defaultValue: 0.3,
                hidden: (props: any) => !props.easing?.startsWith("elastic"),
                description:
                    "Period parameter for elastic easing (lower = faster oscillation)",
            },
            backIntensity: {
                type: ControlType.Number,
                title: "Intensity",
                min: 0.1,
                max: 3,
                step: 0.1,
                defaultValue: 1.7,
                hidden: (props: any) => !props.easing?.startsWith("back"),
                description:
                    "Intensity parameter for back easing (higher = more overshoot)",
            },
        },
    },
})

Carousel.displayName = "Adriano's Carousel"
