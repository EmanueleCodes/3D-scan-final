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
    ScrollTrigger,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/word-random-reveal.js"

// Register plugins
gsap.registerPlugin(SplitText, useGSAP, ScrollTrigger)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface ShutterHoverEffectProps {
    text: string
    color: string
    font?: React.CSSProperties
    tag?: string
    style?: React.CSSProperties
    staggerAmount: number
    speed:number,
    enabled:boolean,
    direction:string,
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function ShutterHoverEffect(props: ShutterHoverEffectProps) {
    const {
        text = "Hover me to shutter",
        color = "#000000",
        font = {},
        tag = "h1",
        style = {},
        staggerAmount = 0.2,
        speed = 0.5,
        enabled = true,
        direction = "left-to-right",
    } = props

    const textRef = useRef<HTMLElement>(null)
    const splitTextRef = useRef<any>(null)
    const animatedCharactersRef = useRef<HTMLElement[]>([])
    const TAG = tag

    const calculateStaggerAmount = () => {
        return -0.04444*speed + 0.0544
    }

    // Create independent waves with speed scaling
    const createWave = (startDelay: number, waveStagger: number, direction: 'forward' | 'backward', speedMultiplier: number) => {
        const tl = gsap.timeline()
        
        // Scale all timings by the speed multiplier
        const scaledStartDelay = startDelay * speedMultiplier
        const scaledWaveStagger = waveStagger * speedMultiplier
        
        // Create the wave effect
        tl.to(animatedCharactersRef.current, {
            opacity: 0,
            duration: 0,
            stagger: {
                each: scaledWaveStagger,
                from: direction === 'forward' ? "start" : "end"
            },
            ease: "power2.out",
        })
        
        // Fade back in with same pattern
        tl.to(animatedCharactersRef.current, {
            opacity: 1,
            duration: 0,
            stagger: {
                each: scaledWaveStagger,
                from: direction === 'forward' ? "start" : "end"
            },
            ease: "power2.out",
        }, "-=50%")
        
        return tl.delay(scaledStartDelay)
    }

    // Split text once on component mount
    useGSAP(() => {
        if (!textRef.current || !enabled) return

        // Clean up previous split if it exists
        if (splitTextRef.current) {
            splitTextRef.current.revert()
        }

        // Create SplitText instance once
        const wordSplit = SplitText.create(textRef.current, {
            type: "words",
            wordsClass: "word",
        })

        const charSplit = SplitText.create(wordSplit.words, {
            type: "chars",
            charsClass: "char",
        })

        splitTextRef.current = charSplit
        animatedCharactersRef.current = charSplit.chars

        // Set initial state - all characters visible
        gsap.set(animatedCharactersRef.current, {
            opacity: 1,
        })

        animateText();

    }, [text, enabled]) // Only re-split when text changes

    // Clean up on unmount
    useGSAP(() => {
        return () => {
            if (splitTextRef.current) {
                splitTextRef.current.revert()
            }
        }
    }, [])

    // Animation function - create two independent waves
    const animateText = useCallback(() => {
        if (!animatedCharactersRef.current.length) return

        // Kill any existing animation to prevent conflicts
        gsap.killTweensOf(animatedCharactersRef.current)

        const decideDirection = () => {
            if (direction === "left-to-right") {
                return "forward"
            } else {
                return "backward"   
            }
        }

        // Create two independent waves with different speeds and directions
        const masterTimeline = gsap.timeline()
        
        // FIXED WAVE CONFIGURATION - Perfect ratios locked in
        const baseSpeed = 1.0 // Base speed multiplier
        const speedMultiplier = baseSpeed * speed // Scale by speed control
        
        // Wave 1: Starts immediately, slowest
        const wave1 = createWave(0, 0.1, decideDirection(), (1.1-speedMultiplier))
        
        // Wave 2: Starts 0.1s later, medium speed  
        //const wave2 = createWave(0.75, 0.1, decideDirection(), (1.1-speedMultiplier))
        
        // Wave 3: Starts 0.2s later, fastest
        //const wave3 = createWave(1, 0.1, decideDirection(), (1-speedMultiplier))
        
        // Add all waves to master timeline
        masterTimeline.add(wave1, 0)
       // masterTimeline.add(wave2, 0)
        //masterTimeline.add(wave3, 0)
        
        
    }, [speed, direction])

    


    return (
        <div
            className='random-word-appear'
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                //width: "100%",
                height: "auto",
                width:"fit-content",
                backgroundColor: "transparent",
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
                        // Apply font styles directly to the text element
                        fontSize: font.fontSize,
                        lineHeight:font.lineHeight,
                        fontWeight: font.fontWeight || "700",
                        fontFamily:
                            font.fontFamily ||
                            "system-ui, -apple-system, sans-serif",
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

addPropertyControls(ShutterHoverEffect, {
    enabled: {
        type: ControlType.Boolean,
        title: "Enabled",
        defaultValue: true,
    },
    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue: "Hover me to shutter",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 48,
            //@ts-ignore
            fontWeight: "600",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"],
        defaultValue: "h1",
    },
    direction:{
        type: ControlType.Enum,
        title: "Direction",
        options: ["left-to-right", "right-to-left",],
        defaultValue: "left-to-right",
        optionTitles: ["Left to Right", "Right to Left"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    
    speed:{
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.85,
        description:"More components at [Framer University](https://frameruni.link/cc).",
    },
})

ShutterHoverEffect.displayName = "Shutter Text DEV"
