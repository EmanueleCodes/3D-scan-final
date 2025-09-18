import React, { useState } from "react"
import { motion, PanInfo } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface Card {
    id: number
    content: string
}

interface CardStackProps {
    cardCount: number
    cardColor: string
    cardRadius: number
    swipeThreshold: number
    tiltAngle: number
    xOffset: number
    perspective: number
    depthSpacing: number
    transition: any
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */

export default function CardStack({
    cardCount = 5,
    cardColor = "#6366f1",
    cardRadius = 16,
    swipeThreshold = 100,
    tiltAngle = 8,
    xOffset = 40,
    perspective = 1000,
    depthSpacing = 30,
    transition = { type: "spring", stiffness: 300, damping: 30 },
    style
}: CardStackProps) {
    // Initialize cards with stable IDs
    const [cards, setCards] = useState<Card[]>(() =>
        Array.from({ length: cardCount }, (_, i) => ({
            id: i + 1, // Start from 1 for better display
            content: `Card ${i + 1}`
        }))
    )

    // Update cards when cardCount changes
    React.useEffect(() => {
        setCards(prevCards => {
            if (prevCards.length !== cardCount) {
                return Array.from({ length: cardCount }, (_, i) => ({
                    id: i + 1,
                    content: `Card ${i + 1}`
                }))
            }
            return prevCards
        })
    }, [cardCount])

    // Handle drag end - check if card should move to bottom
    const handleDragEnd = (info: PanInfo) => {
        const { offset } = info
        
        // Check if dragged far enough horizontally
        if (Math.abs(offset.x) > swipeThreshold) {
            // Move top card to bottom (reorder existing cards)
            setCards(prevCards => {
                const [topCard, ...restCards] = prevCards
                return [...restCards, topCard] // Simply move to end, keep same ID
            })
        }
    }

    // Get card styling based on position in stack
    const getCardStyle = (index: number) => {
        const totalCards = cards.length
        const stackOffset = index * 8
        const scaleValue = 1 - (index * 0.05)
        
        // Distribute tilt angle from 0° (first card) to max angle (last card)
        const rotationValue = totalCards > 1 ? (index / (totalCards - 1)) * tiltAngle : 0
        
        // Distribute X offset from 0 (first card) to max offset (last card)  
        const xOffsetValue = totalCards > 1 ? (index / (totalCards - 1)) * xOffset : 0
        
        const depthOffset = index * depthSpacing
        
        return {
            zIndex: cards.length - index,
            scale: scaleValue,
            x: xOffsetValue,
            y: -stackOffset,
            rotate: rotationValue,
            z: -depthOffset, // Add proper 3D depth
            opacity: 1, // All cards always visible
        }
    }

    // Check if we're in canvas mode
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    return (
        <div
            style={{
                ...style,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                perspective: `${perspective}px`
            }}
        >
            {cards.map((card, index) => {
                const isTopCard = index === 0
                const cardStyle = getCardStyle(index)
                
                return (
                    <motion.div
                        key={card.id}
                        drag={isTopCard && !isCanvas ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.7}
                        onDragEnd={isTopCard && !isCanvas ? (_, info) => handleDragEnd(info) : undefined}
                        animate={cardStyle}
                        transition={isCanvas ? { duration: 0 } : transition}
                        initial={isCanvas ? cardStyle : false}
                        style={{
                            position: "absolute",
                            width: 200,
                            height: 300,
                            backgroundColor: cardColor,
                            borderRadius: cardRadius,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "white",
                            cursor: isTopCard && !isCanvas ? "grab" : "default",
                            userSelect: "none",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                        }}
                        whileDrag={{
                            scale: 1.05,
                            rotate: 0,
                            zIndex: 1000,
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
                        }}
                    >
                        {card.content}
                    </motion.div>
                )
            })}
        </div>
    )
}

addPropertyControls(CardStack, {
    cardCount: {
        type: ControlType.Number,
        title: "Count",
        min: 2,
        max: 10,
        defaultValue: 5,
    },
    cardColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#6366f1",
    },
    cardRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 50,
        defaultValue: 16,
        unit: "px",
    },
    swipeThreshold: {
        type: ControlType.Number,
        title: "Min Swipe",
        min: 50,
        max: 1000,
        defaultValue: 250,
        unit: "px",
    },
    tiltAngle: {
        type: ControlType.Number,
        title: "Max Angle",
        min: 0,
        max: 20,
        step: 0.5,
        defaultValue: 8,
        unit: "deg",
    },
    xOffset: {
        type: ControlType.Number,
        title: "X Offset",
        min: -200,
        max: 200,
        step: 10,
        defaultValue: 50,
        unit: "px",
    },
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 500,
        max: 2000,
        step: 50,
        defaultValue: 1000,
        unit: "px",
    },
    depthSpacing: {
        type: ControlType.Number,
        title: "Depth",
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 30,
        unit: "px",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", stiffness: 300, damping: 30 },
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

CardStack.displayName = "Card Stack"