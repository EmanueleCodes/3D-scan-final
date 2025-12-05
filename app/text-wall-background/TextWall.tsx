import React, { useRef, useEffect, useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { gsap } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface TextWallProps {
    preview: boolean
    words: string[]
    numLines: number
    charsPerLine: number
    wordsPerLine: number
    textColor: string
    backgroundColor: string
    fontSize: number
    gap: number
    animationDuration: number
    stagger: number
    loop: boolean
    style?: React.CSSProperties
}

// ------------------------------------------------------------ //
// UTILITY FUNCTIONS
// ------------------------------------------------------------ //

// Characters used to fill gaps between words
const ALL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// Get random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Get random item from array
function randomItem<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)]
}

// Map value from one range to another
function mapValue(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (value <= inMin) return outMin
    if (value >= inMax) return outMax
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}

// ------------------------------------------------------------ //
// LINE DATA GENERATOR
// ------------------------------------------------------------ //

interface WordPosition {
    word: string
    start: number
    end: number
}

interface LineData {
    wordPositions: WordPosition[]
    // Pre-generated random chars for settled state (unique per line)
    settledChars: string[]
}

// Generate word positions and settled chars for a line
function generateLineData(
    words: string[],
    totalChars: number,
    maxWords: number
): LineData {
    const wordPositions: WordPosition[] = []
    const numWords = randomInt(1, Math.min(maxWords, 5))
    let currentEnd = 0

    for (let i = 0; i < numWords; i++) {
        const word = randomItem(words)
        const wordLen = word.length

        // Check if there's room
        if (currentEnd + wordLen >= totalChars - 3) break

        // Pick a random start after current end
        const maxStart = Math.min(currentEnd + 20, totalChars - 3 - wordLen)
        if (maxStart <= currentEnd) break

        const start = randomInt(currentEnd, maxStart)
        const end = start + wordLen

        wordPositions.push({ word, start, end })
        currentEnd = end
    }

    // Pre-generate random chars for this line's settled state
    const settledChars: string[] = []
    for (let i = 0; i < totalChars; i++) {
        settledChars.push(ALL_CHARS[randomInt(0, ALL_CHARS.length - 1)])
    }

    return { wordPositions, settledChars }
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function TextWall({
    preview = false,
    words = ["Home", "About", "Contact", "Blog", "News", "Shop"],
    numLines = 30,
    charsPerLine = 80,
    wordsPerLine = 3,
    textColor = "#FFFFFF",
    backgroundColor = "#000000",
    fontSize = 12,
    gap = 6,
    animationDuration = 1,
    stagger = 0.1,
    loop = true,
    style,
}: TextWallProps) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const shouldAnimate = !isCanvas || preview
    const containerRef = useRef<HTMLDivElement>(null)
    const lineRefs = useRef<(HTMLDivElement | null)[]>([])
    const tweensRef = useRef<ReturnType<typeof gsap.to>[]>([])

    // Generate stable line data - each line gets unique positions and chars
    const linesData = useMemo(() => {
        return Array.from({ length: numLines }, () =>
            generateLineData(words, charsPerLine, wordsPerLine)
        )
    }, [words, numLines, charsPerLine, wordsPerLine])

    // Build a line's text content based on animation progress
    const buildLineContent = (
        lineData: LineData,
        totalChars: number,
        revealProgress: number, // 0-1, how many chars revealed
        settleProgress: number // 0-1, how many chars "settled"
    ): string => {
        const numChars = Math.floor(mapValue(revealProgress, 0, 1, 0, totalChars))
        const settledChars = Math.floor(mapValue(settleProgress, 0, 1, 0, totalChars))

        let result = ""

        for (let i = 0; i < numChars; i++) {
            // Check if this char is part of a word
            let isWordChar = false
            for (const pos of lineData.wordPositions) {
                if (i >= pos.start && i < pos.end) {
                    result += pos.word[i - pos.start]
                    isWordChar = true
                    break
                }
            }

            if (!isWordChar) {
                // Not a word - show random char if past settle point, else use line's settled char
                if (i >= settledChars) {
                    // Scrambling - generate random char each frame
                    result += ALL_CHARS[randomInt(0, ALL_CHARS.length - 1)]
                } else {
                    // Settled - use pre-generated char for this line
                    result += lineData.settledChars[i]
                }
            }
        }

        return result
    }

    // GSAP animation
    useEffect(() => {
        // Kill previous tweens
        tweensRef.current.forEach((tween) => tween.kill())
        tweensRef.current = []

        if (!shouldAnimate) {
            // Show final state immediately
            lineRefs.current.forEach((el, index) => {
                if (el && linesData[index]) {
                    el.textContent = buildLineContent(linesData[index], charsPerLine, 1, 1)
                }
            })
            return
        }

        // Animation state object for each line
        const lineStates = linesData.map(() => ({
            revealProgress: 0,
            settleProgress: 0,
        }))

        // Create animation for each line
        const animateLine = (index: number) => {
            const lineEl = lineRefs.current[index]
            const lineData = linesData[index]
            if (!lineEl || !lineData) return

            const state = lineStates[index]
            const duration = animationDuration

            // Update function called on each frame
            const updateLine = () => {
                lineEl.textContent = buildLineContent(
                    lineData,
                    charsPerLine,
                    state.revealProgress,
                    state.settleProgress
                )
            }

            // Reveal animation (rate A)
            const revealTween = gsap.to(state, {
                revealProgress: 1,
                duration: duration,
                delay: index * stagger,
                ease: "expo.out",
                onUpdate: updateLine,
            })
            tweensRef.current.push(revealTween)

            // Settle animation (rate B) - starts at 75% through reveal
            const settleTween = gsap.to(state, {
                settleProgress: 1,
                duration: duration,
                delay: index * stagger + duration * 0.75,
                ease: "expo.inOut",
                onUpdate: updateLine,
                onComplete: () => {
                    if (loop) {
                        // After settle completes, wait then hide
                        const hideDelay = 2

                        // Hide settle first
                        const hideSettleTween = gsap.to(state, {
                            settleProgress: 0,
                            duration: duration,
                            delay: hideDelay,
                            ease: "expo.inOut",
                            onUpdate: updateLine,
                        })
                        tweensRef.current.push(hideSettleTween)

                        // Hide reveal after
                        const hideRevealTween = gsap.to(state, {
                            revealProgress: 0,
                            duration: duration,
                            delay: hideDelay + duration * 0.75,
                            ease: "expo.out",
                            onUpdate: updateLine,
                            onComplete: () => {
                                // Restart animation
                                animateLine(index)
                            },
                        })
                        tweensRef.current.push(hideRevealTween)
                    }
                },
            })
            tweensRef.current.push(settleTween)
        }

        // Start animation for all lines
        linesData.forEach((_, index) => {
            animateLine(index)
        })

        return () => {
            tweensRef.current.forEach((tween) => tween.kill())
            tweensRef.current = []
        }
    }, [shouldAnimate, linesData, charsPerLine, animationDuration, stagger, loop])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: backgroundColor,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    gap: gap,
                }}
            >
                {linesData.map((_, index) => (
                    <div
                        key={index}
                        ref={(el) => {
                            lineRefs.current[index] = el
                        }}
                        style={{
                            fontSize: fontSize,
                            color: textColor,
                            whiteSpace: "pre",
                            fontFamily:
                                "'Source Code Pro', 'SF Mono', 'Monaco', 'Consolas', monospace",
                            lineHeight: 1,
                            letterSpacing: "0.02em",
                            minHeight: fontSize,
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(TextWall, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    words: {
        type: ControlType.Array,
        title: "Words",
        control: {
            type: ControlType.String,
        },
        defaultValue: [
            "Home",
            "About",
            "Contact",
            "Blog",
            "News",
            "Shop",
            "Cart",
            "Login",
            "Search",
            "Support",
            "FAQ",
            "Terms",
            "Privacy",
            "Account",
            "Sitemap",
            "404",
        ],
    },
    numLines: {
        type: ControlType.Number,
        title: "Lines",
        min: 5,
        max: 100,
        step: 1,
        defaultValue: 30,
    },
    charsPerLine: {
        type: ControlType.Number,
        title: "Chars/Line",
        min: 20,
        max: 200,
        step: 10,
        defaultValue: 80,
    },
    wordsPerLine: {
        type: ControlType.Number,
        title: "Words/Line",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 3,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "#FFFFFF",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    fontSize: {
        type: ControlType.Number,
        title: "Font Size",
        min: 8,
        max: 24,
        step: 1,
        defaultValue: 12,
    },
    gap: {
        type: ControlType.Number,
        title: "Line Gap",
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 6,
    },
    animationDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.1,
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

TextWall.displayName = "Text Wall"
