import {
	gsap,
	ScrollTrigger
} from "gsap/all"
import "./scrollreveal.scss"

gsap.registerPlugin(ScrollTrigger)

const DEFAULT_Y = 160
const DEFAULT_START = "top bottom"
const DEFAULT_END = "top center+=20%"
const DEFAULT_SCRUB = 0.8

const getNumber = (value, fallback) => {
	const number = Number.parseFloat(value)

	return Number.isFinite(number) ? number : fallback
}

export const initScrollReveal = (root = document) => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

	root.querySelectorAll("[data-fls-scrollreveal]:not([data-fls-scrollreveal-ready])").forEach((item) => {
		const y = getNumber(item.dataset.flsScrollrevealY, DEFAULT_Y)
		const scrub = getNumber(item.dataset.flsScrollrevealScrub, DEFAULT_SCRUB)

		item.dataset.flsScrollrevealReady = ""

		gsap.set(item, {
			y,
			opacity: 0
		})

		gsap.to(item, {
			y: 0,
			opacity: 1,
			ease: "none",
			scrollTrigger: {
				trigger: item,
				start: item.dataset.flsScrollrevealStart || DEFAULT_START,
				end: item.dataset.flsScrollrevealEnd || DEFAULT_END,
				scrub,
				invalidateOnRefresh: true
			}
		})
	})
}

initScrollReveal()
