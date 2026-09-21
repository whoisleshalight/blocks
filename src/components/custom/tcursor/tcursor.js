import "./tcursor.scss"

const trackerStates = []
let animationFrame = 0

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const renderTrackers = () => {
	animationFrame = 0
	let hasMovement = false

	trackerStates.forEach((state) => {
		if (!state.hasPosition) return

		const distanceX = state.targetX - state.currentX
		const distanceY = state.targetY - state.currentY

		state.currentX += distanceX * state.speed
		state.currentY += distanceY * state.speed

		if (Math.abs(distanceX) > 0.05 || Math.abs(distanceY) > 0.05) {
			hasMovement = true
		} else {
			state.currentX = state.targetX
			state.currentY = state.targetY
		}

		state.tracker.style.setProperty("--tcursor-x", `${state.currentX}px`)
		state.tracker.style.setProperty("--tcursor-y", `${state.currentY}px`)
	})

	if (hasMovement) animationFrame = window.requestAnimationFrame(renderTrackers)
}

const requestTrackerRender = () => {
	if (!animationFrame) animationFrame = window.requestAnimationFrame(renderTrackers)
}

document.querySelectorAll("[data-fls-tcursor][data-go-target]").forEach((tracker) => {
	const targetSelector = tracker.dataset.goTarget?.trim()
	const stateTargetSelector = tracker.dataset.goStateTarget?.trim()
	const stateRootSelector = tracker.dataset.goStateRoot?.trim()
	const stateClass = tracker.dataset.goStateClass?.trim()
	const stateContent = tracker.dataset.goStateContent
	if (!targetSelector) return

	const findTargets = (selector) => {
		if (!selector) return []

		try {
			return [...document.querySelectorAll(selector)]
		} catch (error) {
			console.warn(`Invalid tracker cursor target: ${selector}`, error)
			return []
		}
	}
	const targets = findTargets(targetSelector)
	const stateTargets = findTargets(stateTargetSelector)

	if (!targets.length && !stateTargets.length) {
		console.warn(`Tracker cursor target was not found: ${targetSelector}`)
		return
	}

	const configuredSpeed = Number.parseFloat(tracker.dataset.tcursorSpeed)
	const configuredContentDelay = Number.parseFloat(tracker.dataset.tcursorContentDelay)
	const defaultContent = tracker.innerHTML
	const state = {
		tracker,
		defaultContent,
		targetX: 0,
		targetY: 0,
		currentX: 0,
		currentY: 0,
		speed: Number.isFinite(configuredSpeed) ? clamp(configuredSpeed, 0.05, 1) : 0.16,
		hasPosition: false,
		activeTargets: new Set(),
		activeStateTargets: new Set(),
		isStateContent: false,
		isContentTransitioning: false,
		contentDelay: Number.isFinite(configuredContentDelay) ? Math.max(0, configuredContentDelay) : 450,
		contentTimer: 0,
		contentTransitionId: 0
	}

	trackerStates.push(state)

	const updatePosition = (event, snap = false) => {
		if (event.pointerType === "touch") return

		state.targetX = event.clientX
		state.targetY = event.clientY

		if (!state.hasPosition || snap) {
			state.currentX = state.targetX
			state.currentY = state.targetY
			state.hasPosition = true
			tracker.style.setProperty("--tcursor-x", `${state.currentX}px`)
			tracker.style.setProperty("--tcursor-y", `${state.currentY}px`)
		}

		requestTrackerRender()
	}

	const updateContent = () => {
		const showStateContent = state.activeStateTargets.size > 0 && stateContent !== undefined
		if (showStateContent === state.isStateContent) return

		state.isStateContent = showStateContent
		state.isContentTransitioning = true
		state.contentTransitionId += 1
		const transitionId = state.contentTransitionId
		const wasVisible = tracker.classList.contains("-tcursor-active")
		tracker.classList.remove("-tcursor-active")

		const replaceContent = () => {
			if (transitionId !== state.contentTransitionId) return

			if (showStateContent) {
				tracker.textContent = stateContent
			} else {
				tracker.innerHTML = defaultContent
			}

			state.isContentTransitioning = false
			if (!state.activeTargets.size) return

			window.requestAnimationFrame(() => {
				if (state.activeTargets.size && !state.isContentTransitioning) {
					tracker.classList.add("-tcursor-active")
				}
			})
		}

		window.clearTimeout(state.contentTimer)
		if (wasVisible) {
			state.contentTimer = window.setTimeout(replaceContent, state.contentDelay)
		} else {
			replaceContent()
		}
	}

	const showTracker = (target, event, isStateTarget = false) => {
		if (event.pointerType === "touch") return

		state.activeTargets.add(target)
		if (isStateTarget) state.activeStateTargets.add(target)
		updateContent()
		updatePosition(event, !tracker.classList.contains("-tcursor-active"))

		window.requestAnimationFrame(() => {
			if (state.activeTargets.size && !state.isContentTransitioning) {
				tracker.classList.add("-tcursor-active")
			}
		})
	}

	const hideTracker = (target) => {
		state.activeTargets.delete(target)
		state.activeStateTargets.delete(target)
		updateContent()
		if (!state.activeTargets.size) tracker.classList.remove("-tcursor-active")
	}

	const bindTarget = (target, { isStateTarget = false, isEnabled = () => true } = {}) => {
		if (!isStateTarget) target.classList.add("-has-tracker-cursor")

		target.addEventListener("pointerenter", (event) => {
			if (!isEnabled()) return
			showTracker(target, event, isStateTarget)
		})

		target.addEventListener("pointermove", (event) => {
			if (!isEnabled()) {
				hideTracker(target)
				return
			}

			if (!state.activeTargets.has(target)) {
				showTracker(target, event, isStateTarget)
				return
			}

			updatePosition(event)
		}, { passive: true })

		target.addEventListener("pointerleave", () => {
			hideTracker(target)
		})
	}

	targets.forEach((target) => bindTarget(target))

	stateTargets.forEach((target) => {
		const stateRoot = stateRootSelector ? target.closest(stateRootSelector) : target
		const isEnabled = () => Boolean(stateRoot && (!stateClass || stateRoot.classList.contains(stateClass)))
		const updateStateTarget = () => {
			target.classList.toggle("-has-tracker-cursor", isEnabled())

			if (!isEnabled()) {
				hideTracker(target)
				return
			}

			if (!state.hasPosition) return

			const rect = target.getBoundingClientRect()
			const isPointerInside = state.targetX >= rect.left && state.targetX <= rect.right
				&& state.targetY >= rect.top && state.targetY <= rect.bottom

			if (isPointerInside) {
				showTracker(target, {
					pointerType: "mouse",
					clientX: state.targetX,
					clientY: state.targetY
				}, true)
			}
		}

		bindTarget(target, { isStateTarget: true, isEnabled })
		updateStateTarget()

		if (stateRoot && stateClass && "MutationObserver" in window) {
			const observer = new MutationObserver(updateStateTarget)
			observer.observe(stateRoot, { attributes: true, attributeFilter: ["class"] })
		}
	})
})

window.addEventListener("blur", () => {
	trackerStates.forEach((state) => {
		window.clearTimeout(state.contentTimer)
		state.contentTransitionId += 1
		state.activeTargets.clear()
		state.activeStateTargets.clear()
		state.isStateContent = false
		state.isContentTransitioning = false
		state.tracker.innerHTML = state.defaultContent
		state.tracker.classList.remove("-tcursor-active")
	})
})
