import "./homeabout.scss"
import {
	gsap,
	ScrollTrigger
} from "gsap/all"

gsap.registerPlugin(ScrollTrigger)

const revealDirections = {
	"top-right": {
		x: 1,
		y: -1
	},
	left: {
		x: -1,
		y: 0
	},
	"bottom-right": {
		x: 1,
		y: 1
	},
	bottom: {
		x: 0,
		y: 1
	}
}

const getRevealDistance = () => Math.min(50, Math.max(48, window.innerWidth * 0.065))

const initFooterAboutReveal = () => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

	document.querySelectorAll("[data-fls-homeabout]").forEach((section) => {
		const layout = section.querySelector(".footer-about-home__layout")
		const items = layout?.querySelectorAll("[data-footer-about-reveal]")

		if (!layout || !items?.length) return

		const lastItem = items[items.length - 1]
		const timeline = gsap.timeline({
			scrollTrigger: {
				trigger: layout,
				start: "top bottom-=8%",
				endTrigger: lastItem,
				end: "bottom bottom-=0px",
				scrub: 0.8,
				invalidateOnRefresh: true
			}
		})

		items.forEach((item) => {
			const direction = revealDirections[item.dataset.footerAboutReveal]

			if (!direction) return

			timeline.fromTo(item, {
				x: () => direction.x * getRevealDistance(),
				y: () => direction.y * getRevealDistance(),
				opacity: 0
			}, {
				x: 0,
				y: 0,
				opacity: 1,
				ease: "none"
			}, 0)

			gsap.set(item, {
				visibility: "visible"
			})
		})
	})
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initFooterAboutReveal, {
		once: true
	})
} else {
	initFooterAboutReveal()
}
