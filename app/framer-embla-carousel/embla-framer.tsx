import React, { useCallback, useEffect, useState, ComponentPropsWithRef } from 'react'
import { addPropertyControls, ControlType } from "framer"

//Stuff to bundle (ORIGINAL IMPORTS)
// import { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel'
// import Autoplay from 'embla-carousel-autoplay'
// import useEmblaCarousel from 'embla-carousel-react'

import { useEmblaCarousel, Autoplay } from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/clients-projects/embla-bundle.js"

// Type definitions for Embla Carousel (since types can't be imported from CDN)
type EmblaCarouselType = ReturnType<typeof useEmblaCarousel>[1]
type EmblaOptionsType = Parameters<typeof useEmblaCarousel>[0]







// ============================================================================
// INLINE STYLES
// ============================================================================

/**
 * All styles converted from embla.css to inline styles
 * Organized by component for easy reference and customization
 */

const styles = {
	// Main carousel container
	embla: {
		maxWidth: '100%',
		margin: 'auto',
		width: '100%',
		position: 'relative',
		height: '100%',
	} as React.CSSProperties,

	// Viewport - enables overflow scrolling
	viewport: {
		overflow: 'hidden',
	} as React.CSSProperties,

	// Container - holds all slides
	container: {
		display: 'flex',
		touchAction: 'pan-y pinch-zoom',
		marginLeft: '-32px', // Negative slide spacing
	} as React.CSSProperties,

	// Individual slide (flex basis is set dynamically based on slidesPerView)
	slide: {
		transform: 'translate3d(0, 0, 0)',
		minWidth: 0,
		paddingLeft: '32px', // Slide spacing
	} as React.CSSProperties,

	// Slide content (number display)
	slideNumber: {
		boxShadow: 'inset 0 0 0 2px rgba(234, 234, 234, 1)',
		borderRadius: '28.8px',
		fontSize: '64px',
		fontWeight: 600,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '304px', // Slide height
		userSelect: 'none' as const,
	} as React.CSSProperties,

	// Controls container (arrows + dots)
	controls: {
		display: 'grid',
		gridTemplateColumns: 'auto 1fr',
		justifyContent: 'space-between',
		gap: '19.2px',
		marginTop: '28.8px',
	} as React.CSSProperties,

	// Arrow buttons container
	buttons: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, 1fr)',
		gap: '9.6px',
		alignItems: 'center',
	} as React.CSSProperties,

	// Arrow button base
	button: {
		WebkitTapHighlightColor: 'rgba(49, 49, 49, 0.5)',
		WebkitAppearance: 'none' as const,
		appearance: 'none' as const,
		backgroundColor: 'transparent',
		touchAction: 'manipulation' as const,
		display: 'inline-flex',
		textDecoration: 'none',
		cursor: 'pointer',
		border: 0,
		padding: 0,
		margin: 0,
		boxShadow: 'inset 0 0 0 2px rgba(234, 234, 234, 1)',
		width: '57.6px',
		height: '57.6px',
		zIndex: 1,
		borderRadius: '50%',
		color: 'rgb(54, 49, 61)',
		alignItems: 'center',
		justifyContent: 'center',
	} as React.CSSProperties,

	// Disabled arrow button
	buttonDisabled: {
		color: 'rgb(192, 192, 192)',
	} as React.CSSProperties,

	// SVG icon inside button
	buttonSvg: {
		width: '35%',
		height: '35%',
	} as React.CSSProperties,

	// Dots container
	dots: {
		display: 'flex',
		flexWrap: 'wrap' as const,
		justifyContent: 'flex-end',
		alignItems: 'center',
	} as React.CSSProperties,

	// Individual dot button
	dot: {
		WebkitTapHighlightColor: 'rgba(49, 49, 49, 0.5)',
		WebkitAppearance: 'none' as const,
		appearance: 'none' as const,
		backgroundColor: 'transparent',
		touchAction: 'manipulation' as const,
		display: 'inline-flex',
		textDecoration: 'none',
		cursor: 'pointer',
		border: 0,
		padding: 0,
		margin: 0,
		width: '41.6px',
		height: '41.6px',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: '50%',
		position: 'relative' as const,
	} as React.CSSProperties,

	// Dot inner circle (using ::after pseudo-element replacement)
	dotInner: {
		boxShadow: 'inset 0 0 0 2px rgba(234, 234, 234, 1)',
		width: '22.4px',
		height: '22.4px',
		borderRadius: '50%',
		display: 'flex',
		alignItems: 'center',
	} as React.CSSProperties,

	// Selected dot inner circle
	dotInnerSelected: {
		boxShadow: 'inset 0 0 0 2px rgb(54, 49, 61)',
	} as React.CSSProperties,
}

// ============================================================================
// DOT BUTTON NAVIGATION
// ============================================================================

/**
 * Hook to manage dot button navigation state and interactions
 * Tracks the currently selected slide and provides click handlers for dots
 */

type UseDotButtonType = {
	selectedIndex: number
	scrollSnaps: number[]
	onDotButtonClick: (index: number) => void
}

export const useDotButton = (
	emblaApi: EmblaCarouselType | undefined,
	onButtonClick?: (emblaApi: EmblaCarouselType) => void
): UseDotButtonType => {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

	// Handle dot button clicks - scroll to the selected index
	const onDotButtonClick = useCallback(
		(index: number) => {
			if (!emblaApi) return
			emblaApi.scrollTo(index)
			if (onButtonClick) onButtonClick(emblaApi)
		},
		[emblaApi, onButtonClick]
	)

	// Initialize scroll snap points when carousel is ready
	const onInit = useCallback((emblaApi: EmblaCarouselType) => {
		setScrollSnaps(emblaApi.scrollSnapList())
	}, [])

	// Update selected index when carousel scrolls
	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setSelectedIndex(emblaApi.selectedScrollSnap())
	}, [])

	// Set up event listeners for carousel state changes
	useEffect(() => {
		if (!emblaApi) return

		onInit(emblaApi)
		onSelect(emblaApi)
		emblaApi.on('reInit', onInit).on('reInit', onSelect).on('select', onSelect)
	}, [emblaApi, onInit, onSelect])

	return {
		selectedIndex,
		scrollSnaps,
		onDotButtonClick
	}
}

/**
 * Dot Button Component
 * Renders individual navigation dots with conditional selected styling
 */

type DotButtonPropType = ComponentPropsWithRef<'button'> & {
	isSelected?: boolean
	buttonStyle?: React.CSSProperties
	innerStyle?: React.CSSProperties
}

export const DotButton: React.FC<DotButtonPropType> = (props) => {
	const { children, isSelected, buttonStyle, innerStyle, ...restProps } = props

	return (
		<button type="button" style={{ ...styles.dot, ...(buttonStyle || {}) }} {...restProps}>
			<div
				style={{
					...styles.dotInner,
					...(isSelected ? styles.dotInnerSelected : {}),
					...(innerStyle || {}),
				}}
			>
				{children}
			</div>
		</button>
	)
}

// ============================================================================
// ARROW BUTTON NAVIGATION
// ============================================================================

/**
 * Hook to manage prev/next arrow button state and interactions
 * Handles button disabled states and click handlers for navigation
 */

type UsePrevNextButtonsType = {
	prevBtnDisabled: boolean
	nextBtnDisabled: boolean
	onPrevButtonClick: () => void
	onNextButtonClick: () => void
}

export const usePrevNextButtons = (
	emblaApi: EmblaCarouselType | undefined,
	onButtonClick?: (emblaApi: EmblaCarouselType) => void
): UsePrevNextButtonsType => {
	const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
	const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

	// Handle previous button click
	const onPrevButtonClick = useCallback(() => {
		if (!emblaApi) return
		emblaApi.scrollPrev()
		if (onButtonClick) onButtonClick(emblaApi)
	}, [emblaApi, onButtonClick])

	// Handle next button click
	const onNextButtonClick = useCallback(() => {
		if (!emblaApi) return
		emblaApi.scrollNext()
		if (onButtonClick) onButtonClick(emblaApi)
	}, [emblaApi, onButtonClick])

	// Update button disabled states based on scroll position
	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setPrevBtnDisabled(!emblaApi.canScrollPrev())
		setNextBtnDisabled(!emblaApi.canScrollNext())
	}, [])

	// Set up event listeners for carousel state changes
	useEffect(() => {
		if (!emblaApi) return

		onSelect(emblaApi)
		emblaApi.on('reInit', onSelect).on('select', onSelect)
	}, [emblaApi, onSelect])

	return {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick
	}
}

/**
 * Previous Arrow Button Component
 * Renders the previous navigation button with left arrow icon
 */

type PrevButtonPropType = ComponentPropsWithRef<'button'>

export const PrevButton: React.FC<PrevButtonPropType> = (props) => {
	const { children, disabled, ...restProps } = props

	return (
		<button
			type="button"
			style={{
				...styles.button,
				...(disabled ? styles.buttonDisabled : {}),
			}}
			disabled={disabled}
			{...restProps}
		>
			<svg style={styles.buttonSvg} viewBox="0 0 532 532">
				<path
					fill="currentColor"
					d="M355.66 11.354c13.793-13.805 36.208-13.805 50.001 0 13.785 13.804 13.785 36.238 0 50.034L201.22 266l204.442 204.61c13.785 13.805 13.785 36.239 0 50.044-13.793 13.796-36.208 13.796-50.002 0a5994246.277 5994246.277 0 0 0-229.332-229.454 35.065 35.065 0 0 1-10.326-25.126c0-9.2 3.393-18.26 10.326-25.2C172.192 194.973 332.731 34.31 355.66 11.354Z"
				/>
			</svg>
			{children}
		</button>
	)
}

/**
 * Next Arrow Button Component
 * Renders the next navigation button with right arrow icon
 */

type NextButtonPropType = ComponentPropsWithRef<'button'>

export const NextButton: React.FC<NextButtonPropType> = (props) => {
	const { children, disabled, ...restProps } = props

	return (
		<button
			type="button"
			style={{
				...styles.button,
				...(disabled ? styles.buttonDisabled : {}),
			}}
			disabled={disabled}
			{...restProps}
		>
			<svg style={styles.buttonSvg} viewBox="0 0 532 532">
				<path
					fill="currentColor"
					d="M176.34 520.646c-13.793 13.805-36.208 13.805-50.001 0-13.785-13.804-13.785-36.238 0-50.034L330.78 266 126.34 61.391c-13.785-13.805-13.785-36.239 0-50.044 13.793-13.796 36.208-13.796 50.002 0 22.928 22.947 206.395 206.507 229.332 229.454a35.065 35.065 0 0 1 10.326 25.126c0 9.2-3.393 18.26-10.326 25.2-45.865 45.901-206.404 206.564-229.332 229.52Z"
				/>
			</svg>
			{children}
		</button>
	)
}

// ============================================================================
// MAIN CAROUSEL COMPONENT
// ============================================================================

/**
 * EmblaCarousel Component
 * Main carousel component with autoplay, dot navigation, and arrow controls
 */

type PropType = {
	slides?: number[]
	slideCount: number
	slidesPerView: number
	loop: boolean
	autoplay: boolean
	autoplayDelay: number
	autoplayStopOnInteraction: boolean
	align: "start" | "center" | "end"
	dragFree: boolean
	containScroll: boolean
	skipSnaps: boolean
	/** Content mode and inputs */
	mode?: "images" | "components"
	content?: ControlType.ComponentInstance[]
	image1?: any
	image2?: any
	image3?: any
	image4?: any
	image5?: any
	image6?: any
	image7?: any
	image8?: any
	image9?: any
	image10?: any
	/** Dots UI customization and positioning */
	dotsUI?: {
 		enabled?: boolean
 		width?: number
 		height?: number
 		gap?: number
 		fill?: string
 		padding?: number
 		backdrop?: string
 		backdropRadius?: number
 		radius?: number
 		opacity?: number
 		current?: number
 		scale?: number
 		blur?: number
		borderWidth?: number
		borderColor?: string
		currentBorderWidth?: number
		currentBorderColor?: string
		verticalAlign?: "top" | "center" | "bottom"
 		horizontalAlign?: "left" | "center" | "right"
		offsetX?: number
		offsetY?: number
 	}
	/** Arrows UI customization and positioning */
	arrowsUI?: {
		enabled?: boolean
		mode?: "group" | "space-between"
		verticalAlign?: "top" | "center" | "bottom"
		horizontalAlign?: "left" | "center" | "right"
		gap?: number
		offsetX?: number
		offsetY?: number
	}
}
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function EmblaCarousel(props: PropType) {
	const { 
		slides,
		slideCount = 5,
		slidesPerView = 1,
		mode = "images",
		content = [],
		image1,
		image2,
		image3,
		image4,
		image5,
		image6,
		image7,
		image8,
		image9,
		image10,
		loop = true,
		autoplay = true,
		autoplayDelay = 3000,
		autoplayStopOnInteraction = true,
		align = "start",
		dragFree = false,
		containScroll = false,
		skipSnaps = false,
		dotsUI = {
			enabled: true,
			width: 10,
			height: 10,
			gap: 10,
			fill: "#FFFFFF",
			padding: 0,
			backdrop: "transparent",
			backdropRadius: 20,
			radius: 50,
			opacity: 0.5,
			current: 1,
			scale: 1.1,
			blur: 0,
			verticalAlign: "bottom",
			horizontalAlign: "center",
			offsetX: 0,
			offsetY: 20,
		},
		arrowsUI = {
			enabled: true,
			mode: "space-between",
			verticalAlign: "center",
			horizontalAlign: "center",
			gap: 10,
			offsetX: 20,
			offsetY: 0,
		}
	} = props
	
	// Determine actual slide count based on mode
	const actualSlideCount =
		mode === "components"
			? (content?.length ?? 0) > 0
				? content!.length
				: Math.max(1, Math.min(5, slideCount))
			: slideCount

	// Build images list for images mode
	const images = [image1, image2, image3, image4, image5, image6, image7, image8, image9, image10]

	// Generate slides array indices
	const slidesArray = Array.from({ length: actualSlideCount }, (_, i) => i)
	
	// Calculate slide width based on slidesPerView
	const slideWidthPercentage = (100 / slidesPerView).toFixed(4) + '%'
	
	// Build options object from props
	const options: EmblaOptionsType = {
		loop,
		align,
		dragFree,
		containScroll,
		skipSnaps
	}
	
	// Initialize Embla carousel with conditional autoplay plugin
	const plugins = autoplay ? [Autoplay({ 
		delay: autoplayDelay,
		stopOnInteraction: autoplayStopOnInteraction 
	})] : []
	
	const [emblaRef, emblaApi] = useEmblaCarousel(options, plugins)

	// Handle navigation button clicks and autoplay interaction
	const onNavButtonClick = useCallback((emblaApi: EmblaCarouselType) => {
		const autoplay = emblaApi?.plugins()?.autoplay
		if (!autoplay) return

		// Stop or reset autoplay based on configuration
		const resetOrStop =
			autoplay.options.stopOnInteraction === false
				? autoplay.reset
				: autoplay.stop

		resetOrStop()
	}, [])

	// Initialize dot button navigation
	const { selectedIndex, scrollSnaps, onDotButtonClick } = useDotButton(
		emblaApi,
		onNavButtonClick
	)

	// Initialize arrow button navigation
	const {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick
	} = usePrevNextButtons(emblaApi, onNavButtonClick)

	// Calculate arrow positioning styles based on arrowsUI settings
	const getArrowsContainerStyle = (): React.CSSProperties => {
		const mode = arrowsUI.mode ?? "space-between"
		const vAlign = arrowsUI.verticalAlign ?? "center"
		const hAlign = arrowsUI.horizontalAlign ?? "center"
		const offsetX = arrowsUI.offsetX ?? 20
		const offsetY = arrowsUI.offsetY ?? 0
		const gap = arrowsUI.gap ?? 10

		const baseStyle: React.CSSProperties = {
			position: 'absolute',
			display: 'flex',
			pointerEvents: 'none', // Let clicks pass through container
			zIndex: 10,
		}

		// Vertical positioning
		if (vAlign === "top") {
			baseStyle.top = `${offsetY}px`
		} else if (vAlign === "bottom") {
			baseStyle.bottom = `${offsetY}px`
		} else {
			baseStyle.top = '50%'
			baseStyle.transform = `translateY(calc(-50% + ${offsetY}px))`
		}

		// Horizontal positioning based on mode
		if (mode === "space-between") {
			baseStyle.left = `${offsetX}px`
			baseStyle.right = `${offsetX}px`
			baseStyle.justifyContent = 'space-between'
		} else {
			// Group mode
			baseStyle.gap = `${gap}px`
			if (hAlign === "left") {
				baseStyle.left = `${offsetX}px`
			} else if (hAlign === "right") {
				baseStyle.right = `${offsetX}px`
			} else {
				baseStyle.left = '50%'
				const translateX = mode === "group" ? '-50%' : '0'
				baseStyle.transform = vAlign === "center" 
					? `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`
					: `translateX(calc(-50% + ${offsetX}px))`
			}
		}

		return baseStyle
	}

	// Calculate dots positioning styles based on dotsUI settings
	const getDotsContainerStyle = (): React.CSSProperties => {
		const vAlign = dotsUI.verticalAlign ?? "bottom"
		const hAlign = dotsUI.horizontalAlign ?? "center"
		const offsetX = dotsUI.offsetX ?? 0
		const offsetY = dotsUI.offsetY ?? 20

		const baseStyle: React.CSSProperties = {
			position: 'absolute',
			display: 'flex',
			pointerEvents: 'none', // Let clicks pass through container
			zIndex: 10,
		}

		// Vertical positioning
		if (vAlign === "top") {
			baseStyle.top = `${offsetY}px`
		} else if (vAlign === "bottom") {
			baseStyle.bottom = `${offsetY}px`
		} else {
			baseStyle.top = '50%'
			baseStyle.transform = `translateY(calc(-50% + ${offsetY}px))`
		}

		// Horizontal positioning
		if (hAlign === "left") {
			baseStyle.left = `${offsetX}px`
		} else if (hAlign === "right") {
			baseStyle.right = `${offsetX}px`
		} else {
			baseStyle.left = '50%'
			baseStyle.transform = vAlign === "center" 
				? `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`
				: `translateX(calc(-50% + ${offsetX}px))`
		}

		return baseStyle
	}

	return (
		<section style={styles.embla}>
			{/* Carousel viewport and slides */}
			<div style={styles.viewport} ref={emblaRef}>
				<div style={styles.container}>
					{slidesArray?.map((index) => (
						<div 
							style={{
								...styles.slide,
								flex: `0 0 ${slideWidthPercentage}`
							}} 
							key={index}
						>
							{mode === "images" ? (
								images[index] ? (
									<img
										src={images[index].src}
										alt={`Slide ${index + 1}`}
										style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
									/>
								) : (
									<div style={{
										...styles.slideNumber,
										height: '100%'
									}}>{index + 1}</div>
								)
							) : (
								content[index] ? (
									<div style={{
										position: 'relative',
										width: '100%',
										height: '100%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}>
										<div style={{ position: 'relative', display: 'inline-block' }}>
											{React.cloneElement(content[index] as any, {
												style: {
													// Preserve any user-provided styles on the child; do not force sizing
													...(content[index] as any)?.props?.style,
												},
											})}
										</div>
									</div>
								) : (
									<div style={{
										...styles.slideNumber,
										height: '100%'
									}}>{index + 1}</div>
								)
							)}
						</div>
					)) || []}
				</div>
			</div>

			{/* Arrow buttons - absolutely positioned */}
			{arrowsUI?.enabled !== false && (
				<div style={getArrowsContainerStyle()}>
					<div style={{ pointerEvents: 'auto' }}>
						<PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
					</div>
					<div style={{ pointerEvents: 'auto' }}>
						<NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
					</div>
				</div>
			)}

			{/* Dot navigation - absolutely positioned */}
			{dotsUI?.enabled !== false && (
				<div style={getDotsContainerStyle()}>
					<div
						style={{
							display: 'inline-flex',
							gap: `${dotsUI.gap ?? 10}px`,
							backgroundColor: dotsUI.backdrop || 'transparent',
							borderRadius: dotsUI.backdropRadius ?? 20,
							padding: dotsUI.padding ?? 0,
							pointerEvents: 'auto',
						}}
					>
						{scrollSnaps?.map((_, index) => {
							const isSel = index === selectedIndex
							const baseSizeW = Math.max(dotsUI.width ?? 10, 2)
							const baseSizeH = Math.max(dotsUI.height ?? 10, 2)
							const baseRadius = dotsUI.radius ?? 50
							const targetScale = isSel ? dotsUI.scale ?? 1.1 : 1
							const targetOpacity = isSel ? dotsUI.current ?? 1 : dotsUI.opacity ?? 0.5
							const bw = dotsUI.borderWidth ?? 0
							const bws = dotsUI.currentBorderWidth ?? bw
							const bc = dotsUI.borderColor ?? 'transparent'
							const bcs = dotsUI.currentBorderColor ?? bc
							return (
								<DotButton
									key={index}
									onClick={() => onDotButtonClick(index)}
									isSelected={isSel}
									buttonStyle={{
										width: `${baseSizeW}px`,
										height: `${baseSizeH}px`,
										borderRadius: `${baseRadius}px`,
									}}
									innerStyle={{
										width: `${baseSizeW}px`,
										height: `${baseSizeH}px`,
										borderRadius: `${baseRadius}px`,
										backgroundColor: dotsUI.fill || "#FFFFFF",
										filter: `blur(${dotsUI.blur ?? 0}px)`,
										transform: `scale(${targetScale})`,
										opacity: targetOpacity,
										border: `${isSel ? bws : bw}px solid ${isSel ? bcs : bc}`,
										boxShadow: 'none',
									}}
								/>
							)
						}) || []}
					</div>
				</div>
			)}
		</section>
	)
}

EmblaCarousel.displayName = "Embla Carousel"

addPropertyControls(EmblaCarousel, {
	mode: {
		type: ControlType.Enum,
		title: "Mode",
		options: ["images", "components"],
		optionTitles: ["Images", "Components"],
		defaultValue: "images",
		displaySegmentedControl: true,
		segmentedControlDirection: "vertical",
	},
	content: {
		type: ControlType.Array,
		title: "Content",
		control: {
			type: ControlType.ComponentInstance,
		},
		hidden: (props) => props.mode === "images",
	},
	slideCount: {
		type: ControlType.Number,
		title: "Slide Count",
		min: 2,
		max: 20,
		step: 1,
		defaultValue: 5,
		description: "Number of slides in the carousel",
	},
	slidesPerView: {
		type: ControlType.Number,
		title: "Slides Count",
		min: 0.5,
		max: 4,
		step: 0.1,
		defaultValue: 1,
		description: "Number of slides visible at once (supports decimals like 1.5 or 2.4)",
	},
	image1: { type: ControlType.ResponsiveImage, title: "Image 1", hidden: (p) => p.mode !== "images" },
	image2: { type: ControlType.ResponsiveImage, title: "Image 2", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 2 },
	image3: { type: ControlType.ResponsiveImage, title: "Image 3", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 3 },
	image4: { type: ControlType.ResponsiveImage, title: "Image 4", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 4 },
	image5: { type: ControlType.ResponsiveImage, title: "Image 5", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 5 },
	image6: { type: ControlType.ResponsiveImage, title: "Image 6", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 6 },
	image7: { type: ControlType.ResponsiveImage, title: "Image 7", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 7 },
	image8: { type: ControlType.ResponsiveImage, title: "Image 8", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 8 },
	image9: { type: ControlType.ResponsiveImage, title: "Image 9", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 9 },
	image10: { type: ControlType.ResponsiveImage, title: "Image 10", hidden: (p) => p.mode !== "images" || (p?.slideCount ?? 5) < 10 },
	loop: {
		type: ControlType.Boolean,
		title: "Loop",
		defaultValue: true,
		enabledTitle: "Infinite",
		disabledTitle: "Finite",
		description: "Enable infinite scrolling",
	},
	autoplay: {
		type: ControlType.Boolean,
		title: "Autoplay",
		defaultValue: true,
		enabledTitle: "On",
		disabledTitle: "Off",
		description: "Enable automatic slide progression",
	},
	autoplayDelay: {
		type: ControlType.Number,
		title: "Autoplay Delay",
		min: 1000,
		max: 10000,
		step: 500,
		defaultValue: 3000,
		unit: "ms",
		hidden: (props) => !props.autoplay,
		description: "Delay between autoplay transitions",
	},
	autoplayStopOnInteraction: {
		type: ControlType.Boolean,
		title: "Stop on Interaction",
		defaultValue: true,
		enabledTitle: "Stop",
		disabledTitle: "Continue",
		hidden: (props) => !props.autoplay,
		description: "Stop autoplay when user interacts",
	},
	align: {
		type: ControlType.Enum,
		title: "Alignment",
		options: ["start", "center", "end"],
		optionTitles: ["Start", "Center", "End"],
		defaultValue: "start",
		description: "Slide alignment within viewport",
	},
	dragFree: {
		type: ControlType.Boolean,
		title: "Free Drag",
		defaultValue: false,
		enabledTitle: "Free",
		disabledTitle: "Snap",
		description: "Allow free dragging without snapping",
	},
	containScroll: {
		type: ControlType.Boolean,
		title: "Contain Scroll",
		defaultValue: false,
		enabledTitle: "Contain",
		disabledTitle: "Free",
		description: "Contain scroll within bounds",
	},
	skipSnaps: {
		type: ControlType.Boolean,
		title: "Skip Snaps",
		defaultValue: false,
		enabledTitle: "Skip",
		disabledTitle: "Include",
		description: "Skip intermediate snap points",
	},
	/** Dots UI controls */
	dotsUI: {
		type: ControlType.Object,
		title: "Dots",
		controls: {
			enabled: {
				type: ControlType.Boolean,
				title: "Show",
				defaultValue: true,
			},
			width: {
				type: ControlType.Number,
				title: "Width",
				min: 4,
				max: 50,
				step: 1,
				defaultValue: 10,
				hidden: (props) => !props.enabled,
			},
			height: {
				type: ControlType.Number,
				title: "Height",
				min: 4,
				max: 50,
				step: 1,
				defaultValue: 10,
				hidden: (props) => !props.enabled,
			},
			gap: {
				type: ControlType.Number,
				title: "Gap",
				min: 0,
				max: 50,
				step: 1,
				defaultValue: 10,
				hidden: (props) => !props.enabled,
			},
			fill: {
				type: ControlType.Color,
				title: "Fill",
				defaultValue: "#FFFFFF",
				hidden: (props) => !props.enabled,
			},
			backdrop: {
				type: ControlType.Color,
				title: "Backdrop",
				defaultValue: "rgba(0,0,0,0.2)",
				hidden: (props) => !props.enabled,
			},
			padding: {
				type: ControlType.Number,
				title: "Padding",
				min: 0,
				max: 50,
				step: 1,
				defaultValue: 16,
				hidden: (props) => !props.enabled,
			},
			backdropRadius: {
				type: ControlType.Number,
				title: "Out Radius",
				min: 0,
				max: 50,
				step: 1,
				defaultValue: 20,
				hidden: (props) => !props.enabled,
			},
			radius: {
				type: ControlType.Number,
				title: "Radius",
				min: 0,
				max: 50,
				step: 1,
				defaultValue: 50,
				hidden: (props) => !props.enabled,
			},
			opacity: {
				type: ControlType.Number,
				title: "Opacity",
				min: 0,
				max: 1,
				step: 0.1,
				defaultValue: 0.5,
				hidden: (props) => !props.enabled,
			},
			current: {
				type: ControlType.Number,
				title: "Current",
				min: 0,
				max: 1,
				step: 0.1,
				defaultValue: 1,
				hidden: (props) => !props.enabled,
			},
			scale: {
				type: ControlType.Number,
				title: "Scale",
				min: 0.5,
				max: 2,
				step: 0.1,
				defaultValue: 1.1,
				hidden: (props) => !props.enabled,
			},
			blur: {
				type: ControlType.Number,
				title: "Blur",
				min: 0,
				max: 20,
				step: 1,
				defaultValue: 0,
				hidden: (props) => !props.enabled,
			},
			borderWidth: {
				type: ControlType.Number,
				title: "Border",
				min: 0,
				max: 10,
				step: 1,
				defaultValue: 0,
				hidden: (props) => !props.enabled,
			},
			borderColor: {
				type: ControlType.Color,
				title: "Border Color",
				defaultValue: "#000000",
				hidden: (props) => !props.enabled,
			},
			currentBorderWidth: {
				type: ControlType.Number,
				title: "Active Border",
				min: 0,
				max: 10,
				step: 1,
				defaultValue: 0,
				hidden: (props) => !props.enabled,
			},
			currentBorderColor: {
				type: ControlType.Color,
				title: "Active Border Color",
				defaultValue: "#000000",
				hidden: (props) => !props.enabled,
			},
			verticalAlign: {
				type: ControlType.Enum,
				title: "Vertical",
				options: ["top", "center", "bottom"],
				optionTitles: ["Top", "Center", "Bottom"],
				defaultValue: "bottom",
				displaySegmentedControl: true,
				segmentedControlDirection: "vertical",
				hidden: (props) => !props.enabled,
			},
			horizontalAlign: {
				type: ControlType.Enum,
				title: "Horizontal",
				options: ["left", "center", "right"],
				optionTitles: ["Left", "Center", "Right"],
				defaultValue: "center",
				displaySegmentedControl: true,
				segmentedControlDirection: "horizontal",
				hidden: (props) => !props.enabled,
			},
			offsetX: {
				type: ControlType.Number,
				title: "Offset X",
				min: -200,
				max: 200,
				step: 5,
				defaultValue: 0,
				hidden: (props) => !props.enabled,
			},
			offsetY: {
				type: ControlType.Number,
				title: "Offset Y",
				min: -200,
				max: 200,
				step: 5,
				defaultValue: 20,
				hidden: (props) => !props.enabled,
			},
		},
	},
	/** Arrows UI controls */
	arrowsUI: {
		type: ControlType.Object,
		title: "Arrows",
		controls: {
			enabled: {
				type: ControlType.Boolean,
				title: "Show",
				defaultValue: true,
			},
			mode: {
				type: ControlType.Enum,
				title: "Mode",
				options: ["group", "space-between"],
				optionTitles: ["Group", "Space Between"],
				defaultValue: "space-between",
				displaySegmentedControl: true,
				hidden: (props) => !props.enabled,
			},
			verticalAlign: {
				type: ControlType.Enum,
				title: "Vertical",
				options: ["top", "center", "bottom"],
				optionTitles: ["Top", "Center", "Bottom"],
				defaultValue: "center",
				displaySegmentedControl: true,
				segmentedControlDirection: "vertical",
				hidden: (props) => !props.enabled,
			},
			horizontalAlign: {
				type: ControlType.Enum,
				title: "Horizontal",
				options: ["left", "center", "right"],
				optionTitles: ["Left", "Center", "Right"],
				defaultValue: "center",
				displaySegmentedControl: true,
				segmentedControlDirection: "horizontal",
				hidden: (props) => props.mode === "space-between" || !props.enabled,
			},
			gap: {
				type: ControlType.Number,
				title: "Gap",
				min: 0,
				max: 100,
				step: 5,
				defaultValue: 10,
				hidden: (props) => props.mode === "space-between" || !props.enabled,
			},
			offsetX: {
				type: ControlType.Number,
				title: "Offset X",
				min: -200,
				max: 200,
				step: 5,
				defaultValue: 20,
				hidden: (props) => !props.enabled,
			},
			offsetY: {
				type: ControlType.Number,
				title: "Offset Y",
				min: -200,
				max: 200,
				step: 5,
				defaultValue: 0,
				hidden: (props) => !props.enabled,
			},
		},
	},
})
