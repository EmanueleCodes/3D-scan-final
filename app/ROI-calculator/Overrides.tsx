import type { ComponentType } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Create a shared store for form validation state
export const useFormStore = createStore({
    isFormValid: false,
    currentVariant: 1,
    formData: {
        name: "",
        email: "",
    },
})

interface FramerComponentProps {
    variant?: string
    style?: React.CSSProperties
    [key: string]: unknown
}

// Override to switch component variants based on form validation
export function withVariantSwitch<T extends FramerComponentProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()

        // Switch to the variant based on store
        const variantToShow = store.currentVariant === 2 ? "Variant 2" : props.variant

        return <Component {...props} variant={variantToShow as T["variant"]} />
    }
}

// Override to show/hide elements based on form validation
export function withFormValidation<T extends FramerComponentProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()

        // Hide component if form is not valid
        if (!store.isFormValid) {
            return null
        }

        return <Component {...props} />
    }
}

// Override to display form data
export function withFormData<T extends FramerComponentProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [store] = useFormStore()

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: store.isFormValid ? 1 : 0.5,
                }}
            />
        )
    }
}

