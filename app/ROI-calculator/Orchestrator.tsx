import { useEffect, useState } from "react"
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
    const [variantStore, setVariantStore] = useVariantStore()
    const [formStore, setFormStore] = useFormStore()
    const [mountCount, setMountCount] = useState(0)

    // Track mounts (initialization)
    useEffect(() => {
        setMountCount(prev => prev + 1)
        const currentMount = mountCount + 1
        console.log(`🎼 [ORCHESTRATOR] MOUNT #${currentMount} - Initializing stores to Step 1 (${flowType})`)

        // Always reset to Step 1 on mount (page reload)
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

        // Clear all form inputs
        setFormStore({
            merchantGMV: 0,
            averageOrderValue: 0,
            lmnAttachRate: 0,
            transactionVolume: 0,
            isFormValid: false,
        })

        console.log(`✅ [ORCHESTRATOR] Mount #${currentMount} initialization complete - Step 1, flowType: ${flowType}`)
        
        return () => {
            console.log(`🔴 [ORCHESTRATOR] UNMOUNT detected! This should NEVER happen!`)
        }
    }, []) // Empty deps - runs once on mount (flowType doesn't change after mount)

    // Debug panel
    return (
        <div style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            background: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "monospace",
            zIndex: 999999,
            minWidth: "250px",
            border: "2px solid #00ff00"
        }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#00ff00" }}>
                🎼 Orchestrator Debug
            </div>
            <div>Mounts: <strong>{mountCount}</strong> {mountCount > 1 && <span style={{color: "red"}}>⚠️</span>}</div>
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #333" }}>
                <div>Current Step: <strong style={{ color: "#00ff00" }}>{variantStore.currentStep}</strong></div>
                <div>Flow Type: <strong style={{ color: "#00ffff" }}>{variantStore.flowType}</strong></div>
                <div>Initialized: <strong>{variantStore.isInitialized ? "✅" : "❌"}</strong></div>
            </div>
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #333" }}>
                <div>GMV: ${formStore.merchantGMV.toLocaleString()}</div>
                <div>AOV: ${formStore.averageOrderValue.toLocaleString()}</div>
                <div>LMN: {(formStore.lmnAttachRate * 100).toFixed(0)}%</div>
            </div>
        </div>
    )
}
