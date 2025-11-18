import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface TrackedElement {
    el: HTMLElement
    x: number // Absolute position including tile offset (like infinite-grid.js)
    y: number // Absolute position including tile offset (like infinite-grid.js)
    width: number
    height: number
    extraX: number // For infinite wrapping
    extraY: number // For infinite wrapping
    ease: number
    isClone: boolean // Track if this is a cloned element for cleanup
    baseElement: HTMLElement // Reference to original element for shared calculations
}

interface InfiniteCanvasProps {
    scrollSpeed?: number
    dragSpeed?: number
    ease?: number
    parallax?: {
        enabled?: boolean
        general?: number
        child?: number
    }
    enableDrag?: boolean
    style?: React.CSSProperties
}

/**
 * Linear mapping function: Maps UI values to internal values
 * UI 0.1-1 → Internal 0.1-2
 */
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}

/**
 * Maps speed UI values (0.1-1) to internal values (0.1-2)
 * UI 0.1 → Internal 0.1
 * UI 1.0 → Internal 2.0
 */
function mapSpeedUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 0.1, 2.0)
}

/**
 * Maps ease UI values (0-1) to internal values (0.01-0.2)
 * UI 0 → Internal 0.01 (smoother)
 * UI 1 → Internal 0.2 (snappier)
 */
function mapEaseUiToInternal(ui: number): number {
    const clamped = Math.max(0, Math.min(1, ui))
    return mapLinear(clamped, 0, 1.0, 0.01, 0.2)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerDisableUnlink
 */

export default function InfiniteCanvas({
    scrollSpeed = 0.4,
    dragSpeed = 0.5,
    ease = 0.3,
    parallax = {
        enabled: true,
        general: 1,
        child: 1,
    },
    enableDrag = true,
    style,
}: InfiniteCanvasProps) {
    // Map UI values to internal values
    const internalScrollSpeed = mapSpeedUiToInternal(scrollSpeed)
    const internalDragSpeed = mapSpeedUiToInternal(dragSpeed)
    const internalEase = mapEaseUiToInternal(ease)
    
    const containerRef = useRef<HTMLDivElement>(null)
    const parentElementRef = useRef<HTMLElement | null>(null)
    const trackedElementsRef = useRef<TrackedElement[]>([])

    const scroll = useRef({
        ease: internalEase,
        current: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        last: { x: 0, y: 0 },
        delta: { x: { c: 0, t: 0 }, y: { c: 0, t: 0 } },
    })

    const isDragging = useRef(false)
    const drag = useRef({ startX: 0, startY: 0, scrollX: 0, scrollY: 0 })

    const mouse = useRef({
        x: { t: 0.5, c: 0.5 },
        y: { t: 0.5, c: 0.5 },
        press: { t: 0, c: 0 },
    })

    const winW = useRef(window.innerWidth)
    const winH = useRef(window.innerHeight)
    const parentDimensions = useRef({ width: 0, height: 0, tileSizeW: 0, tileSizeH: 0 })
    const rafId = useRef<number | null>(null)

    // Find parent element and initialize tracked elements
    useEffect(() => {

        if (RenderTarget.current() === RenderTarget.canvas) return;

        const container = containerRef.current
        if (!container) return

        // Find parent element 2 levels up (Framer wraps code components)
        let parentElement: HTMLElement | null = container.parentElement
        if (parentElement) {
            parentElement = parentElement.parentElement
        }

        if (!parentElement) return

        parentElementRef.current = parentElement

        // Store initial window dimensions
        winW.current = window.innerWidth
        winH.current = window.innerHeight

        // Get parent container dimensions for precise tiling
        const parentRect = parentElement.getBoundingClientRect()
        const parentWidth = parentRect.width
        const parentHeight = parentRect.height

        // Find all direct children of parent element (these are the base elements)
        const baseChildren = Array.from(parentElement.children).filter(
            (child) => child !== container.parentElement
        ) as HTMLElement[]

        // Create 2x2 grid of duplicates (exactly like infinite-grid.js)
        // repsX = [0, parentW] and repsY = [0, parentH]
        const repsX = [0, parentWidth]
        const repsY = [0, parentHeight]

        trackedElementsRef.current = []

        baseChildren.forEach((baseChild) => {
            // STEP 1: Capture the element's current position relative to parent
            // This is where Framer has positioned it via CSS
            const rect = baseChild.getBoundingClientRect()
            const baseX = rect.left - parentRect.left
            const baseY = rect.top - parentRect.top

            // STEP 2: Generate random ease value (for parallax variation)
            const elementEase = Math.random() * 0.5 + 0.5
            
            // STEP 3: Reference to the base element (for clone tracking)
            let baseElementRef: HTMLElement | null = null

            // STEP 4: Create 2x2 grid of elements
            // repsX = [0, parentWidth] creates columns at x=0 and x=parentWidth
            // repsY = [0, parentHeight] creates rows at y=0 and y=parentHeight
            repsX.forEach((offsetX) => {
                repsY.forEach((offsetY) => {
                    let element: HTMLElement

                    if (offsetX === 0 && offsetY === 0) {
                        // ORIGINAL ELEMENT (0,0 offset)
                        // Keep the original, it already has CSS positioning from Framer
                        element = baseChild
                        baseElementRef = baseChild
                    } else {
                        // CLONED ELEMENTS (with offsets)
                        // These need to appear at (baseX + parentWidth, baseY + parentHeight), etc.
                        element = baseChild.cloneNode(true) as HTMLElement
                        parentElement.appendChild(element)
                        
                        // Make clones absolutely positioned so they can be moved freely
                        element.style.position = "absolute"
                        element.style.left = "0"
                        element.style.top = "0"
                    }

                    // STEP 5: Store element data for animation loop
                    trackedElementsRef.current.push({
                        el: element,
                        x: baseX + offsetX, // Full position including tile offset
                        y: baseY + offsetY, // Full position including tile offset
                        width: rect.width,
                        height: rect.height,
                        extraX: 0, // For infinite wrapping
                        extraY: 0, // For infinite wrapping
                        ease: elementEase, // Same for all copies of this element
                        isClone: !(offsetX === 0 && offsetY === 0),
                        baseElement: baseElementRef || baseChild,
                    })
                })
            })
        })

        // Reset scroll position
        scroll.current.current = { x: 0, y: 0 }
        scroll.current.target = { x: 0, y: 0 }
        scroll.current.last = { x: 0, y: 0 }

        // Position elements: originals stay in place, clones are hidden initially
        trackedElementsRef.current.forEach((item) => {
            if (item.isClone) {
                // Clones: hide initially (will show when wrapping)
                item.el.style.opacity = "0"
                item.el.style.pointerEvents = "none"
            }
            // Reset transforms
            item.el.style.transform = ""
            const firstChild = item.el.firstElementChild as HTMLElement
            if (firstChild) {
                firstChild.style.transform = ""
            }
        })

        // Store doubled tile size for wrapping (like infinite-grid.js: this.tileSize.w *= 2)
        const tileSizeW = parentWidth * 2
        const tileSizeH = parentHeight * 2
        parentDimensions.current = { 
            width: parentWidth, 
            height: parentHeight,
            tileSizeW,
            tileSizeH,
        }

        // Handle window resize
        const handleResize = () => {
            winW.current = window.innerWidth
            winH.current = window.innerHeight

            // Update parent dimensions
            if (parentElement) {
                const rect = parentElement.getBoundingClientRect()
                parentDimensions.current = { 
                    width: rect.width, 
                    height: rect.height,
                    tileSizeW: rect.width * 2,
                    tileSizeH: rect.height * 2,
                }
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)

            // Cleanup: Remove all cloned elements
            trackedElementsRef.current.forEach((item) => {
                if (item.isClone && item.el.parentNode) {
                    item.el.parentNode.removeChild(item.el)
                }
            })
            trackedElementsRef.current = []
        }
    }, [])

    // Handle wheel events for scrolling
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return;
        
        const parentElement = parentElementRef.current
        if (!parentElement) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            scroll.current.target.x -= e.deltaX * internalScrollSpeed
            scroll.current.target.y -= e.deltaY * internalScrollSpeed
        }

        window.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            window.removeEventListener("wheel", handleWheel)
        }
    }, [scrollSpeed])

    // Handle drag events
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return;
        
        const parentElement = parentElementRef.current
        if (!parentElement || !enableDrag) return

        const handleMouseDown = (e: MouseEvent) => {
            e.preventDefault()
            isDragging.current = true
            document.documentElement.classList.add("dragging")
            mouse.current.press.t = 1
            drag.current.startX = e.clientX
            drag.current.startY = e.clientY
            drag.current.scrollX = scroll.current.target.x
            drag.current.scrollY = scroll.current.target.y
        }

        const handleMouseUp = () => {
            isDragging.current = false
            document.documentElement.classList.remove("dragging")
            mouse.current.press.t = 0
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x.t = e.clientX / winW.current
            mouse.current.y.t = e.clientY / winH.current

            if (isDragging.current) {
                const dx = e.clientX - drag.current.startX
                const dy = e.clientY - drag.current.startY
                scroll.current.target.x = drag.current.scrollX + dx * internalDragSpeed
                scroll.current.target.y = drag.current.scrollY + dy * internalDragSpeed
            }
        }

        // Touch event handlers
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0]
                isDragging.current = true
                mouse.current.press.t = 1
                drag.current.startX = touch.clientX
                drag.current.startY = touch.clientY
                drag.current.scrollX = scroll.current.target.x
                drag.current.scrollY = scroll.current.target.y
            }
        }

        const handleTouchEnd = () => {
            isDragging.current = false
            mouse.current.press.t = 0
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1 && isDragging.current) {
                e.preventDefault()
                const touch = e.touches[0]
                mouse.current.x.t = touch.clientX / winW.current
                mouse.current.y.t = touch.clientY / winH.current
                const dx = touch.clientX - drag.current.startX
                const dy = touch.clientY - drag.current.startY
                scroll.current.target.x = drag.current.scrollX + dx * internalDragSpeed
                scroll.current.target.y = drag.current.scrollY + dy * internalDragSpeed
            }
        }

        parentElement.addEventListener("mousedown", handleMouseDown)
        window.addEventListener("mouseup", handleMouseUp)
        window.addEventListener("mousemove", handleMouseMove)
        parentElement.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        })
        window.addEventListener("touchend", handleTouchEnd)
        window.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        })

        return () => {
            parentElement.removeEventListener("mousedown", handleMouseDown)
            window.removeEventListener("mouseup", handleMouseUp)
            window.removeEventListener("mousemove", handleMouseMove)
            parentElement.removeEventListener("touchstart", handleTouchStart)
            window.removeEventListener("touchend", handleTouchEnd)
            window.removeEventListener("touchmove", handleTouchMove)
        }
    }, [enableDrag, dragSpeed])

    // Update ease value when prop changes
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return;
        
        scroll.current.ease = mapEaseUiToInternal(ease)
    }, [ease])

    // Animation loop
    const render = () => {
        // EARLY RETURN: If in canvas mode, don't run any animation logic
        // Reset all elements to original positions and return immediately
        // This ensures the canvas is completely untouched by the effect
        if (RenderTarget.current() === RenderTarget.canvas) return

        // All animation logic below only runs in preview/live mode

        // In preview/live mode, show original elements and manage clone visibility dynamically
        trackedElementsRef.current.forEach((item) => {
            if (!item.isClone) {
                item.el.style.display = ""
                item.el.style.opacity = ""
            }
            // Clone visibility is managed in the render loop
        })

        // Smooth scroll interpolation
        scroll.current.current.x +=
            (scroll.current.target.x - scroll.current.current.x) *
            scroll.current.ease
        scroll.current.current.y +=
            (scroll.current.target.y - scroll.current.current.y) *
            scroll.current.ease

        // Calculate scroll delta for parallax
        scroll.current.delta.x.t =
            scroll.current.current.x - scroll.current.last.x
        scroll.current.delta.y.t =
            scroll.current.current.y - scroll.current.last.y
        scroll.current.delta.x.c +=
            (scroll.current.delta.x.t - scroll.current.delta.x.c) * 0.04
        scroll.current.delta.y.c +=
            (scroll.current.delta.y.t - scroll.current.delta.y.c) * 0.04

        // Smooth mouse interpolation
        mouse.current.x.c += (mouse.current.x.t - mouse.current.x.c) * 0.04
        mouse.current.y.c += (mouse.current.y.t - mouse.current.y.c) * 0.04
        mouse.current.press.c +=
            (mouse.current.press.t - mouse.current.press.c) * 0.04

        const dirX =
            scroll.current.current.x > scroll.current.last.x ? "right" : "left"
        const dirY =
            scroll.current.current.y > scroll.current.last.y ? "down" : "up"

        // Group elements by base element to calculate shared parallax
        const elementsByBase = new Map<HTMLElement, TrackedElement[]>()
        trackedElementsRef.current.forEach((item) => {
            if (!elementsByBase.has(item.baseElement)) {
                elementsByBase.set(item.baseElement, [])
            }
            elementsByBase.get(item.baseElement)!.push(item)
        })

        // ANIMATION LOOP: Update each tracked element
        trackedElementsRef.current.forEach((item) => {
            // PARALLAX CALCULATION
            // Find the original element in the same group
            // All copies share the same parallax to move in sync
            const group = elementsByBase.get(item.baseElement)!
            const originalItem = group.find((i) => !i.isClone) || item
            
            // Parallax = scroll delta effect + mouse position effect
            // Only apply if parallax is enabled
            const parallaxMultiplier = parallax?.enabled ? (parallax.general ?? 1) : 0
            const parallaxX =
                5 * scroll.current.delta.x.c * originalItem.ease +
                (mouse.current.x.c - 0.5) * originalItem.width * 0.6 * parallaxMultiplier
            const parallaxY =
                5 * scroll.current.delta.y.c * originalItem.ease +
                (mouse.current.y.c - 0.5) * originalItem.height * 0.6 * parallaxMultiplier

            // POSITION CALCULATION
            const scrollX = scroll.current.current.x
            const scrollY = scroll.current.current.y
            
            // Current position = base position + scroll + wrapping offset + parallax
            const posX = item.x + scrollX + item.extraX + parallaxX
            const posY = item.y + scrollY + item.extraY + parallaxY

            // INFINITE WRAPPING LOGIC
            // When element exits one side, wrap it to the other side
            const parentW = parentDimensions.current.width
            const parentH = parentDimensions.current.height
            
            // Check if element has exited the viewport
            const beforeX = posX > winW.current // Exited right
            const afterX = posX + item.width < 0 // Exited left
            const beforeY = posY > winH.current // Exited bottom
            const afterY = posY + item.height < 0 // Exited top

            // Tile size for wrapping (2x parent size for 2x2 grid)
            const tileW = parentDimensions.current.tileSizeW // parentWidth * 2
            const tileH = parentDimensions.current.tileSizeH // parentHeight * 2

            // Adjust extraX/extraY to wrap element to opposite side
            if (dirX === "right" && beforeX) item.extraX -= tileW
            if (dirX === "left" && afterX) item.extraX += tileW
            if (dirY === "down" && beforeY) item.extraY -= tileH
            if (dirY === "up" && afterY) item.extraY += tileH

            // FINAL POSITION (after potential wrapping)
            const finalX = item.x + scrollX + item.extraX + parallaxX
            const finalY = item.y + scrollY + item.extraY + parallaxY

            // CLONE VISIBILITY
            // Only show clones when they enter the parent bounds
            if (item.isClone) {
                const isVisible = 
                    (finalX >= -item.width && finalX <= parentW) &&
                    (finalY >= -item.height && finalY <= parentH)
                
                item.el.style.opacity = isVisible ? "1" : "0"
                item.el.style.pointerEvents = isVisible ? "auto" : "none"
                
                // CLONES: Apply full absolute position via transform
                item.el.style.transform = `translate(${finalX}px, ${finalY}px)`
            } else {
                // ORIGINALS: Only apply offset from natural CSS position
                // The element already has CSS positioning from Framer
                // We only want to ADD the scroll/wrap/parallax offset
                const offsetX = scrollX + item.extraX + parallaxX
                const offsetY = scrollY + item.extraY + parallaxY
                item.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`
            }

            // Apply parallax scale effect on press
            // parallax.child multiplies the effect intensity (0 = no effect, 1 = full effect)
            // When parallax.child = 0, scale should be 1 (no scaling) and translate should be 0
            const insideParallaxValue = parallax?.enabled ? (parallax.child ?? 1) : 0
            const scale = 1 + 0.2 * mouse.current.press.c * item.ease * insideParallaxValue
            
            // Center the translate around zero by subtracting 0.5 from normalized mouse position
            // mouse.x.c ranges from 0 to 1, so (mouse.x.c - 0.5) ranges from -0.5 to +0.5
            // This allows translate to go both positive and negative, centered at zero
            const generalParallax = parallax?.general ?? 1
            const translateX = (0.5 - mouse.current.x.c) * item.ease * 20 * generalParallax * insideParallaxValue
            const translateY = (0.5 - mouse.current.y.c) * item.ease * 20 * generalParallax * insideParallaxValue

            // Apply to first child if it exists (for nested content)
            const firstChild = item.el.firstElementChild as HTMLElement
            if (firstChild) {
                // When parallax.child = 0 or parallax.enabled = false, apply no transform (identity)
                if (insideParallaxValue === 0) {
                    firstChild.style.transform = "none"
                } else {
                    firstChild.style.transform = `scale(${scale}) translate(${translateX}%, ${translateY}%)`
                }
            }
        })

        scroll.current.last.x = scroll.current.current.x
        scroll.current.last.y = scroll.current.current.y
    }

    // Animation loop
    useEffect(() => {
        const animate = () => {
            render()
            rafId.current = requestAnimationFrame(animate)
        }

        rafId.current = requestAnimationFrame(animate)

        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current)
                rafId.current = null
            }
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "0px",
                height: "0px",
                overflow: "visible",
                backgroundColor: "transparent",
                transform: "translateZ(0)",
                transformStyle: "flat",
            }}
        />
    )
}

addPropertyControls(InfiniteCanvas, {
    enableDrag: {
        type: ControlType.Boolean,
        title: "Enable Drag",
        defaultValue: true,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props) => !props.enableDrag,
    },
    scrollSpeed: {
        type: ControlType.Number,
        title: "Scroll Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.4,
    },
    
    ease: {
        type: ControlType.Number,
        title: "Snappy",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.3,
    },
    parallax: {
        type: ControlType.Object,
        title: "Parallax",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            general: {
                type: ControlType.Number,
                title: "General",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
            },
            child: {
                type: ControlType.Number,
                title: "Child",
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 1,
                description: "Controls the parallax effect intensity on inner elements (0 = no effect, 1 = full effect)",
            },
        },
        defaultValue: {
            enabled: true,
            general: 1,
            child: 1,
        },
    },
})

InfiniteCanvas.displayName = "Infinite Canvas"
