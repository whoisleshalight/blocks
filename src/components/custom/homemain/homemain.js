import "./homemain.scss"

document.querySelectorAll(".video-main").forEach((videoMain) => {
	const mask = videoMain.querySelector(".video-main__mask")
	const maskContent = videoMain.querySelector(".video-main__mask-content")
	const textShape = videoMain.querySelector("#video-text-shape")
	const hitArea = videoMain.querySelector(".video-main__hit-area")
	const video = videoMain.querySelector(".video-main__media")
	const horizontalPadding = 32
	let paddingInViewBox = 0
	let textScaleX = 1
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
		videoMain.classList.add("is-entered")
		document.documentElement.classList.add("-active-main-video")
		mask.setAttribute("aria-pressed", "true")
		mask.setAttribute("aria-label", "Close full-screen video")
		video.play().catch(() => {})
	}

	const exitVideo = () => {
		if (!videoMain.classList.contains("is-entered")) return

		videoMain.classList.remove("is-entered")
		document.documentElement.classList.remove("-active-main-video")
		mask.setAttribute("aria-pressed", "false")
		mask.setAttribute("aria-label", "Open video full screen")
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
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") exitVideo()
	})
})
