import React, { useState, useEffect } from "react"
import { addPropertyControls, ControlType } from "framer"
import { useFormStore } from "./Overrides.tsx"

interface FieldValidation {
    fieldName: string
}

interface FramerFormButtonProps {
    text: string
    requiredFields: FieldValidation[]
    emailFields: FieldValidation[]
    backgroundColor: string
    disabledColor: string
    textColor: string
    style?: React.CSSProperties
    onTap?: () => void
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function FramerFormButton(props: FramerFormButtonProps) {
    const {
        text,
        requiredFields,
        emailFields,
        backgroundColor,
        disabledColor,
        textColor,
        style,
        onTap,
    } = props

    const [isDisabled, setIsDisabled] = useState(true)
    const [formValues, setFormValues] = useState<Record<string, string>>({})
    const [store, setStore] = useFormStore()

    useEffect(() => {
        const validateForm = () => {
            // Find all inputs with the specified names
            const values: Record<string, string> = {}

            requiredFields.forEach((field) => {
                const input = document.querySelector(
                    `input[name="${field.fieldName}"]`
                ) as HTMLInputElement
                if (input) {
                    values[field.fieldName] = input.value
                }
            })

            emailFields.forEach((field) => {
                if (!values[field.fieldName]) {
                    const input = document.querySelector(
                        `input[name="${field.fieldName}"]`
                    ) as HTMLInputElement
                    if (input) {
                        values[field.fieldName] = input.value
                    }
                }
            })

            // Store values for later use on submit
            setFormValues(values)

            // Validate required fields
            const allFieldsFilled =
                requiredFields.length === 0
                    ? true
                    : requiredFields.every((field) => {
                          const value = values[field.fieldName]
                          return value && value.trim() !== ""
                      })

            // Validate email fields
            const emailsValid =
                emailFields.length === 0
                    ? true
                    : emailFields.every((field) => {
                          const value = values[field.fieldName]
                          if (!value || value.trim() === "") return false
                          return isValidEmail(value)
                      })

            const formIsValid = allFieldsFilled && emailsValid
            setIsDisabled(!formIsValid)
        }

        // Validate on mount
        validateForm()

        // Listen to input events on the document
        const handleInput = () => {
            validateForm()
        }

        document.addEventListener("input", handleInput)
        
        // Also check periodically (fallback)
        const interval = setInterval(validateForm, 500)

        return () => {
            document.removeEventListener("input", handleInput)
            clearInterval(interval)
        }
    }, [requiredFields, emailFields])

    const handleSubmit = () => {
        // Only update store and switch variant when button is clicked
        if (!isDisabled) {
            setStore({
                isFormValid: true,
                currentVariant: 2,
                formData: {
                    name: formValues["Name"] || "",
                    email: formValues["Email"] || "",
                },
            })
        }

        // Call original onTap handler if provided
        if (onTap) {
            onTap()
        }
    }

    return (
        <button
            onClick={handleSubmit}
            disabled={isDisabled}
            style={{
                ...style,
                padding: "16px 32px",
                fontSize: "16px",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                backgroundColor: isDisabled ? disabledColor : backgroundColor,
                color: textColor,
                transition: "all 0.2s ease",
                opacity: isDisabled ? 0.6 : 1,
            }}
        >
            {text}
        </button>
    )
}

FramerFormButton.defaultProps = {
    text: "Submit",
    requiredFields: [{ fieldName: "Name" }, { fieldName: "Email" }],
    emailFields: [{ fieldName: "Email" }],
    backgroundColor: "#6366f1",
    disabledColor: "#cccccc",
    textColor: "#ffffff",
}

addPropertyControls(FramerFormButton, {
    text: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Submit",
    },
    requiredFields: {
        type: ControlType.Array,
        title: "Required Fields",
        control: {
            type: ControlType.Object,
            controls: {
                fieldName: {
                    type: ControlType.String,
                    title: "Field Name",
                    placeholder: "e.g., Name, Email",
                },
            },
        },
        defaultValue: [{ fieldName: "Name" }, { fieldName: "Email" }],
    },
    emailFields: {
        type: ControlType.Array,
        title: "Email Fields",
        control: {
            type: ControlType.Object,
            controls: {
                fieldName: {
                    type: ControlType.String,
                    title: "Field Name",
                    placeholder: "e.g., Email",
                },
            },
        },
        defaultValue: [{ fieldName: "Email" }],
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background Color",
        defaultValue: "#6366f1",
    },
    disabledColor: {
        type: ControlType.Color,
        title: "Disabled Color",
        defaultValue: "#cccccc",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "#ffffff",
    },
})

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

