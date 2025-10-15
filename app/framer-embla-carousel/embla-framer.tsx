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
		maxWidth: '768px',
		margin: 'auto',
		width: '100%',
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

	// Individual slide
	slide: {
		transform: 'translate3d(0, 0, 0)',
		flex: '0 0 100%',
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
		marginRight: 'calc((41.6px - 22.4px) / 2 * -1)',
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
}

export const DotButton: React.FC<DotButtonPropType> = (props) => {
	const { children, isSelected, ...restProps } = props

	return (
		<button type="button" style={styles.dot} {...restProps}>
			<div
				style={{
					...styles.dotInner,
					...(isSelected ? styles.dotInnerSelected : {}),
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
	loop: boolean
	autoplay: boolean
	autoplayDelay: number
	autoplayStopOnInteraction: boolean
	align: "start" | "center" | "end"
	dragFree: boolean
	containScroll: boolean
	skipSnaps: boolean
}

/**
 * @framerSupportedLayoutWidth any
 * @framerDisableUnlink
 */

export default function EmblaCarousel(props: PropType) {
	const { 
		slides,
		slideCount = 5,
		loop = true,
		autoplay = true,
		autoplayDelay = 3000,
		autoplayStopOnInteraction = true,
		align = "start",
		dragFree = false,
		containScroll = false,
		skipSnaps = false
	} = props
	
	// Generate slides if not provided
	const slidesArray = slides || Array.from({ length: slideCount }, (_, i) => i)
	
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

	return (
		<section style={styles.embla}>
			{/* Carousel viewport and slides */}
			<div style={styles.viewport} ref={emblaRef}>
				<div style={styles.container}>
					{slidesArray?.map((index) => (
						<div style={styles.slide} key={index}>
							<div style={styles.slideNumber}>{index + 1}</div>
						</div>
					)) || []}
				</div>
			</div>

			{/* Navigation controls */}
			<div style={styles.controls}>
				{/* Arrow buttons */}
				<div style={styles.buttons}>
					<PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
					<NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
				</div>

				{/* Dot navigation */}
				<div style={styles.dots}>
					{scrollSnaps?.map((_, index) => (
						<DotButton
							key={index}
							onClick={() => onDotButtonClick(index)}
							isSelected={index === selectedIndex}
						/>
					)) || []}
				</div>
			</div>
		</section>
	)
}

EmblaCarousel.displayName = "Embla Carousel"

addPropertyControls(EmblaCarousel, {
	slideCount: {
		type: ControlType.Number,
		title: "Slide Count",
		min: 2,
		max: 20,
		step: 1,
		defaultValue: 5,
		description: "Number of slides in the carousel",
	},
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
})
