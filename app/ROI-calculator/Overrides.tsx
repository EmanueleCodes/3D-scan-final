import type { ComponentType } from "react"
import { useEffect, useState } from "react"
import { useFormStore, useVariantStore } from "./Orchestrator.tsx"

// Hide number input spinners (up/down arrows)
if (typeof document !== "undefined") {
    const style = document.createElement("style")
    style.textContent = `
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
    `
    document.head.appendChild(style)
}

interface OverrideProps {
    style?: React.CSSProperties
    text?: string
    value?: string
    nextStep?: number
    [key: string]: unknown
}

// Constants for calculations
const VOLUME_UPLIFT = 0.10 // 10%
const TRANSACTION_FEE_PERCENT = 0.045 // 4.50%
const TRANSACTION_FEE_DOLLAR = 0.30 // $0.30
const LMN_FEE = 10 // $10

// Utility function to format currency
function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

// Utility function to format number with commas and up to 2 decimals
function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}

// Utility function to parse input value
function parseInputValue(value: string): number {
    const cleaned = value.replace(/[^0-9.]/g, "")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
}

// 1. withGMV - Reads and validates Merchant Annual GMV input
export function withGMV<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="MerchantGMV"]'
            ) as HTMLInputElement
            
            if (input && store.merchantGMV > 0) {
                input.value = String(store.merchantGMV)
            }
        }, []) // Empty deps - run once on mount

        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="MerchantGMV"]'
                ) as HTMLInputElement
                
                if (input && input.value !== localValue) {
                    setLocalValue(input.value)
                    const parsedValue = parseInputValue(input.value)
                    
                    setStore({
                        ...store,
                        merchantGMV: parsedValue,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore])

        return <Component {...props} />
    }
}

// 2. withAOV - Reads and validates Average Order Value input
export function withAOV<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="AOV"]'
            ) as HTMLInputElement
            
            if (input && store.averageOrderValue > 0) {
                input.value = String(store.averageOrderValue)
            }
        }, []) // Empty deps - run once on mount

        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="AOV"]'
                ) as HTMLInputElement
                
                if (input && input.value !== localValue) {
                    setLocalValue(input.value)
                    const parsedValue = parseInputValue(input.value)
                    
                    setStore({
                        ...store,
                        averageOrderValue: parsedValue,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore])

        return <Component {...props} />
    }
}

// 3. withLMN - Reads and validates LMN Attach Rate input
export function withLMN<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [localValue, setLocalValue] = useState("")

        // Initialize input value from store on mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="LMN"]'
            ) as HTMLInputElement
            
            if (input && store.lmnAttachRate > 0) {
                const percentageValue = store.lmnAttachRate * 100
                input.value = String(percentageValue)
            }
        }, []) // Empty deps - run once on mount

        useEffect(() => {
            const interval = setInterval(() => {
                const input = document.querySelector(
                    'input[name="LMN"]'
                ) as HTMLInputElement
                
                if (input && input.value !== localValue) {
                    setLocalValue(input.value)
                    const parsedValue = parseInputValue(input.value)
                    
                    // Convert percentage to decimal (e.g., 50 -> 0.50)
                    const decimalValue = parsedValue / 100
                    
                    setStore({
                        ...store,
                        lmnAttachRate: decimalValue,
                    })
                }
            }, 100)

            return () => clearInterval(interval)
        }, [localValue, store, setStore])

        return <Component {...props} />
    }
}

// 4. withTransactionVolume - Calculates and displays Transaction Volume
// Can be applied to TEXT element (for display only) or INPUT element (for display + update)
export function withTransactionVolume<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store, setStore] = useFormStore()
        const [displayValue, setDisplayValue] = useState("0")

        // Initialize transaction volume to 0 on component mount
        useEffect(() => {
            const input = document.querySelector(
                'input[name="TransactionVolume"]'
            ) as HTMLInputElement
            
            if (input) {
                input.value = "0"
            }
        }, [])

        useEffect(() => {
            const { merchantGMV, averageOrderValue } = store

            // Calculate Transaction Volume (keep up to 2 decimal places)
            let transactionVolume = 0
            if (averageOrderValue > 0) {
                transactionVolume = merchantGMV / averageOrderValue
            }

            // Update store with calculated value (only if significantly changed to avoid loops)
            const difference = Math.abs(store.transactionVolume - transactionVolume)

            if (difference > 0.01) {
                setStore({
                    ...store,
                    transactionVolume,
                })
            }

            // Format for display with commas and up to 2 decimals
            const formatted = transactionVolume > 0 
                ? formatNumber(transactionVolume) 
                : "0"
            
            setDisplayValue(formatted)

            // Also update the input field if it exists
            // NOTE: Use unformatted value for input (no commas) - HTML number inputs reject commas
            const input = document.querySelector(
                'input[name="TransactionVolume"]'
            ) as HTMLInputElement
            
            if (input) {
                const unformatted = transactionVolume > 0 
                    ? transactionVolume.toFixed(2)
                    : "0"
                input.value = unformatted
            }
        }, [store.merchantGMV, store.averageOrderValue, store.transactionVolume, setStore])

        return (
            <Component
                {...props}
                text={displayValue}
                style={{
                    ...props.style,
                    opacity: store.transactionVolume > 0 ? 1 : 0.5,
                }}
            />
        )
    }
}

// 5. withIncrementalGMV - Calculates and displays Incremental GMV
export function withIncrementalGMV<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()
        const [displayValue, setDisplayValue] = useState("$0")

        useEffect(() => {
            const { merchantGMV } = store

            // Calculate Incremental GMV
            const incrementalGMV = merchantGMV * VOLUME_UPLIFT

            // Format for display
            setDisplayValue(formatCurrency(incrementalGMV))
        }, [store.merchantGMV])

        return <Component {...props} text={displayValue} />
    }
}

// 6. withROI - Calculates and displays Merchant ROI (Flex)
export function withROI<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()
        const [displayValue, setDisplayValue] = useState("0.00x")

        useEffect(() => {
            const {
                merchantGMV,
                transactionVolume,
                lmnAttachRate,
            } = store

            // Calculate Incremental GMV
            const incrementalGMV = merchantGMV * VOLUME_UPLIFT

            // Calculate Total Flex Fee
            const component1 =
                TRANSACTION_FEE_PERCENT * merchantGMV * (1 + VOLUME_UPLIFT) * VOLUME_UPLIFT
            const component2 =
                TRANSACTION_FEE_DOLLAR * transactionVolume * VOLUME_UPLIFT
            const component3 =
                LMN_FEE * transactionVolume * VOLUME_UPLIFT * lmnAttachRate

            const totalFlexFee = component1 + component2 + component3

            // Calculate ROI
            let roi = 0
            if (totalFlexFee > 0) {
                roi = incrementalGMV / totalFlexFee
            }

            // Format for display
            setDisplayValue(`${roi.toFixed(2)}x`)
        }, [
            store.merchantGMV,
            store.transactionVolume,
            store.lmnAttachRate,
        ])

        return <Component {...props} text={displayValue} />
    }
}

// Bonus: Override to validate entire form and switch variants
export function withFormValidation<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()
        const [isValid, setIsValid] = useState(false)

        useEffect(() => {
            // Check if all required fields are filled
            const valid =
                store.merchantGMV > 0 &&
                store.averageOrderValue > 0 &&
                store.lmnAttachRate > 0

            setIsValid(valid)
        }, [
            store.merchantGMV,
            store.averageOrderValue,
            store.lmnAttachRate,
        ])

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: isValid ? 1 : 0.5,
                    pointerEvents: isValid ? "auto" : "none",
                }}
            />
        )
    }
}



// Helper function for form validation
function validateForm(formStore: Record<string, number>): Record<string, boolean> {
    return {
        merchantGMV: formStore.merchantGMV <= 0,
        averageOrderValue: formStore.averageOrderValue <= 0,
        lmnAttachRate: formStore.lmnAttachRate <= 0,
    }
}

// 6b. withStepVariant - Apply to MAIN COMPONENT to sync variant with current step
// Reads currentStep from store and applies the correct variant
export function withStepVariant<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore] = useVariantStore()

        // Map step number to variant name
        const variantMap: Record<number, string> = {
            1: "Step 1",
            2: "Step 2",
            3: "Step 3",
        }

        const targetVariant = variantMap[variantStore.currentStep] || "Step 1"
        return (
            <Component
                {...props}
                variant={targetVariant}
            />
        )
    }
}

// 7. withGatedContent - Apply to MAIN COMPONENT for gated flow (Step 1 → Step 2 → Step 3)
// Sets flowType to "gated" immediately on mount, then applies variant from store
export function withGatedContent<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        // ALWAYS force flowType to "gated" on every render until it sticks
        useEffect(() => {
            if (variantStore.flowType !== "gated") {
                setVariantStore({
                    ...variantStore,
                    flowType: "gated",
                })
            }
        }, [variantStore.flowType]) // Only depend on flowType

        // Map step number to variant name
        const variantMap: Record<number, string> = {
            1: "Step 1",
            2: "Step 2",
            3: "Step 3",
        }

        const targetVariant = variantMap[variantStore.currentStep] || "Step 1"
        return (
            <Component
                {...props}
                variant={targetVariant}
            />
        )
    }
}

// 8. withNonGatedContent - Apply to MAIN COMPONENT for non-gated flow (Step 1 → Step 3)
// Sets flowType to "nonGated" immediately on mount, then applies variant from store
export function withNonGatedContent<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        // ALWAYS force flowType to "nonGated" on every render until it sticks
        useEffect(() => {
            if (variantStore.flowType !== "nonGated") {
                setVariantStore({
                    ...variantStore,
                    flowType: "nonGated",
                })
            }
        }, [variantStore.flowType]) // Only depend on flowType

        // Map step number to variant name
        const variantMap: Record<number, string> = {
            1: "Step 1",
            2: "Step 2",
            3: "Step 3",
        }

        const targetVariant = variantMap[variantStore.currentStep] || "Step 1"
        return (
            <Component
                {...props}
                variant={targetVariant}
            />
        )
    }
}

// 9. withStepButton - Apply to BUTTON to advance from Step 1 ONLY
// This button ONLY handles Step 1 → Step 2 (gated) or Step 1 → Step 3 (nonGated)
// All other transitions (Step 2 → Step 3) are handled by Framer variants
export function withStepButton<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [formStore] = useFormStore()
        const [variantStore, setVariantStore] = useVariantStore()

        const handleClick = () => {
            // ONLY handle clicks when on Step 1
            if (variantStore.currentStep !== 1) {
                return
            }

            // Clear all error messages first
            clearErrorMessages()

            // Validate all required fields
            const errors = validateForm(formStore)
            const hasErrors = Object.values(errors).some(Boolean)

            if (hasErrors) {
                displayErrorMessages(errors)
            } else {
                // Determine next step based on flow type
                const nextStep = variantStore.flowType === "gated" ? 2 : 3

                setVariantStore({
                    ...variantStore,
                    currentStep: nextStep,
                    errors: {
                        merchantGMV: false,
                        averageOrderValue: false,
                        lmnAttachRate: false,
                    },
                })
            }
        }

        return (
            <Component
                {...props}
                onClick={handleClick}
            />
        )
    }
}

// 10. withStep3Indicator - Apply to the FINAL CTA BUTTON (visible only on Step 3)
// When this button mounts, it tells the store we're at Step 3
export function withStep3Indicator<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        useEffect(() => {
            // When this component mounts, we're at Step 3
            if (variantStore.currentStep !== 3) {
                setVariantStore({
                    ...variantStore,
                    currentStep: 3,
                })
            }
        }, []) // Empty deps - runs once on mount

        return <Component {...props} />
    }
}

// Helper function to clear all error messages
function clearErrorMessages(): void {
    document.querySelectorAll("[data-error-message]").forEach((el) => {
        el.remove()
    })
}

// Helper function to display error messages
function displayErrorMessages(
    errors: Record<string, boolean>
): void {
    // Add error messages for invalid fields
    if (errors.merchantGMV) {
        addErrorMessage("MerchantGMV", "This field is required")
    }
    if (errors.averageOrderValue) {
        addErrorMessage("AOV", "This field is required")
    }
    if (errors.lmnAttachRate) {
        addErrorMessage("LMN", "This field is required")
    }
}

// Helper function to add an error message below an input
function addErrorMessage(inputName: string, message: string): void {
    const input = document.querySelector(
        `input[name="${inputName}"]`
    ) as HTMLInputElement

    if (!input) return

    // Create error message element
    const errorEl = document.createElement("div")
    errorEl.setAttribute("data-error-message", inputName)
    errorEl.style.cssText = `
        display: flex;
        width:100%;
        text-align:right;
        position:absolute;
        opacity:1;
        bottom:-22px;
        right:0,
        color:#060045;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: -1.5%;
        white-space: nowrap;
    `
    errorEl.textContent = message

    // Insert after input in the DOM
    input.parentElement?.parentElement?.appendChild(errorEl)
}
