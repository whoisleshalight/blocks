import { gsap, ScrollSmoother, ScrollTrigger } from "gsap/all"

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
const pixelEffectMedia = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)")

if (pixelEffectMedia.matches && !prefersReducedMotion.matches) {
	import("./pixel-image-effect.js").then(({ initPixelImageEffects }) => {
		initPixelImageEffects("[data-pixel-image-effect]")
	})
}

const initScrollSmoother = () => {
	if (prefersReducedMotion.matches || ScrollSmoother.get()) return

	const wrapper = document.querySelector("#smooth-wrapper")
	const content = document.querySelector("#smooth-content")
	if (!wrapper || !content) return

	// Fixed elements cannot stay fixed inside ScrollSmoother's transformed content.
	document.querySelectorAll("[data-fls-tcursor]").forEach((cursor) => {
		document.body.append(cursor)
	})

	const rootStyles = window.getComputedStyle(document.documentElement)
	const smoothValue = Number.parseFloat(rootStyles.getPropertyValue("--scroll-smoother-duration"))
	const smooth = Number.isFinite(smoothValue) ? Math.max(0, smoothValue) : 1.2

	ScrollSmoother.create({
		wrapper,
		content,
		smooth,
		smoothTouch: 0.1,
		effects: true,
		ignoreMobileResize: true
	})
}

initScrollSmoother()

window.addEventListener("load", () => ScrollTrigger.refresh())
