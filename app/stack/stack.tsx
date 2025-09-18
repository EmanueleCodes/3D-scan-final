import React, { useState } from "react"
import { motion, PanInfo } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

interface Card {
    id: number
    content: string
}

interface CardStackProps {
    cardCount: number
    cardColor: string
    cardRadius: number
    swipeThreshold: number
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
        const stackOffset = index * 8
        const scaleValue = 1 - (index * 0.05)
        const rotationValue = index * 2
        
        return {
            zIndex: cards.length - index,
            scale: scaleValue,
            y: -stackOffset,
            rotate: rotationValue,
            opacity: 1, // All cards always visible
        }
    }

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
                perspective: "1000px"
            }}
        >
            {cards.map((card, index) => {
                const isTopCard = index === 0
                const cardStyle = getCardStyle(index)
                
                return (
                    <motion.div
                        key={card.id}
                        drag={isTopCard ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.7}
                        onDragEnd={isTopCard ? (_, info) => handleDragEnd(info) : undefined}
                        animate={cardStyle}
                        transition={transition}
                        style={{
                            position: "absolute",
                            width: 300,
                            height: 500,
                            backgroundColor: cardColor,
                            borderRadius: cardRadius,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "white",
                            cursor: isTopCard ? "grab" : "default",
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
        min: 3,
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
        title: "Swipe Threshold",
        min: 50,
        max: 200,
        defaultValue: 100,
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