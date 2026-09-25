import "./homesbs.scss"
import { gsap, ScrollTrigger } from "gsap/all"

gsap.registerPlugin(ScrollTrigger)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const smoothstep = (value) => value * value * (3 - 2 * value)
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

const initHomeSbs = () => document.querySelectorAll("[data-fls-homesbs]").forEach((section) => {
	const screen = section.querySelector(".home-sbs__screen")
	const items = gsap.utils.toArray(section.querySelectorAll(".item-home-sbs"))
	const progressItems = gsap.utils.toArray(section.querySelectorAll(".home-sbs__pagination--act > span"))
	const iconItems = gsap.utils.toArray(section.querySelectorAll(".info-home-sbs__pagination li"))

	if (!screen || !items.length) return

	const state = { position: 0 }
	const lastPosition = Math.max(items.length - 1, 0)
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

	const renderCards = () => {
		const position = state.position
		const progress = lastPosition ? position / lastPosition : 0

		section.style.setProperty("--home-sbs-progress", progress.toFixed(4))

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

		progressItems.forEach((item, index) => {
			const itemProgress = clamp(position - index + 1, 0, 1)
			const progressLine = item.querySelector(".home-sbs__pagination-progress")
			if (progressLine) progressLine.style.width = `${(itemProgress * 100).toFixed(2)}%`
			item.classList.toggle("-active", index === Math.round(position))
		})

		setActiveItem(clamp(Math.round(position), 0, items.length - 1))
	}

	const measure = () => {
		const sectionStyles = window.getComputedStyle(section)
		const itemWidth = items[0].offsetWidth
		const itemHeight = items[0].offsetHeight
		const itemGap = Number.parseFloat(sectionStyles.getPropertyValue("--home-sbs-item-gap")) || 0
		const curveScale = Number.parseFloat(sectionStyles.getPropertyValue("--home-sbs-curve-scale")) || 1
		const scaleValue = Number.parseFloat(sectionStyles.getPropertyValue("--home-sbs-scale-step"))
		const scaleMinValue = Number.parseFloat(sectionStyles.getPropertyValue("--home-sbs-scale-min"))

		itemStep = itemHeight + itemGap
		curveNear = itemWidth * (156 / 764) * curveScale
		curveFar = itemWidth * (300 / 764) * curveScale
		scaleStep = Number.isFinite(scaleValue) ? Math.max(0, scaleValue) : 0.1
		scaleMin = Number.isFinite(scaleMinValue) ? clamp(scaleMinValue, 0.1, 1) : 0.6

		renderCards()
	}

	const sectionStyles = window.getComputedStyle(section)
	const scrubValue = Number.parseFloat(sectionStyles.getPropertyValue("--home-sbs-smooth"))
	const scrub = prefersReducedMotion.matches
		? true
		: Number.isFinite(scrubValue) ? Math.max(0, scrubValue) : 0.18

	measure()

	gsap.timeline({
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
	}).to(state, {
		position: lastPosition,
		duration: 1,
		ease: "none",
		onUpdate: renderCards
	})
})

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initHomeSbs, { once: true })
} else {
	initHomeSbs()
}
