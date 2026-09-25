import "./marquee.scss"
import { gsap } from "gsap"

const ATTR_NAMES = {
	inner: "data-fls-marquee-inner",
	group: "data-fls-marquee-group",
	item: "data-fls-marquee-item"
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const debounce = (delay, callback) => {
	let timer = 0

	return (...args) => {
		window.clearTimeout(timer)
		timer = window.setTimeout(() => callback(...args), delay)
	}
}

const getElementSize = (element, isVertical) => isVertical
	? element.offsetHeight
	: element.offsetWidth

const initMarquee = (wrapper) => {
	if (wrapper.querySelector(`[${ATTR_NAMES.inner}]`)) return

	const sourceItems = [...wrapper.children]
	if (!sourceItems.length) return

	const templates = sourceItems.map((item) => {
		const template = item.cloneNode(true)
		template.setAttribute(ATTR_NAMES.item, "")
		return template
	})
	const direction = wrapper.getAttribute("data-fls-marquee-direction")?.trim()
	const isVertical = direction === "top" || direction === "bottom"
	const isReversed = direction === "right" || direction === "bottom"
	const rawSpeed = Number.parseFloat(wrapper.getAttribute("data-fls-marquee-speed"))
	const pixelsPerSecond = Number.isFinite(rawSpeed) && rawSpeed > 0 ? rawSpeed / 10 : 100
	const rawSpace = Number.parseFloat(wrapper.getAttribute("data-fls-marquee-space"))
	const computedItemStyles = window.getComputedStyle(sourceItems[0])
	const computedSpace = Number.parseFloat(
		computedItemStyles.getPropertyValue(isVertical ? "margin-bottom" : "margin-right")
	)
	const spaceBetween = Number.isFinite(rawSpace)
		? Math.max(0, rawSpace)
		: Number.isFinite(computedSpace) && computedSpace > 0 ? computedSpace : 30
	const startProgress = clamp(
		(Number.parseFloat(wrapper.getAttribute("data-fls-marquee-start")) || 0) / 100,
		0,
		1
	)

	const inner = document.createElement("div")
	inner.setAttribute(ATTR_NAMES.inner, "")
	inner.style.flexDirection = isVertical ? "column" : "row"
	wrapper.textContent = ""
	wrapper.append(inner)

	let animation = null
	let isPointerInside = false

	const appendItems = (group, isDuplicate = false) => {
		templates.forEach((template) => {
			const item = template.cloneNode(true)
			item.style.flexShrink = "0"
			item.style[isVertical ? "marginBottom" : "marginRight"] = `${spaceBetween}px`
			if (isDuplicate) item.setAttribute("aria-hidden", "true")
			group.append(item)
		})
	}

	const createGroup = () => {
		const group = document.createElement("div")
		group.setAttribute(ATTR_NAMES.group, "")
		group.style.flexDirection = isVertical ? "column" : "row"
		appendItems(group)
		return group
	}

	const build = () => {
		animation?.kill()
		inner.textContent = ""

		const group = createGroup()
		inner.append(group)

		const wrapperSize = getElementSize(wrapper, isVertical)
		let groupSize = getElementSize(group, isVertical)
		let cycles = 0

		while (groupSize < wrapperSize && cycles < 100) {
			appendItems(group, true)
			groupSize = getElementSize(group, isVertical)
			cycles += 1
		}

		if (!groupSize) return

		const duplicateGroup = group.cloneNode(true)
		duplicateGroup.setAttribute("aria-hidden", "true")
		inner.append(duplicateGroup)

		const start = isReversed ? -groupSize : 0
		const end = isReversed ? 0 : -groupSize
		const axis = isVertical ? "y" : "x"

		gsap.set(inner, { x: 0, y: 0, [axis]: start })
		animation = gsap.to(inner, {
			[axis]: end,
			duration: groupSize / pixelsPerSecond,
			repeat: -1,
			ease: "none",
			overwrite: true
		})

		if (startProgress) animation.progress(startProgress)
		if (isPointerInside) animation.pause()
	}

	if (wrapper.hasAttribute("data-fls-marquee-pause-mouse-enter")) {
		wrapper.addEventListener("pointerenter", () => {
			isPointerInside = true
			animation?.pause()
		})
		wrapper.addEventListener("pointerleave", () => {
			isPointerInside = false
			animation?.play()
		})
	}

	const rebuild = debounce(100, build)
	if ("ResizeObserver" in window) {
		const resizeObserver = new ResizeObserver(rebuild)
		resizeObserver.observe(wrapper)
	} else {
		window.addEventListener("resize", rebuild, { passive: true })
	}

	window.addEventListener("load", rebuild, { once: true })
	document.fonts?.ready.then(rebuild)
	build()
}

document.querySelectorAll("[data-fls-marquee]").forEach(initMarquee)
