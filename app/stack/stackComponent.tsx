
import React, { useState, useRef, useEffect } from "react"
import { gsap } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/gsap-bundle.js"
import { addPropertyControls, ControlType } from "framer"

interface CardStackProps {
    cardCount: number
    cardWidth: number
    cardHeight: number
    tiltAngle: number
    stackOffset: number
    transition: any
    cardColor: string
    cardRadius: number
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
    cardWidth = 200,
    cardHeight = 300,
    tiltAngle = 15,
    stackOffset = 20,
    transition = { type: "spring", stiffness: 300, damping: 30 },
    cardColor = "#6366f1",
    cardRadius = 16,
}: CardStackProps) {
    const [cards, setCards] = useState(
        Array.from({ length: cardCount }, (_, i) => ({
            id: i,
            zIndex: cardCount - i,
            isDragging: false,
            isTopCard: i === 0,
        }))
    )

    const containerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const dragData = useRef({ isDragging: false, startX: 0, currentX: 0 })

    // Initialize card positions
    useEffect(() => {
        cards.forEach((card, cardIndex) => {
            const cardElement = cardRefs.current[cardIndex]
            if (cardElement) {
                const offset = cardIndex * stackOffset
                const angle = (tiltAngle * cardIndex) / (cards.length - 1)
                
                gsap.set(cardElement, {
                    x: offset,
                    y: 0,
                    z: -cardIndex * 30,
                    rotation: angle,
                    scale: 1,
                    zIndex: card.zIndex,
                })
            }
        })
    }, [cards, stackOffset, tiltAngle])

    const handleMouseDown = (e: React.MouseEvent, cardIndex: number) => {
        const card = cards[cardIndex]
        if (!card.isTopCard) return

        e.preventDefault()
        dragData.current = {
            isDragging: true,
            startX: e.clientX,
            currentX: 0,
        }

        setCards((prev) =>
            prev.map((c) =>
                c.isTopCard ? { ...c, isDragging: true } : c
            )
        )

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragData.current.isDragging) return

            const deltaX = e.clientX - dragData.current.startX
            dragData.current.currentX = deltaX

            const cardElement = cardRefs.current[cardIndex]
            if (cardElement) {
                const rotation = gsap.utils.mapRange(-cardWidth, cardWidth, -tiltAngle, 0, deltaX)
                const scale = gsap.utils.mapRange(-cardWidth, cardWidth, 0.95, 1, deltaX)

                gsap.set(cardElement, {
                    x: deltaX,
                    z: 100,
                    rotation: rotation,
                    scale: scale,
                })
            }
        }

        const handleMouseUp = () => {
            if (!dragData.current.isDragging) return

            const threshold = cardWidth / 2
            const shouldMoveToBottom = Math.abs(dragData.current.currentX) > threshold

            if (shouldMoveToBottom) {
                // Move top card to bottom
                setCards((prev) => {
                    const topCard = prev.find(card => card.isTopCard)!
                    const remainingCards = prev.filter(card => !card.isTopCard)

                    const newBottomCard = {
                        ...topCard,
                        id: topCard.id + cardCount,
                        zIndex: 1,
                        isDragging: false,
                        isTopCard: false,
                    }

                    const updatedCards = remainingCards.map((card, index) => ({
                        ...card,
                        zIndex: card.zIndex + 1,
                        isTopCard: index === 0,
                    }))

                    const newCards = [...updatedCards, newBottomCard]

                    // Animate all cards to their new positions immediately
                    newCards.forEach((card, cardIndex) => {
                        const cardElement = cardRefs.current[cardIndex]
                        if (cardElement) {
                            const offset = cardIndex * stackOffset
                            const angle = (tiltAngle * cardIndex) / (newCards.length - 1)
                            
                            gsap.to(cardElement, {
                                x: offset,
                                y: 0,
                                z: -cardIndex * 30,
                                translateZ: -0,
                                rotation: angle,
                                scale: 1,
                                zIndex: card.zIndex,
                                duration: 1,
                                ease: "power2.out",
                            })
                        }
                    })

                    return newCards
                })
            } else {
                // Reset position if not dragged far enough
                const topCardIndex = cards.findIndex(card => card.isTopCard)
                const cardElement = cardRefs.current[topCardIndex]
                if (cardElement) {
                gsap.to(cardElement, {
                    x: 0,
                    y: 0,
                    z: 0,
                    rotation: 0,
                    scale: 1,
                    duration: 0.3,
                    ease: "power2.out",
                })
                }

                setCards((prev) =>
                    prev.map((c) =>
                        c.isTopCard ? { ...c, isDragging: false } : c
                    )
                )
            }

            dragData.current.isDragging = false
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                perspective: "500px",
            }}
        >
            {cards.map((card, cardIndex) => {
                const isTopCard = card.isTopCard

                return (
                    <div
                        key={card.id}
                        ref={(el) => { cardRefs.current[cardIndex] = el }}
                        onMouseDown={(e) => handleMouseDown(e, cardIndex)}
                        style={{
                            position: "absolute",
                            width: cardWidth,
                            height: cardHeight,
                            backgroundColor: cardColor,
                            borderRadius: cardRadius,
                            cursor: isTopCard ? "grab" : "default",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "white",
                            userSelect: "none",
                            pointerEvents: isTopCard ? "auto" : "none",
                            zIndex: card.zIndex,
                        }}
                    >
                        {cardIndex + 1}
                    </div>
                )
            })}
        </div>
    )
}

addPropertyControls(CardStack, {
    cardCount: {
        type: ControlType.Number,
        title: "Card Count",
        min: 3,
        max: 10,
        defaultValue: 5,
        description: "Number of cards in the stack",
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        min: 100,
        max: 400,
        defaultValue: 200,
        description: "Width of each card in pixels",
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        min: 150,
        max: 500,
        defaultValue: 300,
        description: "Height of each card in pixels",
    },
    tiltAngle: {
        type: ControlType.Number,
        title: "Tilt Angle",
        min: 0,
        max: 45,
        defaultValue: 15,
        description: "Angle of cards behind the top one",
    },
    stackOffset: {
        type: ControlType.Number,
        title: "Stack Offset",
        min: 5,
        max: 50,
        defaultValue: 20,
        description: "Horizontal offset between stacked cards",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", stiffness: 300, damping: 30 },
        description: "Animation transition settings",
    },
    cardColor: {
        type: ControlType.Color,
        title: "Card Color",
        defaultValue: "#6366f1",
        description: "Background color of the cards",
    },
    cardRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 50,
        defaultValue: 16,
        description: "Border radius of the cards",
    },
})

CardStack.displayName = "Card Stack"