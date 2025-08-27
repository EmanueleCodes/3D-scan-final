import { forwardRef, type ComponentType, useState, useRef, useEffect, useLayoutEffect } from "react"
import { RenderTarget } from "framer"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Create a centralized store for all drag-based animations
const useVariantStore = createStore({
    currentIndex: 0,
    contentVariants: [
        "Breakfast",
        "Lunch",
        "Snacks",
        "Dinner",
    ],
    // === ROTATION SYSTEM ===
    // The rotation system tracks 2 types of rotation:
    // 1. PERSISTENT rotation from completed drag gestures (stored in `rotation`)
    // 2. TEMPORARY rotation during active dragging (stored in `gestureRotation`) 
    
    rotation: 0, // PERSISTENT: Cumulative rotation from all completed drag gestures (±90° increments)
                 // Always starts at 0° and accumulates: 0° → 90° → 180° → 270° → 360° etc.
                 // Persists across variant changes (rotation doesn't reset when switching variants)
    
    gestureRotation: 0, // TEMPORARY: Subtle rotation during active drag gesture (0° to ±8°)
                        // Used for visual feedback while dragging (tilt effect)
                        // Reset to 0 when drag ends or snaps to full rotation
                        // This creates the "preview" of rotation direction before committing
    
    isDragging: false,  // Flag: true when user is actively dragging
    hasSnapped: false,  // Flag: true when current drag gesture has already applied a ±90° rotation
                        // Prevents multiple rotations per single drag gesture
    isInitialized: false // Flag: true when store has been initialized (prevents multiple inits)
})

// --- Rotation System Helpers ---------------------------------------------------------------

// VARIANT_KEYS: Used to match URL fragments and data-framer-name attributes to variant indices
// Example: URL contains "lunch" → maps to index 1 → contentVariants[1] = "Lunch"
const VARIANT_KEYS = ["breakfast", "lunch", "snacks", "dinner"]

// NOTE: do not call useVariantStore.setState - it doesn't exist for Framer's store hoo

/**
 * Drag Override - Detects horizontal drags to switch variants
 * Drag right = next variant, drag left = previous variant
 */
export function withVariantDrag(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()
        const localRef = useRef<any>(null)

        // helper to forward ref + keep local one
        const setMergedRef = (node: any) => {
            localRef.current = node
            if (typeof ref === "function") ref(node)
            else if (ref && typeof (ref as any) === "object") (ref as any).current = node
        }
        
        const handleDragStart = () => {
            // === DRAG START: Initialize new gesture ===
            // Reset TEMPORARY rotation values but keep PERSISTENT rotation from previous gestures
            // - isDragging: true (enables gestureRotation in rotation listener)
            // - gestureRotation: 0 (reset temporary rotation for new gesture)  
            // - hasSnapped: false (allow this gesture to apply rotation)
            // - rotation: UNCHANGED (keep accumulated rotation from previous drags)
            setStore({ isDragging: true, gestureRotation: 0, hasSnapped: false })
            //console.log('🔄 Central drag started - gestureRotation = 0 (rotation unchanged)')
            //console.log('🔄 RenderTarget:', RenderTarget.current())
        }

        // Detect initial variant from the instance name (also works on Canvas)
        useLayoutEffect(() => {
            if (store.isInitialized) return
            // Only do DOM-based initialization on the Canvas
            if (RenderTarget.current() !== RenderTarget.canvas) return
            const root: Document | null = typeof document !== 'undefined' ? document : null
            if (!root) return

            const devices = ['Desktop', 'Tablet', 'Phone']
            let foundIndex = -1
            
            for (const device of devices) {
                for (let i = 0; i < VARIANT_KEYS.length; i++) {
                    const key = VARIANT_KEYS[i]
                    const variantName = `${device} - Main - ${key.charAt(0).toUpperCase() + key.slice(1)}`
                    const el = root.querySelector(`[data-framer-name="${variantName}"]`)
                    if (el) {
                        foundIndex = i
                        break
                    }
                }
                if (foundIndex >= 0) break
            }
            const initialIndex = foundIndex >= 0 ? foundIndex : 0
            setStore({
                currentIndex: initialIndex,
                rotation: 0, // Start with 0° rotation for incremental system
                gestureRotation: 0,
                isDragging: false,
                hasSnapped: false,
                isInitialized: true,
            })
            //console.log('🔎 CANVAS Init via exact match => index', initialIndex, 'rotation:', initialRotation + '°')
        }, [store.isInitialized])

        // In Preview: initialize once based on URL or data-framer-name, then allow drag interactions
        useEffect(() => {
            if (store.isInitialized) return
            if (RenderTarget.current() !== RenderTarget.preview) return
            
            // Try to detect variant from data-framer-name first, then fallback to URL
            const root: Document | null = typeof document !== 'undefined' ? document : null
            let foundIndex = -1
            
            if (root) {
                const devices = ['Desktop', 'Tablet', 'Phone']
                for (const device of devices) {
                    for (let i = 0; i < VARIANT_KEYS.length; i++) {
                        const key = VARIANT_KEYS[i]
                        const variantName = `${device} - Main - ${key.charAt(0).toUpperCase() + key.slice(1)}`
                        const el = root.querySelector(`[data-framer-name="${variantName}"]`)
                        if (el) {
                            foundIndex = i
                            break
                        }
                    }
                    if (foundIndex >= 0) break
                }
            }
            
            // Fallback to URL detection
            if (foundIndex === -1) {
                const href = typeof window !== 'undefined' ? window.location.href.toLowerCase() : ''
                foundIndex = VARIANT_KEYS.findIndex(k => href.includes(k))
            }
            
            const initialIndex = foundIndex >= 0 ? foundIndex : 0
            
            setStore({
                currentIndex: initialIndex,
                rotation: 0, // Start with 0° rotation for incremental system
                gestureRotation: 0,
                isDragging: false,
                hasSnapped: false,
                isInitialized: true,
            })
            //console.log('🔎 PREVIEW Init => index', initialIndex, 'rotation:', initialRotation + '°')
        }, [store.isInitialized])

        // Listen for variant changes (Canvas and Preview) and keep store in sync
        useEffect(() => {
            // Keep store in sync with active variant ONLY on Canvas
            if (RenderTarget.current() !== RenderTarget.canvas) return
            const root: Document | null = typeof document !== 'undefined' ? document : null
            if (!root) return
            const devices = ['Desktop', 'Tablet', 'Phone']
            const computeIndex = () => {
                for (const device of devices) {
                    for (let i = 0; i < VARIANT_KEYS.length; i++) {
                        const key = VARIANT_KEYS[i]
                        const variantName = `${device} - Main - ${key.charAt(0).toUpperCase() + key.slice(1)}`
                        const el = root.querySelector(`[data-framer-name="${variantName}"]`)
                        if (el) return i
                    }
                }
                return 0
            }
            const apply = () => {
                // === DISABLE CANVAS SYNC DURING DRAG ===
                // Never override user drag changes
                if (store.isDragging) {
                    console.log('🔎 CANVAS Sync: DISABLED - user is dragging')
                    return
                }
                
                const idx = computeIndex()
                if (idx !== store.currentIndex) {
                    // For incremental system, don't change rotation when Canvas syncs variants
                    // The rotation should only change from user interactions, not Canvas changes
                    console.log('🔎 CANVAS Sync: switching to index', idx, 'rotation unchanged at', store.rotation)
                    setStore({ currentIndex: idx, rotation: store.rotation, gestureRotation: 0, hasSnapped: false })
                }
            }
            // Initial sync
            apply()
            // Observe data-framer-name changes anywhere
            const observer = new MutationObserver(() => {
                // === DELAYED CANVAS SYNC: Wait for drag operations to complete ===
                // This prevents Canvas sync from immediately overriding drag changes
                setTimeout(() => apply(), 100)
            })
            observer.observe(root.documentElement, {
                attributes: true,
                subtree: true,
                attributeFilter: ['data-framer-name'],
            })
            return () => observer.disconnect()
        }, [store.currentIndex, setStore])

        const handleDrag = (event: any, info: any) => {
            //console.log('🔄 Drag event - offsetX:', info.offset.x, 'hasSnapped:', store.hasSnapped)
            
            // === DRAG PREVENTION: One rotation per gesture ===
            // If we already applied a ±90° rotation during this drag, ignore further updates
            // This prevents multiple snaps during a single long drag gesture
            if (store.hasSnapped) {
                //console.log('🔄 Ignoring drag - already snapped')
                return
            }

            // === THRESHOLD CALCULATION: Determine when to start rotating ===
            // rotationThreshold: Minimum distance to start any rotation (100px or 5% viewport width)
            // This prevents accidental rotations from small touches/movements
            const vwThreshold = typeof window !== 'undefined' ? window.innerWidth * 0.05 : 0
            const rotationThreshold = Math.max(100, vwThreshold) // px or 5vw, whichever is larger
            
            //console.log('🔄 Threshold check - offsetX:', Math.abs(info.offset.x), 'threshold:', rotationThreshold)
            
            // === BELOW THRESHOLD: No rotation yet ===
            if (Math.abs(info.offset.x) < rotationThreshold) {
                // Movement too small - reset any temporary rotation and wait for more movement
                //console.log('🔄 Drag too small - below threshold')
                setStore({ gestureRotation: 0 })
                return
            }
            
            // === GESTURE ROTATION: Subtle tilt during drag ===
            // Creates visual feedback showing rotation direction without committing to full rotation
            // Maps drag progress to 0°-8° rotation for subtle tilt effect
            const maxRotation = 8  // Maximum tilt during gesture (degrees)
            const dragProgress = (Math.abs(info.offset.x) - rotationThreshold) / rotationThreshold
            const currentDragRotation = Math.min(dragProgress * maxRotation, maxRotation)
            
            // === ROTATION DIRECTION: Apply rotation based on drag direction ===
            // info.offset.x > 0: drag right → next variant → clockwise (positive rotation)
            // info.offset.x < 0: drag left → previous variant → counter-clockwise (negative rotation)
            const newRotation = info.offset.x > 0 
                ? currentDragRotation   // clockwise (right drag = next)
                : -currentDragRotation  // counter-clockwise (left drag = previous)
            
            // Update TEMPORARY gestureRotation (will be added to persistent rotation in listener)
            setStore({ gestureRotation: newRotation })
            //console.log('🔄 Central drag - gestureRotation:', newRotation, 'offsetX:', info.offset.x)
        }

        const handleDragEnd = (event: any, info: any) => {
            console.log('🔄 Drag end - offsetX:', info.offset.x)
            
            // === THRESHOLD CHECK: 100px minimum for variant change ===
            const threshold = 100 // Fixed 100px threshold
            
            if (Math.abs(info.offset.x) < threshold) {
                // Too small - just clear drag state, no variant change
                setStore({ isDragging: false, gestureRotation: 0, hasSnapped: false })
                console.log('🔄 Drag too small - no changes')
                return
            }
            
            // === DRAG > 100px: Switch variant AND update rotation to match ===
            let newIndex
            
            if (info.offset.x > 0) {
                // Dragged right - next variant (clockwise)
                newIndex = (store.currentIndex + 1) % store.contentVariants.length
                console.log('🚀 RIGHT: next variant (clockwise)')
            } else {
                // Dragged left - previous variant (counter-clockwise)  
                newIndex = store.currentIndex === 0 
                    ? store.contentVariants.length - 1 
                    : store.currentIndex - 1
                console.log('🚀 LEFT: previous variant (counter-clockwise)')
            }
            
            // === INCREMENTAL ROTATION: Add/subtract 90° from current rotation ===
            // Each drag gesture increments/decrements the rotation by 90°
            // This creates a continuous spinning effect that can go beyond 360°
            const rotationDelta = info.offset.x > 0 ? 90 : -90  // +90° for right drag, -90° for left drag
            const newRotation = store.rotation + rotationDelta
            
            console.log('🔄 APPLYING: variant', store.contentVariants[newIndex], 'index', newIndex, 'rotation', newRotation)
            
            // === ATOMIC: Variant + rotation change together ===
            setStore({ 
                currentIndex: newIndex,
                rotation: newRotation,
                gestureRotation: 0,
                hasSnapped: false,
                isDragging: false
            })
        }

        return (
            <Component
                ref={setMergedRef}
                {...props}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
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
 * Variant Initialization Override - ONLY handles initial variant setup
 * Sets the initial variant based on data-framer-name or URL, then stops listening
 * Apply this to components that need initial variant but shouldn't change dynamically
 * The rotation of the parent container will create the visual effect of switching variants
 */
export function withVariantInitialization(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store] = useVariantStore()
        const initialVariantRef = useRef<string | null>(null)
        
        // === INITIALIZATION ONLY: Get initial variant from store once, never change ===
        // Wait for store to be initialized, capture the variant, then never update it
        // The parent rotation handles the visual switching effect
        
        if (!store.isInitialized) {
            // Return default variant while waiting for store
            return (
                <Component
                    ref={ref}
                    {...props}
                    variant="Breakfast"
                />
            )
        }
        
        // Once store is initialized, capture the variant ONCE and never change it
        if (initialVariantRef.current === null) {
            const initialVariant = store.contentVariants[store.currentIndex]
            initialVariantRef.current = initialVariant
            console.log("🔎 Variant initialization - CAPTURED variant:", initialVariant, "at index:", store.currentIndex, "- will never change")
        }
        
        // Always use the captured initial variant (never changes)
        return (
            <Component
                ref={ref}
                {...props}
                variant={initialVariantRef.current!}
            />
        )
    })
}

/**
 * Variant Listener Override - Listens to store changes and applies variants
 * Apply this to components that should change variants based on store updates
 */
export function withContentVariantListener(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store] = useVariantStore()
        const currentVariant = store.contentVariants[store.currentIndex]

        // === INCREMENTAL ROTATION SYSTEM ===
        // With incremental rotations, rotation and variant index are independent
        // Rotation accumulates from user interactions, variant changes from store updates
        // No need to check for mismatches in this system
        
        //console.log("👂 Variant listener - applying variant:", currentVariant)

        //console.log("👂 Variant listener - applying variant:", currentVariant)

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
        
        // === SIMPLIFIED ROTATION: Always start from 0°, accumulate ±90° increments ===
        // - store.rotation: Cumulative ±90° rotations from all completed drag gestures (starts at 0°)
        // - store.gestureRotation: 0°-8° tilt during active drag for visual feedback
        // Example states:
        // - At rest: currentRotation = 180° + 0° = 180°
        // - During drag: currentRotation = 180° + (-3°) = 177° (shows tilt direction)
        // - After snap: currentRotation = 270° + 0° = 270° (new persistent rotation)
        const currentRotation = store.rotation + (store.isDragging ? store.gestureRotation : 0)
        
        //console.log('🔄 Rotation listener - applying rotation:', currentRotation)

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

/**
 * Button Override: withNext
 * - Goes to the previous variant
 * - Applies +90deg rotation increment
 */
export function withPrevious(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()

        const handleClick = (event?: any) => {
            // === BUTTON ROTATION: Go to next variant with incremental rotation ===
            // Advances to next variant AND adds +90° to current rotation
            // This creates the same incremental effect as drag gestures
            const nextIndex = (store.currentIndex + 1) % store.contentVariants.length
            const newRotation = store.rotation + 90  // Add +90° to current rotation
            setStore({
                currentIndex: nextIndex,           // Switch to next variant
                rotation: newRotation,            // Increment rotation by +90°
                gestureRotation: 0,               // Clear any temporary rotation
                hasSnapped: true,                 // Mark as "completed gesture" state
                isDragging: false,                // Ensure drag state is clear
            })
            if (props.onClick) props.onClick(event)
            if (props.onTap) props.onTap(event)
        }

        return (
            <Component
                ref={ref}
                {...props}
                onClick={handleClick}
                onTap={handleClick}
            />
        )
    })
}

/**
 * Button Override: withPrevious
 * - Goes to next variant (wrap-around)
 * - Applies -90deg rotation increment
 */
export function withNext(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()

        const handleClick = (event?: any) => {
            // === BUTTON ROTATION: Go to previous variant with incremental rotation ===
            // Goes to previous variant AND subtracts -90° from current rotation
            // This creates the same incremental effect as drag gestures
            const prevIndex = store.currentIndex === 0 ? store.contentVariants.length - 1 : store.currentIndex - 1
            const newRotation = store.rotation - 90  // Subtract -90° from current rotation
            setStore({
                currentIndex: prevIndex,           // Switch to previous variant
                rotation: newRotation,            // Decrement rotation by -90°
                gestureRotation: 0,               // Clear any temporary rotation
                hasSnapped: true,                 // Mark as "completed gesture" state
                isDragging: false,                // Ensure drag state is clear
            })
            if (props.onClick) props.onClick(event)
            if (props.onTap) props.onTap(event)
        }

        return (
            <Component
                ref={ref}
                {...props}
                onClick={handleClick}
                onTap={handleClick}
            />
        )
    })
}
