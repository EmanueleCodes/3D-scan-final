import { addPropertyControls, ControlType } from "framer"
import { useState, useRef, useEffect, useId } from "react"
import {
    Border,
    borderPropertyControl,
    fillProp,
    createBackground,
    superfieldsId,
    useInstanceId,
} from "./SuperfieldsShared.tsx"
import useSuperfieldsStore from "./Store.tsx"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 500
 * @framerDisableUnlink
 */
export default function SearchBar(props) {
    const { superfieldsId, placeholderColor, searchIcon, xButton } = props

    const id = useInstanceId()

    const inputRef = useRef(null)

    const [focused, setFocused] = useState(false)
    const [initialized, setInitialized] = useState(false)

    const [search, totalItems, setSearch] = useSuperfieldsStore(
        superfieldsId,
        (state) => [state.search, state.totalItems, state.setSearch]
    )

    useEffect(() => {
        setInitialized(true)
    }, [])

    function onXClick() {
        setSearch("")
    }

    // Top, right, bottom, left
    const paddingValues = parsePadding(props.padding)

    return (
        <div
            data-superfields
            id={id}
            style={{
                position: "relative",
                ...createBackground(props.fill),
                color: props.fontColor,
                borderRadius: props.radius,
                boxShadow: props.shadows,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: props.padding,
                gap: props.gap,
                cursor: "text",
                overflow: "hidden",
                backdropFilter: props.bgBlur
                    ? `blur(${props.bgBlur}px)`
                    : undefined,
                ...props.font,
                ...props.style,
            }}
            onClick={() => {
                inputRef.current?.focus()
            }}
        >
            {searchIcon && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={searchIcon.size}
                    height={searchIcon.size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={searchIcon.color}
                    stroke-width={searchIcon.lineWidth}
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style={{
                        opacity: searchIcon.opacity,
                        display: "block",
                        pointerEvents: "none",
                    }}
                >
                    <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                    <path d="M21 21l-6 -6" />
                </svg>
            )}
            <input
                ref={inputRef}
                type="text"
                style={{
                    border: "none",
                    color: props.fontColor,
                    background: "none",
                    ...props.font,
                    ...props.style,
                }}
                placeholder={props.placeholderText.replace(
                    "[items]",
                    String(!initialized || !totalItems ? 0 : totalItems)
                )}
                autoFocus={props.autoFocus}
                value={search ?? ""}
                onChange={(event) => {
                    setSearch(event.target.value)
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {search && initialized && xButton && (
                <div
                    style={{
                        position: "relative",
                        width: xButton.size,
                        display: "flex",
                        alignItems: "center",
                        alignSelf: "stretch",
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={xButton.size}
                        height={xButton.size}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={xButton.color}
                        stroke-width={xButton.lineWidth}
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        style={{
                            display: "block",
                            opacity: xButton.opacity,
                        }}
                    >
                        <path d="M18 6l-12 12" />
                        <path d="M6 6l12 12" />
                    </svg>
                    <button
                        style={{
                            position: "absolute",
                            left: -props.gap,
                            top: -paddingValues[0],
                            right: -paddingValues[1],
                            bottom: -paddingValues[2],
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                        }}
                        onClick={onXClick}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                    />
                </div>
            )}
            <Border {...props.border} />
            <Border
                {...props.focus}
                animate={{
                    opacity: focused ? 1 : 0,
                }}
            />
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        #${id} input::placeholder { color: ${placeholderColor}; user-select: none; }
                        #${id} input::-webkit-input-placeholder { color: ${placeholderColor}; user-select: none; }
                        #${id} input::-moz-placeholder { color: ${placeholderColor}; user-select: none; }
                        #${id} input:-ms-input-placeholder { color: ${placeholderColor}; user-select: none; }
                        #${id} input:-moz-placeholder { color: ${placeholderColor}; user-select: none; }
                        #${id} input:focus { outline: none; }`,
                }}
            />
        </div>
    )
}

SearchBar.displayName = "Search Bar"

addPropertyControls(SearchBar, {
    ...superfieldsId(),
    placeholderText: {
        type: ControlType.String,
        defaultValue: "Search [items] items...",
        title: "Placeholder",
        description: "*[items]*: number of CMS items",
    },
    autoFocus: {
        type: ControlType.Boolean,
        defaultValue: false,
        title: "Auto-Focus",
    },
    fill: fillProp({
        color: "#EFEFEF",
    }),
    fontColor: {
        type: ControlType.Color,
        defaultValue: "#000",
    },
    placeholderColor: {
        type: ControlType.Color,
        defaultValue: "rgba(0, 0, 0, 0.5)",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 14,
            lineHeight: 1.4,
        },
    },
    searchIcon: {
        type: ControlType.Object,
        optional: true,
        defaultValue: {
            color: "$000",
            size: 16,
            lineWidth: 2.5,
            opacity: 0.5,
        },
        controls: {
            color: {
                type: ControlType.Color,
                defaultValue: "$000",
            },
            size: {
                type: ControlType.Number,
                defaultValue: 16,
                min: 1,
                step: 1,
            },
            lineWidth: {
                type: ControlType.Number,
                defaultValue: 2.5,
                min: 0.1,
                max: 5,
                step: 0.1,
            },
            opacity: {
                type: ControlType.Number,
                defaultValue: 1,
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    },
    xButton: {
        type: ControlType.Object,
        optional: true,
        defaultValue: {
            color: "#000",
            size: 14,
            lineWidth: 2.5,
            opacity: 0.5,
        },
        controls: {
            color: {
                type: ControlType.Color,
                defaultValue: "#000",
            },
            size: {
                type: ControlType.Number,
                defaultValue: 14,
                min: 1,
                step: 1,
            },
            lineWidth: {
                type: ControlType.Number,
                defaultValue: 2.5,
                min: 0.1,
                max: 5,
                step: 0.1,
            },
            opacity: {
                type: ControlType.Number,
                defaultValue: 0.5,
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    },
    gap: {
        type: ControlType.Number,
        defaultValue: 8,
        min: 0,
        step: 1,
    },
    padding: {
        type: ControlType.Padding,
        defaultValue: "8px 12px 8px 12px",
    },
    radius: {
        type: ControlType.BorderRadius,
        defaultValue: "8px",
    },
    border: borderPropertyControl(),
    shadows: {
        type: ControlType.BoxShadow,
    },
    bgBlur: {
        type: ControlType.Number,
        min: 0,
        max: 100,
        step: 1,
        displayStepper: true,
        title: "BG Blur",
    },
    focus: {
        type: ControlType.Object,
        optional: true,
        defaultValue: {
            color: "#0075FF",
            width: 2,
            style: "solid",
        },
        buttonTitle: "Border",
        controls: {
            color: {
                type: ControlType.Color,
                defaultValue: "#0075FF",
                title: "Color",
            },
            width: {
                type: ControlType.FusedNumber,
                defaultValue: 2,
                toggleKey: "widthIsMixed",
                toggleTitles: ["All", "Individual"],
                valueKeys: [
                    "widthTop",
                    "widthRight",
                    "widthBottom",
                    "widthLeft",
                ],
                valueLabels: ["T", "R", "B", "L"],
                min: 0,
            },
            style: {
                type: ControlType.Enum,
                defaultValue: "solid",
                options: ["solid", "dashed", "dotted", "double"],
                optionTitles: ["Solid", "Dashed", "Dotted", "Double"],
            },
            transition: {
                type: ControlType.Transition,
                defaultValue: {
                    type: "spring",
                    duration: 0.2,
                    bounce: 0,
                },
            },
        },
    },
})

function parsePadding(padding) {
    // Split the input string by spaces and convert each to an integer
    const values = padding
        .trim()
        .split(/\s+/)
        .map((val) => parseInt(val, 10))

    // If only one value is provided, replicate it four times
    if (values.length === 1) {
        return [values[0], values[0], values[0], values[0]]
    }
    // If four values are provided, return them as is
    else if (values.length === 4) {
        return values
    } else {
        throw new Error(
            "Invalid padding input. Provide either one or four padding values."
        )
    }
}