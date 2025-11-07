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
 * - Sets flowType based on the flowType prop passed
 * - Marks isInitialized as true
 * 
 * The breakpoint-specific components (Desktop, Tablet, Phone) will read from these stores.
 * They should NEVER modify stores themselves - they are READ ONLY.
 */
export default function Orchestrator({ flowType = "gated" }: { flowType?: "gated" | "nonGated" }) {
    const [, setVariantStore] = useVariantStore()
    const [, setFormStore] = useFormStore()

    useEffect(() => {
        setVariantStore({
            currentStep: 1,
            flowType: flowType,
            isInitialized: true,
            errors: {
                merchantGMV: false,
                averageOrderValue: false,
                lmnAttachRate: false,
            },
        })

        setFormStore({
            merchantGMV: 0,
            averageOrderValue: 0,
            lmnAttachRate: 0,
            transactionVolume: 0,
            isFormValid: false,
        })

        const clearInputs = () => {
            const gmvInput = document.querySelector('input[name="MerchantGMV"]') as HTMLInputElement
            const aovInput = document.querySelector('input[name="AOV"]') as HTMLInputElement
            const lmnInput = document.querySelector('input[name="LMN"]') as HTMLInputElement
            const txnInput = document.querySelector('input[name="TransactionVolume"]') as HTMLInputElement

            if (gmvInput) gmvInput.value = ""
            if (aovInput) aovInput.value = ""
            if (lmnInput) lmnInput.value = ""
            if (txnInput) txnInput.value = "0"
        }

        clearInputs()
        const timeout100 = setTimeout(clearInputs, 100)
        const timeout500 = setTimeout(clearInputs, 500)

        return () => {
            clearTimeout(timeout100)
            clearTimeout(timeout500)
        }
    }, [flowType, setVariantStore, setFormStore])

    return <div></div>
}
