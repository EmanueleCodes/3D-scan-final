'use client'
import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useRef, useEffect, useState, useCallback } from "react"

// import { gsap } from 'gsap'
// import { useGSAP } from '@gsap/react'
// import { SplitText } from 'gsap/SplitText'

import {
    gsap,
    useGSAP,
    SplitText,
    ScrollTrigger
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"


// Register plugins
gsap.registerPlugin(SplitText, useGSAP, ScrollTrigger)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface RandomWordAppearProps {
    text: string
    color: string
    font?: React.CSSProperties
    tag?: string
    className?: string
    style?: React.CSSProperties
    delay: number
    staggerAmount: number
    opacityDuration: number
    triggerOnScroll: boolean
}


/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function RandomWordAppear(props: RandomWordAppearProps) {
    const {
        text = "Welcome to the amazing world of random word appearances",
        color = "#ffffff",
        font = {},
        tag = "h1",
        className = "",
        style = {},
        delay = 1,
        staggerAmount = 0.2,
        opacityDuration = 0.8,
        triggerOnScroll = false,
    } = props

    const textRef = useRef<HTMLElement>(null)
    const TAG = tag

    // Animation function
    const animateWords = useCallback(() => {
        if (!textRef.current) return

        // Create SplitText instance to split into words
        const split = SplitText.create(textRef.current, {
            type: "words",
        })

        // Set initial state - all words invisible
        gsap.set(split.words, {
            opacity: 0,
        })

        // Create random order array
        const randomOrder = [...split.words].sort(() => Math.random() - 0.5)

        // Animate words appearing in random order
        gsap.to(randomOrder, {
            opacity: 1,
            duration: opacityDuration,
            stagger: {
                each: staggerAmount, // Delay between each word
                from: "random", // Random order
            },
            ease: "power2.out",
            delay: delay, // Start after specified delay
        })
    }, [text, delay, staggerAmount, opacityDuration])

    // Scroll-triggered animation using GSAP ScrollTrigger
    useGSAP(() => {
        if (!triggerOnScroll || RenderTarget.current() === RenderTarget.canvas) return
        if (!textRef.current) return

        // Create SplitText instance
        const split = SplitText.create(textRef.current, {
            type: "words",
        })

        // Set initial state - words invisible
        gsap.set(split.words, {
            opacity: 0,
        })

        // Create ScrollTrigger animation
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: textRef.current,
                start: "center center", // When center of element hits center of viewport
                end: "bottom top",
                toggleActions: "play none none reverse",
                onEnter: () => {
                    console.log('ScrollTrigger: Animation triggered!')
                    // Create random order array
                    const randomOrder = [...split.words].sort(() => Math.random() - 0.5)

                    // Animate words appearing in random order
                    gsap.to(randomOrder, {
                        opacity: 1,
                        duration: opacityDuration,
                        stagger: {
                            each: staggerAmount,
                            from: "random",
                        },
                        ease: "power2.out",
                        delay: delay,
                    })
                }
            }
        })

        return () => {
            tl.kill()
        }
    }, [triggerOnScroll, animateWords, delay, staggerAmount, opacityDuration])

    // Immediate animation (when not scroll-triggered)
    useGSAP(() => {
        // Do not run animation logic in the Framer canvas
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (triggerOnScroll) return // Skip if scroll-triggered

        animateWords()
    }, [triggerOnScroll, animateWords])

    return (
        <div
            className={`random-word-appear ${className}`}
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "auto",
              
                backgroundColor: "#0a0a0a",
                padding: "2rem",
                ...style,
            }}
        >
            {React.createElement(
                TAG,
                {
                    ref: textRef,
                    style: {
                        margin: 0,
                        color,
                        textAlign: "center",
                        lineHeight: "1.2",
                        maxWidth: "800px",
                        // Apply font styles directly to the text element
                        fontSize: font.fontSize || "clamp(2rem, 8vw, 6rem)",
                        fontWeight: font.fontWeight || "700",
                        fontFamily: font.fontFamily || "system-ui, -apple-system, sans-serif",
                        fontStyle: font.fontStyle,
                        textDecoration: font.textDecoration,
                        letterSpacing: font.letterSpacing,
                        // Reset any default browser styles that might interfere
                        marginBlock: 0,
                        marginInline: 0,
                        padding: 0,
                    },
                },
                text
            )}
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(RandomWordAppear, {
    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue: "Welcome to the amazing world of random word appearances",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 48,
            fontWeight: 700,
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"],
        defaultValue: "h1",
    },
    delay: {
        type: ControlType.Number,
        title: "Start Delay",
        unit: "s",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1,
       
    },
    staggerAmount: {
        type: ControlType.Number,
        title: "Word Delay",
        unit: "s",
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 0.2,
       
    },
    opacityDuration: {
        type: ControlType.Number,
        title: "Duration",
        unit: "s",
        min: 0.01,
        max: 5,
        step: 0.05,
        defaultValue: 0.8,
       
    },
    triggerOnScroll: {
        type: ControlType.Boolean,
        title: "Trigger on Scroll",
        defaultValue: false,
    },
})

RandomWordAppear.displayName = "Random Word Appear"
