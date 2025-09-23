// @ts-ignore
import { ControlType, useRouter, PathVariablesContext } from "framer"
import { motion } from "framer-motion"
import { createContext, cloneElement, useMemo, useContext, useId } from "react"

export const DEFAULT_SORTING_ID = "[{(DEFAULT_SORTING)}]"
export const FAVOURITES_FILTER_ID = "[{(FAVOURITES)}]"
export const DELIMITER = "_&%#|_" // Used for multi-select items and multiple options field names

export enum FieldType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Enum = "enum",
    Date = "date",
}

export enum FilterFieldType {
    Option = "option",
    Toggle = "toggle",
    Text = "text",
    Reference = "reference",
    MultiReference = "multiReference",
    MultipleOptions = "multipleOptions",
}

export enum FilterTextCondition {
    Equals = "equals",
    Contains = "contains",
}

export function useSlug() {
    const { currentPathVariables } = useRouter()
    const pathVariables = useContext(PathVariablesContext)

    let slug = null
    let slugFieldId = null

    if (pathVariables) {
        slugFieldId = Object.keys(pathVariables)[0]
        slug = pathVariables[slugFieldId]
    }

    if (currentPathVariables && !slug && !slugFieldId) {
        slugFieldId = Object.keys(currentPathVariables)[0]
        slug = currentPathVariables[slugFieldId]
    }

    return {
        slug,
        slugFieldId,
    }
}

export const calculateTotalPages = (totalItems, itemsPerPage) => {
    if (itemsPerPage <= 0) {
        return 0
    }
    return Math.ceil(totalItems / itemsPerPage)
}

export const useInstanceId = () => {
    const id = useId()
    const cleanId = id.replace(/:/g, "")
    const instanceId = `superfields-${cleanId}`

    return instanceId
}

export const superfieldsId = ({ hidden = undefined } = {}) => ({
    superfieldsId: {
        type: ControlType.Number,
        defaultValue: 0,
        min: 0,
        step: 1,
        displayStepper: true,
        title: "CMS ID",
        description: "Match with ID on Superfields component",
        hidden,
    },
})

export const buttonPropertyControls = ({ text = "" }) => ({
    appearance: {
        type: ControlType.Enum,
        defaultValue: "default",
        options: ["default", "custom"],
        optionTitles: ["Default", "Custom"],
        displaySegmentedControl: true,
    },
    customLayer: {
        type: ControlType.ComponentInstance,
        title: "Layer",
        description: "Connect a custom layer from outside the breakpoint",
        hidden: (props) => props.appearance !== "custom",
    },
    text: {
        type: ControlType.String,
        defaultValue: text,
        hidden: (props) => props.appearance !== "default",
    },
    fill: fillProp({
        color: "#000",
        gradientColorA: "#8C8C8C",
        gradientColorB: "#000",
        hidden: (props) => props.appearance !== "default",
    }),
    fontColor: {
        type: ControlType.Color,
        defaultValue: "#FFF",
        hidden: (props) => props.appearance !== "default",
    },
    font: {
        type: "font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 14,
            lineHeight: 1.4,
        },
        hidden: (props) => props.appearance !== "default",
    },
    padding: {
        type: ControlType.FusedNumber,
        defaultValue: 12,
        toggleKey: "paddingIsMixed",
        toggleTitles: ["All", "Individual"],
        valueKeys: [
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
        ],
        valueLabels: ["T", "R", "B", "L"],
        min: 0,
        hidden: (props) => props.appearance !== "default",
    },
    radius: {
        type: ControlType.FusedNumber,
        defaultValue: 8,
        toggleKey: "radiusIsMixed",
        toggleTitles: ["All", "Individual"],
        valueKeys: [
            "radiusTopLeft",
            "radiusTopRight",
            "radiusBottomRight",
            "radiusBottomLeft",
        ],
        valueLabels: ["TL", "TR", "BR", "BL"],
        min: 0,
        hidden: (props) => props.appearance !== "default",
    },
    border: borderPropertyControl({
        hidden: (props) => props.appearance !== "default",
    }),
    shadows: {
        type: ControlType.BoxShadow,
        hidden: (props) => props.appearance !== "default",
    },
    bgBlur: {
        type: ControlType.Number,
        min: 0,
        max: 100,
        step: 1,
        displayStepper: true,
        title: "BG Blur",
        hidden: (props) => props.appearance !== "default",
    },
})

export function Button({ props, onClick, onMouseEnter = null }) {
    if (props.appearance == "custom") {
        let layer = props.customLayer?.[0]
        const width = props.style?.width
        const height = props.style?.height
        if (layer && props.style && (width || height)) {
            layer = cloneElement(layer, {
                style: {
                    ...layer.props.style,
                    ...(width && { width: width }),
                    ...(height && { height: height }),
                },
            })
        }

        return (
            <div
                data-superfields
                style={{ display: "contents" }}
                onClick={onClick}
            >
                {layer}
            </div>
        )
    }

    return (
        <div
            data-superfields
            onClick={onClick}
            style={{
                position: "relative",
                display: "flex",
                justifyContent: props.font?.textAlign || "center",
                alignItems: "center",
                ...createBackground(props.fill),
                color: props.fontColor,
                padding: props.paddingIsMixed
                    ? `${props.paddingTop}px ${props.paddingRight}px ${props.paddingBottom}px ${props.paddingLeft}px`
                    : `${props.padding}px`,
                borderRadius: props.radiusIsMixed
                    ? `${props.radiusTopLeft}px ${props.radiusTopRight}px ${props.radiusBottomRight}px ${props.radiusBottomLeft}px`
                    : `${props.radius}px`,
                userSelect: "none",
                cursor: "pointer",
                flex: props.sizing == "fill" ? "1 0 0" : undefined,
                textWrap: props.style?.width == "100%" ? undefined : "nowrap",
                boxShadow: props.shadows,
                backdropFilter: props.bgBlur
                    ? `blur(${props.bgBlur}px)`
                    : undefined,
                ...props.font,
                ...props.style,
            }}
        >
            {props.text}
            <Border {...props.border} />
        </div>
    )
}

Button.displayName = "Superfields/Button"

export const borderPropertyControl = (props = {}) => ({
    type: ControlType.Object,
    optional: true,
    controls: {
        color: {
            type: ControlType.Color,
            defaultValue: "#222",
        },
        width: {
            type: ControlType.FusedNumber,
            defaultValue: 1,
            toggleKey: "widthIsMixed",
            toggleTitles: ["All", "Individual"],
            valueKeys: ["widthTop", "widthRight", "widthBottom", "widthLeft"],
            valueLabels: ["T", "R", "B", "L"],
            min: 0,
        },
        style: {
            type: ControlType.Enum,
            defaultValue: "solid",
            options: ["solid", "dashed", "dotted", "double"],
            optionTitles: ["Solid", "Dashed", "Dotted", "Double"],
        },
    },
    ...props,
})

export function Border({
    width,
    widthIsMixed,
    widthTop,
    widthRight,
    widthBottom,
    widthLeft,
    style,
    color,
    transition,
    animate,
    radius = "inherit",
}) {
    return (
        <motion.div
            animate={{
                borderColor: color,
                ...animate,
            }}
            style={{
                position: "absolute",
                inset: 0,
                borderWidth: widthIsMixed
                    ? `${widthTop}px ${widthRight}px ${widthBottom}px ${widthLeft}px`
                    : `${width}px`,
                borderStyle: style,
                borderRadius: radius,
                pointerEvents: "none",
            }}
            initial={false}
            transition={transition}
        />
    )
}

Border.displayName = "Superfields/Border"

export function Message({ title, subtitle }) {
    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                height: "100%",
                placeContent: "center",
                placeItems: "center",
                flexDirection: "column",
                gap: 16,
                backgroundColor: "rgba(136, 85, 255, 0.1)",
                borderRadius: 6,
                border: "1px dashed rgb(136, 85, 255)",
                color: "rgb(136, 85, 255)",
                fontSize: 16,
                padding: 20,
                minHeight: 200,
                textWrap: "balance",
            }}
        >
            <p
                style={{
                    margin: 0,
                    fontWeight: 600,
                    textAlign: "center",
                }}
            >
                {title}
            </p>
            <p
                style={{
                    margin: 0,
                    opacity: 0.7,
                    lineHeight: 1.5,
                    textAlign: "center",
                }}
            >
                {subtitle}
            </p>
        </div>
    )
}

Message.displayName = "Superfields/Message"

export const EmptyState = Message

export function createBackground(fill, on = null) {
    if (fill) {
        let { color, colorA, colorB } = fill
        if (typeof on == "boolean") {
            if (on) {
                color = fill.colorOn
                colorA = fill.colorAOn
                colorB = fill.colorBOn
            } else {
                color = fill.colorOff
                colorA = fill.colorAOff
                colorB = fill.colorBOff
            }
        }

        if (fill.type == "color") {
            return { backgroundColor: color, backgroundImage: "none" }
        } else {
            return {
                backgroundColor: "none",
                backgroundImage: `linear-gradient(${fill.gradientAngle}deg, ${colorB}, ${colorA})`,
            }
        }
    }

    return {}
}

export function fillProp({
    color = "#FFF",
    gradientColorA = "#FFF",
    gradientColorB = "#BDBDBD",
    noDefault = false,
    ...props
}) {
    return {
        type: ControlType.Object,
        optional: true,
        defaultValue: noDefault
            ? undefined
            : {
                  type: "color",
                  color,
                  colorA: gradientColorA,
                  colorB: gradientColorB,
                  gradientAngle: 0,
              },
        controls: {
            type: {
                type: ControlType.Enum,
                defaultValue: "color",
                options: ["color", "gradient"],
                optionTitles: ["Color", "Gradient"],
                displaySegmentedControl: true,
            },
            color: {
                type: ControlType.Color,
                defaultValue: color,
                hidden: (props) => props.type != "color",
            },
            colorA: {
                type: ControlType.Color,
                defaultValue: gradientColorA,
                title: "Colors",
                hidden: (props) => props.type != "gradient",
            },
            colorB: {
                type: ControlType.Color,
                defaultValue: gradientColorB,
                title: " ",
                hidden: (props) => props.type != "gradient",
            },
            gradientAngle: {
                type: ControlType.Number,
                defaultValue: 0,
                title: "Angle",
                step: 1,
                min: 0,
                max: 360,
                unit: "°",
                hidden: (props) => props.type != "gradient",
            },
        },
        ...props,
    }
}

export function fillPropOnOff({
    colorOn = "#FFF",
    colorAOn = "#FFF",
    colorBOn = "#000",
    colorOff = "#FFF",
    colorAOff = "#FFF",
    colorBOff = "#000",
    noDefault = false,
    ...props
}) {
    return {
        type: ControlType.Object,
        optional: true,
        defaultValue: noDefault
            ? undefined
            : {
                  type: "color",
                  colorOn,
                  colorAOn,
                  colorBOn,
                  colorOff,
                  colorAOff,
                  colorBOff,
                  gradientAngle: 0,
              },
        controls: {
            type: {
                type: ControlType.Enum,
                defaultValue: "color",
                options: ["color", "gradient"],
                optionTitles: ["Color", "Gradient"],
                displaySegmentedControl: true,
            },
            colorOn: {
                type: ControlType.Color,
                defaultValue: colorOn,
                hidden: (props) => props.type != "color",
            },
            colorAOn: {
                type: ControlType.Color,
                defaultValue: colorAOn,
                title: "Colors On",
                hidden: (props) => props.type != "gradient",
            },
            colorBOn: {
                type: ControlType.Color,
                defaultValue: colorBOn,
                title: " ",
                hidden: (props) => props.type != "gradient",
            },
            colorOff: {
                type: ControlType.Color,
                defaultValue: colorOff,
                hidden: (props) => props.type != "color",
            },
            colorAOff: {
                type: ControlType.Color,
                defaultValue: colorAOff,
                title: "Colors Off",
                hidden: (props) => props.type != "gradient",
            },
            colorBOff: {
                type: ControlType.Color,
                defaultValue: colorBOff,
                title: " ",
                hidden: (props) => props.type != "gradient",
            },
            gradientAngle: {
                type: ControlType.Number,
                defaultValue: 0,
                title: "Angle",
                step: 1,
                min: 0,
                max: 360,
                unit: "°",
                hidden: (props) => props.type != "gradient",
            },
        },
        ...props,
    }
}

export function parsePadding(padding) {
    if (typeof padding !== "string") {
        return [0, 0, 0, 0]
    }

    const values = padding.split(" ")
    const parsedValues = values.map((value) =>
        parseInt(value.replace("px", ""), 10)
    )

    switch (parsedValues.length) {
        case 1:
            const p = parsedValues[0]
            return [p, p, p, p]
        case 4:
            return parsedValues
    }

    return [0, 0, 0, 0]
}

export function sortingControls({
    defaultSorting = false,
    hidden = null,
} = {}) {
    return {
        sortBy: {
            type: ControlType.Enum,
            defaultValue: "field",
            options: [
                "field",
                "favourites",
                ...(defaultSorting ? ["defaultSorting"] : []),
            ],
            optionTitles: [
                "CMS Field",
                "Favourites",
                ...(defaultSorting ? ["Default Sorting"] : []),
            ],
            displaySegmentedControl: true,
            segmentedControlDirection: "vertical",
            hidden,
        },
        fieldName: {
            type: ControlType.String,
            defaultValue: "",
            placeholder: "CMS Field Name",
            hidden: (props) => props.sortBy !== "field" || hidden?.(props),
        },
        fieldType: {
            type: ControlType.Enum,
            defaultValue: FieldType.String,
            options: [
                FieldType.String,
                FieldType.Number,
                FieldType.Date,
                FieldType.Boolean,
                FieldType.Enum,
                "reference",
            ],
            optionTitles: [
                "Text",
                "Number",
                "Date",
                "Toggle",
                "Option",
                "Reference",
            ],
            hidden: (props) => props.sortBy !== "field" || hidden?.(props),
        },
        referenceFieldName: {
            type: ControlType.String,
            defaultValue: "Title",
            placeholder: "Reference Field Name",
            hidden: (props) =>
                props.sortBy !== "field" ||
                props.fieldType !== "reference" ||
                hidden?.(props),
        },
        referenceFieldType: {
            type: ControlType.Enum,
            defaultValue: FieldType.String,
            options: [
                FieldType.String,
                FieldType.Number,
                FieldType.Date,
                FieldType.Boolean,
                FieldType.Enum,
            ],
            optionTitles: ["Text", "Number", "Date", "Toggle", "Option"],
            hidden: (props) =>
                props.sortBy !== "field" ||
                props.fieldType !== "reference" ||
                hidden?.(props),
        },
        stringSort: {
            type: ControlType.Enum,
            defaultValue: "ascending",
            options: ["ascending", "descending"],
            optionTitles: ["A → Z", "Z → A"],
            displaySegmentedControl: true,
            title: "Sort",
            hidden: (props) =>
                sortFieldType(props) !== FieldType.String || hidden?.(props),
        },
        numberSort: {
            type: ControlType.Enum,
            defaultValue: "ascending",
            options: ["ascending", "descending"],
            optionTitles: ["Ascending ↑", "Descending ↓"],
            displaySegmentedControl: true,
            segmentedControlDirection: "vertical",
            title: "Sort",
            hidden: (props) =>
                sortFieldType(props) !== FieldType.Number || hidden?.(props),
        },
        dateSort: {
            type: ControlType.Enum,
            defaultValue: "ascending",
            options: ["ascending", "descending"],
            optionTitles: ["Ascending ↑", "Descending ↓"],
            displaySegmentedControl: true,
            segmentedControlDirection: "vertical",
            title: "Sort",
            hidden: (props) =>
                sortFieldType(props) !== FieldType.Date || hidden?.(props),
        },
        booleanSort: {
            type: ControlType.Enum,
            defaultValue: "ascending",
            options: ["yesNo", "noYes"],
            optionTitles: ["Yes, No", "No, Yes"],
            displaySegmentedControl: true,
            title: "Sort",
            hidden: (props) =>
                sortFieldType(props) !== FieldType.Boolean || hidden?.(props),
        },
        enumSort: {
            type: ControlType.Enum,
            defaultValue: "ascending",
            options: [
                "optionOrder",
                "reverseOptionOrder",
                "ascending",
                "descending",
            ],
            optionTitles: ["Option Order", "Reverse Order", "A → Z", "Z → A"],
            displaySegmentedControl: true,
            segmentedControlDirection: "vertical",
            title: "Sort",
            hidden: (props) =>
                sortFieldType(props) !== FieldType.Enum || hidden?.(props),
        },
        favouritesSort: {
            type: ControlType.Enum,
            defaultValue: "favouritesFirst",
            options: ["favouritesFirst", "favouritesLast"],
            optionTitles: ["Favourites First", "Favourites Last"],
            displaySegmentedControl: true,
            segmentedControlDirection: "vertical",
            title: "Sort",
            hidden: (props) => props.sortBy !== "favourites" || hidden?.(props),
        },
    }
}

const sortFieldType = (props) => {
    return props.sortBy === "field"
        ? props.fieldType === "reference"
            ? props.referenceFieldType
            : props.fieldType
        : false
}