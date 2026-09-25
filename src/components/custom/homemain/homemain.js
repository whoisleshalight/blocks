import "./homemain.scss"

document.querySelectorAll(".center-main__wrapper").forEach((wrapper) => {
	const main = wrapper.closest(".main")
	const quadrantElements = {
		one: main?.querySelector(".main__el.-one"),
		two: main?.querySelector(".main__el.-two"),
		three: main?.querySelector(".main__el.-three"),
		four: main?.querySelector(".main__el.-four")
	}
	let activeElement = null
	let currentAngle = 0
	let targetAngle = 0
	let animationFrame = 0

	const setActiveQuadrant = (angle) => {
		const angleInRadians = angle * Math.PI / 180
		const isLeft = Math.cos(angleInRadians) < 0
		const isTop = Math.sin(angleInRadians) < 0
		const quadrant = isLeft
			? (isTop ? "one" : "two")
			: (isTop ? "three" : "four")
		const nextActiveElement = quadrantElements[quadrant]

		if (!nextActiveElement || nextActiveElement === activeElement) return

		activeElement?.classList.remove("-active")
		nextActiveElement.classList.add("-active")
		activeElement = nextActiveElement
	}

	const rotateTowardsCursor = () => {
		const angleDifference = ((targetAngle - currentAngle + 540) % 360) - 180
		currentAngle += angleDifference * 0.12
		wrapper.style.transform = `rotate(${currentAngle}deg)`
		setActiveQuadrant(currentAngle)

		if (Math.abs(angleDifference) > 0.05) {
			animationFrame = window.requestAnimationFrame(rotateTowardsCursor)
			return
		}

		currentAngle = targetAngle
		wrapper.style.transform = `rotate(${currentAngle}deg)`
		setActiveQuadrant(currentAngle)
		animationFrame = 0
	}

	document.addEventListener("pointermove", (event) => {
		if (event.pointerType === "touch") return

		const rect = wrapper.getBoundingClientRect()
		const centerX = rect.left + rect.width / 2
		const centerY = rect.top + rect.height / 2
		targetAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI

		if (!animationFrame) {
			animationFrame = window.requestAnimationFrame(rotateTowardsCursor)
		}
	}, { passive: true })
})

let leavingVideoTimer = 0

document.querySelectorAll(".video-main").forEach((videoMain) => {
	const mask = videoMain.querySelector(".video-main__mask")
	const maskContent = videoMain.querySelector(".video-main__mask-content")
	const textShape = videoMain.querySelector("#video-text-shape")
	const hitArea = videoMain.querySelector(".video-main__hit-area")
	const video = videoMain.querySelector(".video-main__media")
	const horizontalPadding = 32
	const exitScrollDistance = 60
	let paddingInViewBox = 0
	let textScaleX = 1
	let enteredAtScrollY = 0
	const safeZoomPoints = [
		{ maxX: 270, x: 32, y: 82, clearance: 28 },
		{ maxX: 551, x: 317, y: 82, clearance: 28 },
		{ maxX: 923, x: 592, y: 82, clearance: 27 },
		{ maxX: 1294, x: 964, y: 82, clearance: 27 },
		{ maxX: 1571, x: 1337, y: 82, clearance: 28 },
		{ maxX: Infinity, x: 1712, y: 82, clearance: 14 }
	]

	if (!mask || !maskContent || !textShape || !hitArea || !video) return

	const updateTextPadding = () => {
		const screenMatrix = mask.getScreenCTM()
		if (!screenMatrix) return

		const viewBox = mask.viewBox.baseVal
		const screenScaleX = Math.hypot(screenMatrix.a, screenMatrix.b)
		paddingInViewBox = horizontalPadding / screenScaleX
		textScaleX = Math.max(0.1, (viewBox.width - paddingInViewBox * 2) / viewBox.width)
		textShape.setAttribute("transform", `matrix(${textScaleX} 0 0 1 ${paddingInViewBox} 0)`)
		hitArea.setAttribute("x", paddingInViewBox)
		hitArea.setAttribute("width", viewBox.width - paddingInViewBox * 2)
	}

	updateTextPadding()
	window.requestAnimationFrame(updateTextPadding)
	window.addEventListener("resize", updateTextPadding)

	const enterVideo = (clientX, clientY) => {
		if (videoMain.classList.contains("is-entered")) return

		const screenMatrix = mask.getScreenCTM()
		if (!screenMatrix) return

		window.clearTimeout(leavingVideoTimer)
		document.documentElement.classList.remove("-leaving-main-video")

		const screenPoint = mask.createSVGPoint()
		screenPoint.x = clientX
		screenPoint.y = clientY
		const clickedPoint = screenPoint.matrixTransform(screenMatrix.inverse())
		const clickedXInShape = (clickedPoint.x - paddingInViewBox) / textScaleX
		const baseSafePoint = safeZoomPoints.find(({ maxX }) => clickedXInShape <= maxX) ?? safeZoomPoints[0]
		const safePoint = {
			x: paddingInViewBox + baseSafePoint.x * textScaleX,
			y: baseSafePoint.y,
			clearance: baseSafePoint.clearance * Math.min(textScaleX, 1)
		}
		const viewBox = mask.viewBox.baseVal
		const centerX = viewBox.x + viewBox.width / 2
		const centerY = viewBox.y + viewBox.height / 2
		const shiftX = centerX - safePoint.x
		const shiftY = centerY - safePoint.y
		const scaleX = Math.hypot(screenMatrix.a, screenMatrix.b)
		const scaleY = Math.hypot(screenMatrix.c, screenMatrix.d)
		const visibleWidth = mask.getBoundingClientRect().width / scaleX
		const visibleHeight = mask.getBoundingClientRect().height / scaleY
		const visibleRadius = Math.hypot(visibleWidth / 2, visibleHeight / 2)
		const zoomScale = Math.min(220, Math.max(55, Math.ceil((visibleRadius / safePoint.clearance) * 1.15)))

		maskContent.style.setProperty("--video-mask-origin", `${safePoint.x}px ${safePoint.y}px`)
		maskContent.style.setProperty("--video-mask-shift-x", `${shiftX}px`)
		maskContent.style.setProperty("--video-mask-shift-y", `${shiftY}px`)
		maskContent.style.setProperty("--video-mask-scale", zoomScale)
		enteredAtScrollY = window.scrollY
		videoMain.classList.add("is-entered")
		document.documentElement.classList.add("-active-main-video")
		mask.setAttribute("aria-pressed", "true")
		mask.setAttribute("aria-label", "Close full-screen video")
		video.play().catch(() => {})
	}

	const exitVideo = () => {
		if (!videoMain.classList.contains("is-entered")) return

		videoMain.classList.remove("is-entered")
		document.documentElement.classList.add("-leaving-main-video")
		document.documentElement.classList.remove("-active-main-video")
		mask.setAttribute("aria-pressed", "false")
		mask.setAttribute("aria-label", "Open video full screen")

		window.clearTimeout(leavingVideoTimer)
		leavingVideoTimer = window.setTimeout(() => {
			document.documentElement.classList.remove("-leaving-main-video")
		}, 1400)
	}

	hitArea.addEventListener("click", (event) => {
		event.stopPropagation()
		enterVideo(event.clientX, event.clientY)
	})

	mask.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return

		event.preventDefault()
		if (videoMain.classList.contains("is-entered")) {
			exitVideo()
			return
		}

		const maskRect = mask.getBoundingClientRect()
		enterVideo(
			maskRect.left + maskRect.width * 0.32,
			maskRect.top + maskRect.height * 0.5
		)
	})

	video.addEventListener("click", exitVideo)
	window.addEventListener("scroll", () => {
		if (!videoMain.classList.contains("is-entered")) return
		if (Math.abs(window.scrollY - enteredAtScrollY) <= exitScrollDistance) return

		exitVideo()
	}, { passive: true })

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") exitVideo()
	})
})
