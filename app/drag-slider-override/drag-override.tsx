import { forwardRef, type ComponentType, useState } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Create a centralized store for all drag-based animations
const useVariantStore = createStore({
    currentIndex: 0,
    variants: [
        "D - 01 (Home)",
        "D - 02 (Home)",
        "D - 03 (Home)",
        "D - 04 (Home)",
    ],
    // Add rotation state to the central store
    rotation: 0, // persistent snapped rotation (deg)
    gestureRotation: 0, // temporary rotation during active drag (deg)
    isDragging: false,
    hasSnapped: false
})


/**
 * Drag Override - Detects horizontal drags to switch variants
 * Drag right = next variant, drag left = previous variant
 */
export function withVariantDrag(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()

        const handleDragStart = () => {
            // Start a new gesture: reset gestureRotation only (not the persistent rotation)
            setStore({ isDragging: true, gestureRotation: 0, hasSnapped: false })
            console.log('🔄 Central drag started - gestureRotation = 0 (rotation unchanged)')
        }

        const handleDrag = (event: any, info: any) => {
            // If we already snapped to 90°, ignore further drag updates until release
            if (store.hasSnapped) return

            // Only apply rotation if we've moved enough pixels (threshold)
            const vwThreshold = typeof window !== 'undefined' ? window.innerWidth * 0.05 : 0
            const rotationThreshold = Math.max(100, vwThreshold) // px or 5vw, whichever is larger
            
            if (Math.abs(info.offset.x) < rotationThreshold) {
                // Too small movement - no rotation yet
                setStore({ gestureRotation: 0 })
                return
            }
            
            // Calculate rotation while dragging (max 2deg for subtle tilt)
            const maxRotation = 2
            const dragProgress = (Math.abs(info.offset.x) - rotationThreshold) / rotationThreshold
            const currentDragRotation = Math.min(dragProgress * maxRotation, maxRotation)
            
            // Apply rotation based on drag direction
            // Requirement: offsetX < 0 => counter-clockwise
            const newRotation = info.offset.x < 0 
                ? -currentDragRotation  // counter-clockwise
                : currentDragRotation   // clockwise
            
            setStore({ gestureRotation: newRotation })
            console.log('🔄 Central drag - rotation:', newRotation, 'offsetX:', info.offset.x, 'threshold met')

            // If we exceed snap threshold, snap to ±90 and stop listening until release
            if (Math.abs(info.offset.x) >= rotationThreshold * 2) {
                const delta = info.offset.x < 0 ? -90 : 90
                const snapped = store.rotation + delta
                setStore({ rotation: snapped, gestureRotation: 0, hasSnapped: true })
                console.log('🧲 Snapped rotation by', delta, '=>', snapped)
            }
        }

        const handleDragEnd = (event: any, info: any) => {
            // Only apply rotation if we've moved enough pixels
            const vwThreshold = typeof window !== 'undefined' ? window.innerWidth * 0.05 : 0
            const rotationThreshold = Math.max(100, vwThreshold) // px or 5vw
            
            if (Math.abs(info.offset.x) < rotationThreshold) {
                // Too small movement - discard gesture rotation and keep existing rotation
                setStore({ isDragging: false, gestureRotation: 0, hasSnapped: false })
                console.log('🔄 Drag too small - keeping rotation, clearing gestureRotation')
                return
            }
            
            setStore({ isDragging: false })
            
            // Determine final rotation INCREMENTALLY based on direction
            const delta = info.offset.x < 0 ? -90 : 90
            const finalRotation = store.rotation + delta
            console.log('🔄 Drag end - applying delta', delta, '=>', finalRotation)
            
            // Apply final rotation
            setStore({ rotation: finalRotation, gestureRotation: 0, hasSnapped: true })
            
            // Handle variant switching (same threshold)
            if (Math.abs(info.offset.x) >= rotationThreshold) {
                let newIndex
                
                if (info.offset.x < 0) {
                    // Dragged left - next variant
                    newIndex = (store.currentIndex + 1) % store.variants.length
                    console.log('🚀 Dragged LEFT - next variant:', store.variants[newIndex])
                } else {
                    // Dragged right - previous variant
                    newIndex = store.currentIndex === 0 
                        ? store.variants.length - 1 
                        : store.currentIndex - 1
                    console.log('🚀 Dragged RIGHT - previous variant:', store.variants[newIndex])
                }
                
                setStore({ currentIndex: newIndex })
            }
        }

        return (
            <Component
                ref={ref}
                {...props}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                style={{
                    ...props.style,
                    cursor: "grab",
                }}
                whileDrag={{ cursor: "grabbing" }}
            />
        )
    })
}

/**
 * Variant Listener Override - Listens to store changes and applies variants
 * Apply this to components that should change variants based on store updates
 */
export function withVariantListener(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store] = useVariantStore()
        const currentVariant = store.variants[store.currentIndex]

        console.log("👂 Variant listener - applying variant:", currentVariant)

        return (
            <Component
                ref={ref}
                {...props}
                variant={currentVariant}
            />
        )
    })
}

/**
 * Rotation Listener Override - Listens to store and applies rotation transforms
 * Apply this to components that should rotate based on drag gestures
 */
export function withRotationListener(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store] = useVariantStore()
        const currentRotation = store.rotation + (store.isDragging ? store.gestureRotation : 0)
        
        console.log('🔄 Rotation listener - applying rotation:', currentRotation)

        return (
            <Component
                ref={ref}
                {...props}
                style={{
                    ...props.style,
                    transform: `rotate(${currentRotation}deg)`,
                    transformOrigin: "center center",
                    // Force the transform to be applied
                    willChange: "transform",
                }}
                // Also try using animate prop for Framer Motion components
                animate={{
                    rotate: currentRotation
                }}
                
            />
        )
    })
}
