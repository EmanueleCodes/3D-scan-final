import {
    Children,
    useLayoutEffect,
    useEffect,
    useState,
    useRef,
    useMemo,
    createRef,
    useCallback,
    cloneElement,
    startTransition,
    forwardRef,
    useImperativeHandle,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import {
    useAnimationFrame,
    useReducedMotion,
    LayoutGroup,
    useInView,
    useMotionValue,
    useTransform,
    motion,
    wrap,
    frame,
} from "framer-motion"
import { resize } from "@motionone/dom"

const MAX_DUPLICATED_ITEMS = 100

const directionTransformers = {
    left: (offset: number) => `translateX(-${offset}px)`,
    right: (offset: number) => `translateX(${offset}px)`,
    top: (offset: number) => `translateY(-${offset}px)`,
    bottom: (offset: number) => `translateY(${offset}px)`,
}

/**
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function Ticker(props) {
    /* Props */
    let {
        slots = [],
        gap,
        padding,
        paddingPerSide,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        speed,
        hoverFactor,
        direction,
        alignment,
        sizingOptions,
        fadeOptions,
        style,
        draggable,
    } = props

    const { fadeContent, overflow, fadeWidth, fadeInset, fadeAlpha } =
        fadeOptions
    const { widthType, heightType } = sizingOptions
    const paddingValue = paddingPerSide
        ? `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`
        : `${padding}px`

    /* Checks */
    const currentTarget = RenderTarget.current()
    const isCanvas =
        currentTarget === RenderTarget.canvas ||
        currentTarget === RenderTarget.export
    const writingDirection = useWritingDirection()
    // Remove empty slots (such as hidden layers)
    const filteredSlots = slots.filter(Boolean)
    const numChildren = Children.count(filteredSlots)
    const hasChildren = numChildren > 0

    const offset = useMotionValue(0)
    const dragX = useMotionValue(0)
    const dragY = useMotionValue(0)
    const resolvedDirection = getTickerResolvedDirection(
        direction === true ? "left" : direction,
        writingDirection
    )
    const isHorizontal =
        resolvedDirection === "left" || resolvedDirection === "right"
    const transformer = directionTransformers[resolvedDirection]
    const transform = useTransform(offset, transformer)
    
    // Drag state tracking
    const isDragging = useRef(false)
    const dragOffset = useRef(0)
    const animationStartTime = useRef(0)
    const animationStartOffset = useRef(0)

    /* Refs and State */
    const parentRef = useRef(null)
    const childrenRef = useMemo(() => {
        return [
            {
                current: null,
            },
            {
                current: null,
            },
        ]
    }, [])
    const [size, setSize] = useState({
        parent: null,
        children: null,
    })

    /* Arrays */
    let clonedChildren = null
    let dupedChildren = []

    /* Duplicate value */
    let duplicateBy = 0
    let opacity = 0

    if (isCanvas) {
        duplicateBy = numChildren ? Math.floor(10 / numChildren) : 0
        opacity = 1
    }

    if (!isCanvas && hasChildren && size.parent) {
        duplicateBy = Math.round((size.parent / size.children) * 2) + 1
        duplicateBy = Math.min(duplicateBy, MAX_DUPLICATED_ITEMS)
        opacity = 1
    }

    /* Measure parent and child */
    const measure = useCallback(() => {
        if (hasChildren && parentRef.current) {
            const parentLength = isHorizontal
                ? parentRef.current.offsetWidth
                : parentRef.current.offsetHeight

            const start = childrenRef[0].current
                ? isHorizontal
                    ? childrenRef[0].current.offsetLeft
                    : childrenRef[0].current.offsetTop
                : 0
            const end = childrenRef[1].current
                ? isHorizontal
                    ? childrenRef[1].current.offsetLeft +
                      childrenRef[1].current.offsetWidth
                    : childrenRef[1].current.offsetTop +
                      childrenRef[1].current.offsetHeight
                : 0

            const childrenLength = end - start + gap

            startTransition(() => {
                setSize({
                    parent: parentLength,
                    children: childrenLength,
                })
            })
        }
    }, [])

    const childrenStyles = isCanvas ? { contentVisibility: "auto" } : {}

    /* Add refs to first and last child */
    if (hasChildren) {
        // TODO: These conditional hooks will be unsafe if hasChildren ever changes outside the canvas.
        if (!isCanvas) {
            /**
             * Track whether this is the initial resize event. By default this will fire on mount,
             * which we do in the useEffect. We should only fire it on subsequent resizes.
             */
            let initialResize = useRef(true)
            useLayoutEffect(() => {
                frame.read(measure, false, true)
                return resize(parentRef.current, ({ contentSize }) => {
                    if (
                        !initialResize.current &&
                        (contentSize.width || contentSize.height)
                    ) {
                        frame.read(measure, false, true)
                    }

                    initialResize.current = false
                })
            }, [])
        }

        clonedChildren = Children.map(filteredSlots, (child, index) => {
            let ref
            if (index === 0) {
                ref =
                    childrenRef[
                        writingDirection === "rtl" && isHorizontal ? 1 : 0
                    ]
            }
            if (index === filteredSlots.length - 1) {
                ref =
                    childrenRef[
                        writingDirection === "rtl" && isHorizontal ? 0 : 1
                    ]
            }

            const size = {
                width: widthType ? child.props?.width : "100%",
                height: heightType ? child.props?.height : "100%",
            }

            return (
                <LayoutGroup inherit="id">
                    <Wrapper ref={ref} style={size}>
                        {cloneElement(
                            child,
                            {
                                style: {
                                    ...child.props?.style,
                                    ...size,
                                    flexShrink: 0,
                                    ...childrenStyles,
                                },
                                layoutId: child.props.layoutId
                                    ? child.props.layoutId +
                                      "-original-" +
                                      index
                                    : undefined,
                            },
                            child.props?.children
                        )}
                    </Wrapper>
                </LayoutGroup>
            )
        })
    }

    const isInView = isCanvas ? true : useInView(parentRef)

    if (!isCanvas) {
        for (let i = 0; i < duplicateBy; i++) {
            dupedChildren = dupedChildren.concat(
                Children.map(filteredSlots, (child, childIndex) => {
                    const size = {
                        width: widthType ? child.props?.width : "100%",
                        height: heightType ? child.props?.height : "100%",
                        willChange: !isInView ? undefined : "transform", // without this, carousel will flash on animation repeat in safari
                    }
                    return (
                        <LayoutGroup inherit="id" key={i + "lg" + childIndex}>
                            <Wrapper key={i + "li" + childIndex} style={size}>
                                {cloneElement(
                                    child,
                                    {
                                        key: i + " " + childIndex,
                                        style: {
                                            ...child.props?.style,
                                            width: widthType
                                                ? child.props?.width
                                                : "100%",
                                            height: heightType
                                                ? child.props?.height
                                                : "100%",
                                            flexShrink: 0,
                                            ...childrenStyles,
                                        },
                                        layoutId: child.props.layoutId
                                            ? child.props.layoutId +
                                              "-dupe-" +
                                              i
                                            : undefined,
                                    },
                                    child.props?.children
                                )}
                            </Wrapper>
                        </LayoutGroup>
                    )
                })
            )
        }
    }

    const animateToValue =
        size.children + size.children * Math.round(size.parent / size.children)

    const initialTime = useRef(null)
    const prevTime = useRef(null)
    const xOrY = useRef(0)
    const isHover = useRef(false)

    const isReducedMotion = useReducedMotion()
    const listRef = useRef<HTMLUListElement>(null)
    const animationRef = useRef<Animation>(null)

    /**
     * Setup animations
     */
    if (!isCanvas) {
        useEffect(() => {
            if (isReducedMotion || !animateToValue || !speed) {
                return
            }

            animationRef.current = listRef.current.animate(
                {
                    transform: [transformer(0), transformer(animateToValue)],
                },
                {
                    duration: (Math.abs(animateToValue) / speed) * 1000,
                    iterations: Infinity,
                    iterationStart: writingDirection === "rtl" ? 1 : 0,
                    easing: "linear",
                }
            )

            return () => {
                if (animationRef.current) {
                    animationRef.current.cancel()
                }
            }
        }, [hoverFactor, animateToValue, speed, writingDirection])

        const playOrPause = useCallback(() => {
            if (!animationRef.current || isDragging.current) return

            const hidden = document.hidden
            // Only control animation if not currently dragging
            if (
                isInView &&
                !hidden &&
                animationRef.current.playState === "paused"
            ) {
                animationRef.current.play()
            } else if (
                (!isInView || hidden) &&
                animationRef.current.playState === "running"
            ) {
                animationRef.current.pause()
            }
        }, [isInView])

        useEffect(() => {
            playOrPause()
        }, [isInView, hoverFactor, animateToValue, speed])

        useEffect(() => {
            document.addEventListener("visibilitychange", playOrPause)
            return () => {
                document.removeEventListener("visibilitychange", playOrPause)
            }
        }, [playOrPause])
    }

    /* Fades */
    const fadeDirection = isHorizontal ? "to right" : "to bottom"
    const fadeWidthStart = fadeWidth / 2
    const fadeWidthEnd = 100 - fadeWidth / 2
    const fadeInsetStart = clamp(fadeInset, 0, fadeWidthStart)
    const fadeInsetEnd = 100 - fadeInset

    const fadeMask = `linear-gradient(${fadeDirection}, rgba(0, 0, 0, ${fadeAlpha}) ${fadeInsetStart}%, rgba(0, 0, 0, 1) ${fadeWidthStart}%, rgba(0, 0, 0, 1) ${fadeWidthEnd}%, rgba(0, 0, 0, ${fadeAlpha}) ${fadeInsetEnd}%)`

    /* Empty state */
    if (!hasChildren) {
        return (
            <section style={placeholderStyles}>
                <div style={emojiStyles}>✨</div>
                <p style={titleStyles}>Connect to Content</p>
                <p style={subtitleStyles}>
                    Add layers or components to infinitely loop on your page.
                </p>
            </section>
        )
    }

    return (
        <section
            style={{
                ...containerStyle,
                opacity: opacity,
                WebkitMaskImage: fadeContent ? fadeMask : undefined,
                maskImage: fadeContent ? fadeMask : undefined,
                overflow: overflow ? "visible" : "hidden",
                padding: paddingValue,
            }}
            ref={parentRef}
        >
            <motion.ul
                ref={listRef}
                style={{
                    ...containerStyle,
                    gap: gap,
                    top:
                        direction === "bottom" && isValidNumber(animateToValue)
                            ? -animateToValue
                            : undefined,
                    left:
                        direction === "right" && isValidNumber(animateToValue)
                            ? animateToValue *
                              (writingDirection === "rtl" ? 1 : -1)
                            : undefined,
                    placeItems: alignment,
                    position: "relative",
                    flexDirection: isHorizontal ? "row" : "column",
                    ...style,
                    willChange: isCanvas || !isInView ? "auto" : "transform",
                    // Only use drag x/y when actively dragging, otherwise animation handles transform
                    x: isDragging.current && isHorizontal ? dragX : undefined,
                    y: isDragging.current && !isHorizontal ? dragY : undefined,
                }}
                drag={draggable ? (isHorizontal ? "x" : "y") : false}
                dragElastic={draggable ? 0 : undefined}
                onDragStart={() => {
                    if (!draggable) return
                    isDragging.current = true
                    
                    // Pause animation when drag starts (if it exists and is running)
                    if (animationRef.current && animationRef.current.playState === "running") {
                        animationRef.current.pause()
                        // Capture current animation position as starting point
                        const effect = animationRef.current.effect
                        const duration = effect && effect.getTiming ? effect.getTiming().duration : 1
                        const currentTime = animationRef.current.currentTime || 0
                        const currentProgress = duration > 0 ? (currentTime / duration) % 1 : 0
                        animationStartOffset.current = currentProgress * (isValidNumber(animateToValue) ? animateToValue : 0)
                    } else {
                        // If no animation, use current offset or 0
                        animationStartOffset.current = offset.get() || 0
                    }
                    
                    // Set initial drag position to 0
                    dragX.set(0)
                    dragY.set(0)
                }}
                onDrag={(event, info) => {
                    if (!draggable) return
                    // Calculate new offset from drag position
                    const dragDelta = isHorizontal ? info.offset.x : info.offset.y
                    // Direction multiplier: right/bottom move in positive direction, left/top move negative
                    const directionMultiplier = resolvedDirection === "right" || resolvedDirection === "bottom" ? -1 : 1
                    const newOffset = animationStartOffset.current + (dragDelta * directionMultiplier)
                    offset.set(newOffset)
                }}
                onDragEnd={(event, info) => {
                    if (!draggable) return
                    isDragging.current = false
                    
                    // Get final drag position
                    const finalDragDelta = isHorizontal ? info.offset.x : info.offset.y
                    const directionMultiplier = resolvedDirection === "right" || resolvedDirection === "bottom" ? -1 : 1
                    const finalOffset = animationStartOffset.current + (finalDragDelta * directionMultiplier)
                    
                    // Reset drag motion values to clear framer-motion transform
                    dragX.set(0)
                    dragY.set(0)
                    
                    // When drag ends, restart animation from current offset position (if animation exists)
                    if (animationRef.current && !isReducedMotion && isValidNumber(animateToValue) && speed && listRef.current) {
                        // Normalize offset to be within animation range (0 to animateToValue)
                        const normalizedOffset = ((finalOffset % animateToValue) + animateToValue) % animateToValue
                        
                        // Cancel current animation and apply transform immediately to avoid jump
                        animationRef.current.cancel()
                        listRef.current.style.transform = transformer(normalizedOffset)
                        
                        // Create new animation starting from current position
                        animationRef.current = listRef.current.animate(
                            {
                                transform: [transformer(normalizedOffset), transformer(normalizedOffset + animateToValue)],
                            },
                            {
                                duration: (Math.abs(animateToValue) / speed) * 1000,
                                iterations: Infinity,
                                easing: "linear",
                            }
                        )
                        
                        // Sync offset with normalized position
                        offset.set(normalizedOffset)
                        
                        // Resume animation if conditions are met
                        playOrPause()
                    } else if (listRef.current && isValidNumber(finalOffset)) {
                        // If no animation, apply transform to keep dragged position
                        listRef.current.style.transform = transformer(finalOffset)
                        offset.set(finalOffset)
                    }
                }}
                onMouseEnter={() => {
                    if (draggable) return
                    isHover.current = true
                    if (animationRef.current) {
                        // TODO Replace with updatePlaybackRate when Chrome bugs sorted
                        animationRef.current.playbackRate = hoverFactor
                    }
                }}
                onMouseLeave={() => {
                    if (draggable) return
                    isHover.current = false
                    if (animationRef.current) {
                        // TODO Replace with updatePlaybackRate when Chrome bugs sorted
                        animationRef.current.playbackRate = 1
                    }
                }}
            >
                {clonedChildren}
                {dupedChildren}
            </motion.ul>
        </section>
    )
}

const Wrapper = forwardRef(({ children, ...props }, ref) => {
    const innerRef = useRef<HTMLLIElement | null>()
    const inView = useInView(innerRef)

    useImperativeHandle(ref, () => innerRef.current)

    useEffect(() => {
        const current = innerRef.current
        if (!current) return

        // for a11y: Manage tabIndex on focusable descendants & aria-hidden on the parent.
        if (inView) {
            current.querySelectorAll("button,a").forEach((el) => {
                const orig = el.dataset.origTabIndex
                if (orig) el.tabIndex = orig
                else el.removeAttribute("tabIndex")
            })
        } else {
            current.querySelectorAll("button,a").forEach((el) => {
                const orig = el.getAttribute("tabIndex")
                if (orig) el.dataset.origTabIndex = orig
                el.tabIndex = -1
            })
        }
    }, [inView])

    return (
        <li {...props} aria-hidden={!inView} ref={innerRef}>
            {children}
        </li>
    )
})

/* Default Properties */
Ticker.defaultProps = {
    gap: 10,
    padding: 10,
    sizingOptions: {
        widthType: true,
        heightType: true,
    },
    fadeOptions: {
        fadeContent: true,
        overflow: false,
        fadeWidth: 25,
        fadeAlpha: 0,
        fadeInset: 0,
    },
    direction: true,
    draggable: false,
}

/* Property Controls */
addPropertyControls(Ticker, {
    slots: {
        type: ControlType.Array,
        title: "Children",
        control: { type: ControlType.ComponentInstance },
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 1000,
        defaultValue: 100,
        unit: "%",
        displayStepper: true,
        step: 5,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["left", "right", "top", "bottom"],
        optionIcons: [
            "direction-left",
            "direction-right",
            "direction-up",
            "direction-down",
        ],
        optionTitles: ["Left", "Right", "Top", "Bottom"],
        defaultValue: "left",
        displaySegmentedControl: true,
    },
    alignment: {
        type: ControlType.Enum,
        title: "Align",
        options: ["flex-start", "center", "flex-end"],
        optionIcons: {
            direction: {
                right: ["align-top", "align-middle", "align-bottom"],
                left: ["align-top", "align-middle", "align-bottom"],
                top: ["align-left", "align-center", "align-right"],
                bottom: ["align-left", "align-center", "align-right"],
            },
        },
        defaultValue: "center",
        displaySegmentedControl: true,
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
    },
    padding: {
        title: "Padding",
        type: ControlType.FusedNumber,
        toggleKey: "paddingPerSide",
        toggleTitles: ["Padding", "Padding per side"],
        valueKeys: [
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
        ],
        valueLabels: ["T", "R", "B", "L"],
        min: 0,
    },
    sizingOptions: {
        type: ControlType.Object,
        title: "Sizing",
        controls: {
            widthType: {
                type: ControlType.Boolean,
                title: "Width",
                enabledTitle: "Auto",
                disabledTitle: "Stretch",
                defaultValue: true,
            },
            heightType: {
                type: ControlType.Boolean,
                title: "Height",
                enabledTitle: "Auto",
                disabledTitle: "Stretch",
                defaultValue: true,
            },
        },
    },
    fadeOptions: {
        type: ControlType.Object,
        title: "Clipping",
        controls: {
            fadeContent: {
                type: ControlType.Boolean,
                title: "Fade",
                defaultValue: true,
            },
            overflow: {
                type: ControlType.Boolean,
                title: "Overflow",
                enabledTitle: "Show",
                disabledTitle: "Hide",
                defaultValue: false,
                hidden(props) {
                    return props.fadeContent === true
                },
            },
            fadeWidth: {
                type: ControlType.Number,
                title: "Width",
                defaultValue: 25,
                min: 0,
                max: 100,
                unit: "%",
                hidden(props) {
                    return props.fadeContent === false
                },
            },
            fadeInset: {
                type: ControlType.Number,
                title: "Inset",
                defaultValue: 0,
                min: 0,
                max: 100,
                unit: "%",
                hidden(props) {
                    return props.fadeContent === false
                },
            },
            fadeAlpha: {
                type: ControlType.Number,
                title: "Opacity",
                defaultValue: 0,
                min: 0,
                max: 1,
                step: 0.05,
                hidden(props) {
                    return props.fadeContent === false
                },
            },
        },
    },
    hoverFactor: {
        type: ControlType.Number,
        title: "Hover",
        min: 0,
        max: 1,
        unit: "x",
        defaultValue: 1,
        step: 0.1,
        displayStepper: true,
        description: "Slows down the speed while you are hovering.",
    },
    draggable: {
        type: ControlType.Boolean,
        title: "Draggable",
        defaultValue: false,
        description: "Allow users to drag the ticker to control its position.",
    },
})

/* Placeholder Styles */
const containerStyle = {
    display: "flex",
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    placeItems: "center",
    margin: 0,
    padding: 0,
    listStyleType: "none",
    textIndent: "none",
}

/* Styles */
const placeholderStyles = {
    display: "flex",
    width: "100%",
    height: "100%",
    placeContent: "center",
    placeItems: "center",
    flexDirection: "column",
    color: "#96F",
    background: "rgba(136, 85, 255, 0.1)",
    fontSize: 11,
    overflow: "hidden",
    padding: "20px 20px 30px 20px",
}

const emojiStyles = {
    fontSize: 32,
    marginBottom: 10,
}

const titleStyles = {
    margin: 0,
    marginBottom: 10,
    fontWeight: 600,
    textAlign: "center",
}

const subtitleStyles = {
    margin: 0,
    opacity: 0.7,
    maxWidth: 150,
    lineHeight: 1.5,
    textAlign: "center",
}

/* Clamp function, used for fadeInset */
const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

const isValidNumber = (value) => typeof value === "number" && !isNaN(value)

function useWritingDirection() {
    if (!window || !window.document || !window.document.documentElement)
        return "ltr"
    return window.document.documentElement.dir === "rtl" ? "rtl" : "ltr"
}

function getTickerResolvedDirection(
    direction: "left" | "right" | "up" | "down",
    writingDirection: "ltr" | "rtl"
) {
    if (writingDirection !== "rtl") return direction
    if (direction === "left") return "right"
    if (direction === "right") return "left"

    return direction
}