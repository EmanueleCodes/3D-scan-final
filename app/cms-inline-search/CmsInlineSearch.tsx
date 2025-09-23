import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface CmsInlineSearchProps {
    targetId: string
    placeholder: string
    borderRadius: number
    padding: number
    font?: React.CSSProperties
    placeholderColor: string
    textColor: string
    backgroundColor: string
    borderColor: string
    borderWidth: number
    focusColor: string
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 50
 * @framerDisableUnlink
 */
export default function CmsInlineSearch(props: CmsInlineSearchProps) {
    const {
        targetId = "articles",
        placeholder = "Search articles...",
        borderRadius = 8,
        padding = 16,
        font = {},
        placeholderColor = "#999999",
        textColor = "#000000",
        backgroundColor = "#ffffff",
        borderColor = "#e0e0e0",
        borderWidth = 1,
        focusColor = "#007bff",
    } = props

    const [searchText, setSearchText] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Filter function that searches through DOM elements
    const filterElements = (searchTerm: string) => {
        const targetElement = document.getElementById(targetId)
        if (!targetElement) return

        // Get all direct children of the target element
        const children = Array.from(targetElement.children)

        children.forEach((child) => {
            // Get all text content from the element and its descendants
            const textContent = child.textContent?.toLowerCase() || ""
            const searchTermLower = searchTerm.toLowerCase()

            if (searchTermLower === "" || textContent.includes(searchTermLower)) {
                // Show the element
                ;(child as HTMLElement).style.display = ""
            } else {
                // Hide the element
                ;(child as HTMLElement).style.display = "none"
            }
        })
    }

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchText(value)
        filterElements(value)
    }

    // Reset filter when component unmounts
    useEffect(() => {
        return () => {
            // Reset all children to visible when component unmounts
            const targetElement = document.getElementById(targetId)
            if (targetElement) {
                const children = Array.from(targetElement.children)
                children.forEach((child) => {
                    ;(child as HTMLElement).style.display = ""
                })
            }
        }
    }, [])

    // Initial filter when targetId changes
    useEffect(() => {
        filterElements(searchText)
    }, [targetId])

    return (
        <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            style={{
                width: "100%",
                height: "100%",
                padding: `${padding}px`,
                fontSize: font.fontSize,
                fontWeight: font.fontWeight || "400",
                fontFamily: font.fontFamily || "system-ui, -apple-system, sans-serif",
                fontStyle: font.fontStyle,
                textDecoration: font.textDecoration,
                letterSpacing: font.letterSpacing,
                lineHeight: font.lineHeight,
                color: textColor,
                backgroundColor: backgroundColor,
                border: `${borderWidth}px solid ${isFocused ? focusColor : borderColor}`,
                borderRadius: `${borderRadius}px`,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease",
                // Placeholder styling
                "::placeholder": {
                    color: placeholderColor,
                },
            }}
            // Handle placeholder color with CSS-in-JS
            className="cms-inline-search-input"
        />
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(CmsInlineSearch, {
    targetId: {
        type: ControlType.String,
        title: "Target",
        defaultValue: "articles",
    },
    placeholder: {
        type: ControlType.String,
        title: "Placeholder",
        defaultValue: "Search articles...",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 8,
        unit: "px",
    },
    padding: {
        type: ControlType.Number,
        title: "Padding",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 16,
        unit: "px",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 16,
            //@ts-ignore
            fontWeight: "400",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#000000",
    },
    placeholderColor: {
        type: ControlType.Color,
        title: "Placeholder",
        defaultValue: "#999999",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#ffffff",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: "#e0e0e0",
    },
    borderWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 1,
        unit: "px",
    },
    focusColor: {
        type: ControlType.Color,
        title: "Focus",
        defaultValue: "#007bff",
    },
})

CmsInlineSearch.displayName = "CMS Inline Search"
