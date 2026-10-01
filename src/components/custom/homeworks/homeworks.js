import "./homeworks.scss"
import {
	gsap,
	ScrollTrigger
} from "gsap/all"

gsap.registerPlugin(ScrollTrigger)

const initWorksActions = (section) => {
	const actions = section.querySelector(".works__actions")
	const firstLink = actions?.querySelector(".-btn-02")
	const secondLink = actions?.querySelector(".-btn-03")

	if (!actions || !firstLink || !secondLink || !window.matchMedia("(min-width: 992px)").matches) return

	let finalWidth = 0
	const getInitialWidth = () => {
		const styles = window.getComputedStyle(actions)
		const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0
		const paddingRight = Number.parseFloat(styles.paddingRight) || 0
		const gap = Number.parseFloat(styles.columnGap) || 0
		const availableWidth = actions.clientWidth - paddingLeft - paddingRight - gap
		const secondLinkMinWidth = Number.parseFloat(window.getComputedStyle(secondLink).minWidth) || 0
		const maximumFirstLinkWidth = availableWidth - secondLinkMinWidth

		return Math.max(finalWidth, Math.min(availableWidth * 0.7, maximumFirstLinkWidth))
	}
	const measureWidths = () => {
		gsap.set(firstLink, {
			clearProps: "width,flex"
		})
		finalWidth = firstLink.getBoundingClientRect().width
		gsap.set(firstLink, {
			width: getInitialWidth(),
			flex: "0 0 auto"
		})
	}

	measureWidths()
	gsap.set(firstLink, {
		willChange: "width"
	})
	gsap.set(actions, {
		visibility: "visible"
	})

	gsap.to(firstLink, {
		width: () => finalWidth,
		ease: "power2.inOut",
		scrollTrigger: {
			trigger: actions,
			start: "top bottom",
			end: "center center-=20%",
			scrub: 1.2,
			invalidateOnRefresh: true,
			onRefreshInit: measureWidths
		}
	})
}

const initHomeworksAnimations = () => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

	document.querySelectorAll("[data-fls-homeworks]").forEach((section) => {
		const itemValueGraphics = section.querySelectorAll(".item-works__value > svg")

		initWorksActions(section)

		itemValueGraphics.forEach((graphic) => {
			gsap.set(graphic, {
				yPercent: 55,
				opacity: 0,
				willChange: "transform, opacity"
			})

			gsap.to(graphic, {
				yPercent: -55,
				ease: "none",
				scrollTrigger: {
					trigger: graphic.closest(".item-works"),
					start: "top bottom",
					end: "bottom top",
					scrub: 0.6,
					invalidateOnRefresh: true
				}
			})

			gsap.to(graphic, {
				opacity: 1,
				ease: "none",
				scrollTrigger: {
					trigger: graphic.closest(".item-works"),
					start: "top bottom-=20%",
					end: "top center-=20%",
					scrub: 0.6,
					invalidateOnRefresh: true
				}
			})
		})
	})
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initHomeworksAnimations, {
		once: true
	})
} else {
	initHomeworksAnimations()
}
