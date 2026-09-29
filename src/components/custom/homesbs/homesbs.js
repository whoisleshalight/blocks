import "./homesbs.scss"
import {
	gsap,
	ScrollTrigger
} from "gsap/all"

gsap.registerPlugin(ScrollTrigger)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const smoothstep = (value) => value * value * (3 - 2 * value)
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
const isMobile = window.matchMedia("(max-width: 991.98px)")
const homeSbsConfig = {
	scrollUnitVh: 100,
	transitionDuration: 1,
	itemGap: 60,
	curveScale: 1,
	mobileCurveScale: 0.45,
	scrub: 0.18,
	scaleStep: 0.1,
	scaleMin: 0.6,
	centerHoldDuration: 1
}

const initHomeSbs = () => document.querySelectorAll("[data-fls-homesbs]").forEach((section) => {
	const screen = section.querySelector(".home-sbs__screen")
	const items = gsap.utils.toArray(section.querySelectorAll(".item-home-sbs"))
	const progress = section.querySelector(".home-sbs__pagination--act")
	const iconItems = gsap.utils.toArray(section.querySelectorAll(".info-home-sbs__pagination li"))

	if (!screen || !progress || !items.length) return

	const progressItems = items.map(() => {
		const item = document.createElement("span")
		item.className = "home-sbs__pagination-step"
		return item
	})

	progress.replaceChildren(...progressItems)

	const state = {
		position: 0
	}
	const lastPosition = Math.max(items.length - 1, 0)
	const entryDuration = 100 / homeSbsConfig.scrollUnitVh
	const progressDurations = items.map((_, index) => {
		const transitionDuration = index ? homeSbsConfig.transitionDuration : entryDuration
		return transitionDuration + homeSbsConfig.centerHoldDuration
	})
	const totalProgressDuration = progressDurations.reduce((total, duration) => total + duration, 0)

	gsap.set(section, {
		height: `${totalProgressDuration * homeSbsConfig.scrollUnitVh}vh`
	})

	let itemStep = 0
	let curveNear = 0
	let curveFar = 0
	let scaleStep = 0.1
	let scaleMin = 0.6
	let activeIndex = -1

	const curvePosition = (distance) => {
		const clampedDistance = clamp(distance, 0, 2)

		if (clampedDistance <= 1) {
			return curveNear * smoothstep(clampedDistance)
		}

		return curveNear + (curveFar - curveNear) * smoothstep(clampedDistance - 1)
	}

	const setActiveItem = (nextIndex) => {
		if (nextIndex === activeIndex) return

		activeIndex = nextIndex
		section.dataset.activeStep = String(nextIndex + 1)

		items.forEach((item, index) => {
			item.classList.toggle("-active", index === nextIndex)
		})

		iconItems.forEach((item, index) => {
			const isActive = index === nextIndex
			item.classList.toggle("-active", isActive)
			isActive ? item.setAttribute("aria-current", "step") : item.removeAttribute("aria-current")
		})
	}

	const renderProgress = (value) => {
		const elapsed = value * totalProgressDuration
		let itemStart = 0

		progressItems.forEach((item, index) => {
			const itemProgress = clamp((elapsed - itemStart) / progressDurations[index], 0, 1)
			item.style.setProperty("--progress", itemProgress.toFixed(4))
			itemStart += progressDurations[index]
		})
	}

	const renderCards = () => {
		const position = state.position

		items.forEach((item, index) => {
			const relativePosition = index - position
			const distance = Math.abs(relativePosition)
			const scale = Math.max(scaleMin, 1 - distance * scaleStep)

			gsap.set(item, {
				x: curvePosition(distance),
				y: relativePosition * itemStep,
				yPercent: -50,
				scale,
				zIndex: Math.max(1, 100 - Math.round(distance * 10)),
				force3D: true
			})
		})

		setActiveItem(clamp(Math.round(position), 0, items.length - 1))
	}

	const measure = () => {
		const itemWidth = items[0].offsetWidth
		const itemHeight = items[0].offsetHeight
		const curveScale = isMobile.matches ? homeSbsConfig.mobileCurveScale : homeSbsConfig.curveScale

		itemStep = itemHeight + homeSbsConfig.itemGap
		curveNear = itemWidth * (156 / 764) * curveScale
		curveFar = itemWidth * (300 / 764) * curveScale
		scaleStep = prefersReducedMotion.matches ? 0 : homeSbsConfig.scaleStep
		scaleMin = homeSbsConfig.scaleMin

		renderCards()
	}

	const scrub = prefersReducedMotion.matches ?
		true :
		homeSbsConfig.scrub

	renderProgress(0)
	measure()

	const progressState = {
		value: 0
	}
	gsap.to(progressState, {
		value: 1,
		duration: 1,
		ease: "none",
		onUpdate: () => renderProgress(progressState.value),
		scrollTrigger: {
			trigger: section,
			start: "top bottom",
			end: "bottom bottom",
			scrub,
			invalidateOnRefresh: true
		}
	})

	const cardsTimeline = gsap.timeline({
		scrollTrigger: {
			trigger: section,
			start: "top top",
			end: "bottom bottom",
			pin: screen,
			pinSpacing: false,
			scrub,
			anticipatePin: 1,
			invalidateOnRefresh: true,
			onRefreshInit: measure
		}
	})

	const addCenterHold = () => {
		cardsTimeline.to({}, {
			duration: homeSbsConfig.centerHoldDuration,
			ease: "none"
		})
	}

	addCenterHold()

	for (let index = 1; index <= lastPosition; index++) {
		cardsTimeline.to(state, {
			position: index,
			duration: homeSbsConfig.transitionDuration,
			ease: "none",
			onUpdate: renderCards
		})

		addCenterHold()
	}
})

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initHomeSbs, {
		once: true
	})
} else {
	initHomeSbs()
}