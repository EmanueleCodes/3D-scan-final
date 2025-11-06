import { useEffect } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// ============================================
// STORES - Single source of truth
// ============================================

// Shared store for form values and calculations
export const useFormStore = createStore({
    merchantGMV: 0,
    averageOrderValue: 0,
    lmnAttachRate: 0,
    transactionVolume: 0,
    isFormValid: false,
})

// Store for tracking step state and validation errors (breakpoint-independent)
export const useVariantStore = createStore({
    currentStep: 1, // 1, 2, or 3 (same for all components)
    flowType: "gated", // "gated" or "nonGated" - determines if 1→2 or 1→3
    isInitialized: false, // Flag to prevent reinitializing when switching breakpoints
    errors: {
        merchantGMV: false,
        averageOrderValue: false,
        lmnAttachRate: false,
    },
})

// ============================================
// ORCHESTRATOR COMPONENT
// ============================================

/**
 * Orchestrator Component
 * 
 * This component is INVISIBLE and NEVER CHANGES across breakpoints.
 * It acts as the single source of truth for:
 * - Form input values (merchantGMV, averageOrderValue, transactionVolume, lmnAttachRate)
 * - Variant state (currentStep, flowType)
 * - Initialization flag (isInitialized)
 * 
 * It initializes on EVERY page reload/mount:
 * - Sets all form values to 0
 * - Sets currentStep to 1
 * - Sets flowType to "gated" (default, overridden by withGatedContent/withNonGatedContent)
 * - Marks isInitialized as true
 * 
 * The breakpoint-specific components (Desktop, Tablet, Phone) will read from these stores.
 * They should NEVER initialize stores themselves.
 */
export default function Orchestrator() {
    const [, setVariantStore] = useVariantStore()
    const [, setFormStore] = useFormStore()

    useEffect(() => {
        console.log("🎼 [ORCHESTRATOR] Initializing stores to Step 1")

        // Always reset to Step 1 on mount (page reload)
        setVariantStore({
            currentStep: 1,
            flowType: "gated", // Default, will be overridden by withGatedContent/withNonGatedContent
            isInitialized: true,
            errors: {
                merchantGMV: false,
                averageOrderValue: false,
                lmnAttachRate: false,
            },
        })

        // Clear all form inputs
        setFormStore({
            merchantGMV: 0,
            averageOrderValue: 0,
            lmnAttachRate: 0,
            transactionVolume: 0,
            isFormValid: false,
        })

        console.log("✅ [ORCHESTRATOR] Initialization complete - Step 1 set")
    }, []) // Empty deps - runs once on mount

    // Component is invisible
    return <div style={{ display: "none" }}></div>
}
