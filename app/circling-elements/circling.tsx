import React from "react"
import { Children } from "react"
import { motion } from "framer-motion"


export type DemoImage = { url: string; alt?: string }

export const exampleImages: DemoImage[] = [
  { url: "/random-assets/profile-image.png", alt: "Profile" },
  { url: "/random-assets/blue-profile-image.png", alt: "Blue Profile" },
  { url: "/random-assets/image.png", alt: "Image" },
]

import { useEffect, useState } from "react"

type Breakpoint = "sm" | "md" | "lg" | "xl"

const breakpointMinWidth: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

type ScreenSize = {
  width: number
  height: number
  lessThan: (bp: Breakpoint) => boolean
}

export function useScreenSize(): ScreenSize {
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  }))

  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    handle()
    window.addEventListener("resize", handle)
    return () => window.removeEventListener("resize", handle)
  }, [])

  const lessThan = (bp: Breakpoint) => size.width < breakpointMinWidth[bp]

  return { width: size.width, height: size.height, lessThan }
}

type CirclingElementsProps = {
  children: React.ReactNode
  radius?: number
  duration?: number // in seconds
  easing?: string
  direction?: "normal" | "reverse"
  pauseOnHover?: boolean
}

const CirclingElements: React.FC<CirclingElementsProps> = ({
  children,
  radius = 100,
  duration = 10,
  easing = "linear",
  direction = "normal",
  pauseOnHover = false,
}) => {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      style={{ position: "relative", zIndex: 0, width: "100%", height: "100%" }}
      onMouseEnter={() => pauseOnHover && setIsHovered(true)}
      onMouseLeave={() => pauseOnHover && setIsHovered(false)}
    >
      {/* Inline keyframes for orbiting rotation */}
      <style>{`
        @keyframes rotate360 {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      {Children.map(children, (child, index) => {
        const total = Children.count(children)
        const offsetDegrees = (index * 360) / (total === 0 ? 1 : total)
        const animationDelaySeconds = -((offsetDegrees / 360) * duration)

        const rotatingWrapperStyle: React.CSSProperties = {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          transformOrigin: "center",
          willChange: "transform",
          animationName: "rotate360",
          animationDuration: `${duration}s`,
          animationTimingFunction: easing,
          animationIterationCount: "infinite",
          animationDirection: direction,
          animationDelay: `${animationDelaySeconds}s`,
          animationPlayState: pauseOnHover && isHovered ? "paused" : "running",
        }

        const radiusWrapperStyle: React.CSSProperties = {
          transform: `translateX(${radius}px)`,
          willChange: "transform",
        }

        return (
          <div key={index} style={rotatingWrapperStyle}>
            <div style={radiusWrapperStyle}>{child}</div>
          </div>
        )
      })}
    </div>
  )
}



const CirclingElementsDemo: React.FC = () => {
  const screenSize = useScreenSize()

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#efefef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CirclingElements
        radius={screenSize.lessThan(`md`) ? 80 : 120}
        duration={10}
        easing="linear"
        pauseOnHover={true}
      >
        {exampleImages.map((image, index) => {
          const sizePx = screenSize.lessThan("md") ? 80 : 112 // 5rem vs 7rem
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.25 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ width: sizePx, height: sizePx, cursor: "pointer", position: "relative" }}
            >
              <img src={image.url} alt={image.alt || "image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </motion.div>
          )
        })}
      </CirclingElements>
    </div>
  )
}

export default CirclingElementsDemo