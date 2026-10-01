import SplitType from "split-type"
import {
	gsap,
	ScrollTrigger
} from "gsap/all"
import "./scrollblur.scss"

gsap.registerPlugin(ScrollTrigger)

const DEFAULT_START = "top bottom+=20%"
const DEFAULT_END = "center center-=30%"
const LONG_TEXT_THRESHOLD = 100

const getBlurScrollTrigger = (item) => {
	const group = item.closest("[data-fls-scrollblur-group]")

	return {
		trigger: group || item,
		start: item.dataset.flsScrollblurStart || group?.dataset.flsScrollblurStart || DEFAULT_START,
		end: item.dataset.flsScrollblurEnd || group?.dataset.flsScrollblurEnd || DEFAULT_END,
		scrub: 0.6,
		invalidateOnRefresh: true
	}
}

const initTextItems = (root) => {
	root.querySelectorAll("[data-fls-scrollblur-text]:not([data-fls-scrollblur-text-ready])").forEach((textItem) => {
		const requestedMode = textItem.dataset.flsScrollblurText
		const isLongText = textItem.textContent.trim().length > LONG_TEXT_THRESHOLD
		const splitByWords = requestedMode === "words" || (requestedMode !== "chars" && isLongText)
		const splitText = new SplitType(textItem, {
			types: splitByWords ? "words" : "words, chars",
			tagName: "span"
		})
		const animatedItems = splitByWords ? splitText.words : splitText.chars

		textItem.dataset.flsScrollblurTextReady = ""

		gsap.set(animatedItems, {
			filter: "blur(12px)",
			opacity: 0
		})

		gsap.to(animatedItems, {
			filter: "blur(0px)",
			opacity: 1,
			ease: "power2.inOut",
			stagger: {
				amount: splitByWords ? 0.25 : 0.35,
				from: "center"
			},
			scrollTrigger: getBlurScrollTrigger(textItem)
		})

		gsap.set(textItem, {
			visibility: "visible"
		})
	})
}

const initElements = (root) => {
	root.querySelectorAll("[data-fls-scrollblur-element]:not([data-fls-scrollblur-element-ready])").forEach((item) => {
		item.dataset.flsScrollblurElementReady = ""

		gsap.set(item, {
			filter: "blur(12px)",
			opacity: 0,
			willChange: "filter, opacity"
		})

		gsap.to(item, {
			filter: "blur(0px)",
			opacity: 1,
			ease: "power2.inOut",
			scrollTrigger: getBlurScrollTrigger(item)
		})
	})
}

const initDecorItems = (root) => {
	root.querySelectorAll("[data-fls-scrollblur-decor]:not([data-fls-scrollblur-decor-ready])").forEach((item) => {
		item.dataset.flsScrollblurDecorReady = ""

		gsap.set(item, {
			"--scroll-blur-decor-blur": "12px",
			"--scroll-blur-decor-opacity": 0
		})

		gsap.to(item, {
			"--scroll-blur-decor-blur": "0px",
			"--scroll-blur-decor-opacity": 1,
			ease: "power2.inOut",
			scrollTrigger: getBlurScrollTrigger(item)
		})
	})
}

export const initScrollBlur = (root = document) => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

	initTextItems(root)
	initElements(root)
	initDecorItems(root)
}

initScrollBlur()
