import * as THREE from "three"

const defaultConfig = {
	gridSize: 8,
	mouseRadius: 1.75,
	strength: 0.8,
	relaxation: 0.92,
	displacement: 1,
	aberration: 0.2,
	velocityDecay: 0.3,
	scrollStrength: 0.045,
	scrollMaxOffset: 0.0075,
	scrollDecay: 0.78,
	overflow: 0.16,
	maxOffset: 0.35
}

const vertexShader = /* glsl */ `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

const fragmentShader = /* glsl */ `
	uniform sampler2D uImage;
	uniform sampler2D uGrid;
	uniform vec2 uGridSize;
	uniform vec4 uImageBounds;
	uniform float uDisplacement;
	uniform float uAberration;
	varying vec2 vUv;

	float insideImage(vec2 uv) {
		return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
	}

	vec4 sampleImage(vec2 uv) {
		return texture2D(uImage, clamp(uv, 0.0, 1.0)) * insideImage(uv);
	}

	void main() {
		vec2 safeUv = min(vUv, vec2(0.999999));
		vec2 cellUv = (floor(safeUv * uGridSize) + 0.5) / uGridSize;
		vec2 offset = texture2D(uGrid, cellUv).rg;
		vec2 shift = offset * uDisplacement;
		vec2 split = offset * uAberration;
		vec2 imageUv = (vUv - uImageBounds.xy) / (uImageBounds.zw - uImageBounds.xy);
		vec2 centerUv = imageUv + shift;
		vec4 center = sampleImage(centerUv);
		vec4 redSample = sampleImage(centerUv + split);
		vec4 blueSample = sampleImage(centerUv - split);
		float alpha = max(center.a, max(redSample.a, blueSample.a));

		gl_FragColor = vec4(redSample.r, center.g, blueSample.b, alpha);
	}
`

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const waitForImage = (image) => {
	if (image.complete && image.naturalWidth > 0) return Promise.resolve()

	return new Promise((resolve, reject) => {
		image.addEventListener("load", resolve, { once: true })
		image.addEventListener("error", reject, { once: true })
	})
}

class PixelImageEffect {
	constructor(image, config) {
		this.image = image
		this.config = config
		this.ready = false
	}

	async init() {
		await waitForImage(this.image)

		const imageWidth = this.image.naturalWidth
		const imageHeight = this.image.naturalHeight
		const aspect = imageWidth / imageHeight
		const canvasScale = 1 + this.config.overflow * 2

		if (aspect >= 1) {
			this.gridHeight = Math.max(1, Math.round(this.config.gridSize * canvasScale))
			this.gridWidth = Math.max(1, Math.round(this.config.gridSize * aspect * canvasScale))
		} else {
			this.gridWidth = Math.max(1, Math.round(this.config.gridSize * canvasScale))
			this.gridHeight = Math.max(1, Math.round(this.config.gridSize / aspect * canvasScale))
		}

		this.gridData = new Float32Array(this.gridWidth * this.gridHeight * 4)
		this.gridTexture = new THREE.DataTexture(
			this.gridData,
			this.gridWidth,
			this.gridHeight,
			THREE.RGBAFormat,
			THREE.FloatType
		)
		this.gridTexture.minFilter = THREE.NearestFilter
		this.gridTexture.magFilter = THREE.NearestFilter
		this.gridTexture.generateMipmaps = false
		this.gridTexture.needsUpdate = true

		this.imageTexture = new THREE.Texture(this.image)
		this.imageTexture.minFilter = THREE.LinearFilter
		this.imageTexture.magFilter = THREE.LinearFilter
		this.imageTexture.wrapS = THREE.ClampToEdgeWrapping
		this.imageTexture.wrapT = THREE.ClampToEdgeWrapping
		this.imageTexture.generateMipmaps = false
		this.imageTexture.needsUpdate = true

		this.scene = new THREE.Scene()
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uImage: { value: this.imageTexture },
				uGrid: { value: this.gridTexture },
				uGridSize: { value: new THREE.Vector2(this.gridWidth, this.gridHeight) },
				uImageBounds: {
					value: new THREE.Vector4(
						this.config.overflow / canvasScale,
						this.config.overflow / canvasScale,
						1 - this.config.overflow / canvasScale,
						1 - this.config.overflow / canvasScale
					)
				},
				uDisplacement: { value: this.config.displacement },
				uAberration: { value: this.config.aberration }
			},
			vertexShader,
			fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false
		})
		this.geometry = new THREE.PlaneGeometry(2, 2)
		this.mesh = new THREE.Mesh(this.geometry, this.material)
		this.scene.add(this.mesh)

		this.renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: false,
			powerPreference: "high-performance"
		})
		this.renderer.setClearColor(0x000000, 0)
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
		this.renderer.setSize(
			Math.round(imageWidth * canvasScale),
			Math.round(imageHeight * canvasScale),
			false
		)

		this.canvas = this.renderer.domElement
		this.canvas.classList.add("main__el-pixel-canvas")
		this.canvas.setAttribute("aria-hidden", "true")
		this.canvas.addEventListener("webglcontextlost", (event) => {
			event.preventDefault()
			this.image.classList.remove("-pixel-effect-source")
			this.canvas.hidden = true
		})

		this.renderer.render(this.scene, this.camera)
		this.image.insertAdjacentElement("afterend", this.canvas)
		this.syncCanvasLayout = () => {
			const width = this.image.offsetWidth
			const height = this.image.offsetHeight

			if (!width || !height) return

			this.canvas.style.left = `${this.image.offsetLeft - width * this.config.overflow}px`
			this.canvas.style.top = `${this.image.offsetTop - height * this.config.overflow}px`
			this.canvas.style.right = "auto"
			this.canvas.style.bottom = "auto"
			this.canvas.style.width = `${width * canvasScale}px`
			this.canvas.style.height = `${height * canvasScale}px`
		}
		this.syncCanvasLayout()

		if ("ResizeObserver" in window) {
			this.resizeObserver = new ResizeObserver(this.syncCanvasLayout)
			this.resizeObserver.observe(this.image)
		} else {
			window.addEventListener("resize", this.syncCanvasLayout)
		}

		this.image.classList.add("-pixel-effect-source")
		this.ready = true

		return this
	}

	update(pointer) {
		if (!this.ready || this.canvas.hidden) return

		const {
			relaxation,
			mouseRadius,
			strength,
			scrollStrength,
			scrollMaxOffset,
			maxOffset
		} = this.config
		const rect = this.canvas.getBoundingClientRect()
		const hasSize = rect.width > 0 && rect.height > 0
		const isInViewport = hasSize && rect.bottom > 0 && rect.top < window.innerHeight
		const isPointerInside = hasSize && pointer.seen
			&& pointer.x >= rect.left && pointer.x <= rect.right
			&& pointer.y >= rect.top && pointer.y <= rect.bottom
		const mouseX = isPointerInside ? ((pointer.x - rect.left) / rect.width) * this.gridWidth : -1000
		const mouseY = isPointerInside ? (1 - (pointer.y - rect.top) / rect.height) * this.gridHeight : -1000
		const velocityX = hasSize ? pointer.velocityX / rect.width : 0
		const velocityY = hasSize ? -pointer.velocityY / rect.height : 0
		const scrollForce = isInViewport
			? clamp(-pointer.scrollVelocityY / rect.height * scrollStrength, -scrollMaxOffset, scrollMaxOffset)
			: 0
		let needsRender = false

		for (let y = 0; y < this.gridHeight; y++) {
			for (let x = 0; x < this.gridWidth; x++) {
				const dataIndex = (y * this.gridWidth + x) * 4
				const relaxedX = this.gridData[dataIndex] * relaxation
				const relaxedY = this.gridData[dataIndex + 1] * relaxation

				if (Math.abs(relaxedX) > 0.00002 || Math.abs(relaxedY) > 0.00002) {
					needsRender = true
				}

				this.gridData[dataIndex] = Math.abs(relaxedX) > 0.00002 ? relaxedX : 0
				this.gridData[dataIndex + 1] = Math.abs(relaxedY) > 0.00002 ? relaxedY : 0

				if (isPointerInside) {
					const distanceX = x + 0.5 - mouseX
					const distanceY = y + 0.5 - mouseY
					const distance = Math.hypot(distanceX, distanceY)

					if (distance < mouseRadius) {
						const falloff = Math.min(1, Math.pow(1 - distance / mouseRadius, 1.5) * 1.35)
						this.gridData[dataIndex] = clamp(
							this.gridData[dataIndex] + velocityX * strength * falloff,
							-maxOffset,
							maxOffset
						)
						this.gridData[dataIndex + 1] = clamp(
							this.gridData[dataIndex + 1] + velocityY * strength * falloff,
							-maxOffset,
							maxOffset
						)
						needsRender = true
					}
				}

				if (Math.abs(scrollForce) > 0.00002) {
					const variation = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233)
					const rowFalloff = 0.6 + Math.sin(((y + 0.5) / this.gridHeight) * Math.PI) * 0.4

					this.gridData[dataIndex] = clamp(
						this.gridData[dataIndex] + scrollForce * variation * 0.16,
						-maxOffset,
						maxOffset
					)
					this.gridData[dataIndex + 1] = clamp(
						this.gridData[dataIndex + 1] + scrollForce * (0.7 + Math.abs(variation) * 0.3) * rowFalloff,
						-maxOffset,
						maxOffset
					)
					needsRender = true
				}
			}
		}

		if (!needsRender) return

		this.gridTexture.needsUpdate = true
		this.renderer.render(this.scene, this.camera)
	}

	destroy() {
		this.image.classList.remove("-pixel-effect-source")
		this.resizeObserver?.disconnect()
		window.removeEventListener("resize", this.syncCanvasLayout)
		this.canvas?.remove()
		this.geometry?.dispose()
		this.material?.dispose()
		this.gridTexture?.dispose()
		this.imageTexture?.dispose()
		this.renderer?.dispose()
	}
}

export const initPixelImageEffects = async (selector, options = {}) => {
	const config = { ...defaultConfig, ...options }
	const images = [...document.querySelectorAll(selector)]
		.filter((image) => !image.dataset.pixelEffectInitialized)

	if (!images.length) return null

	images.forEach((image) => {
		image.dataset.pixelEffectInitialized = "true"
	})

	const effects = (await Promise.all(images.map(async (image) => {
		try {
			return await new PixelImageEffect(image, config).init()
		} catch (error) {
			delete image.dataset.pixelEffectInitialized
			console.warn("Pixel image effect could not be initialized", error)
			return null
		}
	}))).filter(Boolean)

	if (!effects.length) return null

	const pointer = {
		x: -1000,
		y: -1000,
		velocityX: 0,
		velocityY: 0,
		scrollVelocityY: 0,
		lastTime: 0,
		seen: false
	}
	let animationFrame = 0
	let isSectionVisible = true
	let previousScrollY = window.scrollY
	let previousScrollTime = performance.now()

	const handlePointerMove = (event) => {
		if (event.pointerType === "touch") return

		if (!pointer.seen) {
			pointer.x = event.clientX
			pointer.y = event.clientY
			pointer.lastTime = event.timeStamp
			pointer.seen = true
			return
		}

		const elapsed = clamp(event.timeStamp - pointer.lastTime, 8, 40)
		const frameScale = 1000 / 60 / elapsed
		const nextVelocityX = (event.clientX - pointer.x) * frameScale
		const nextVelocityY = (event.clientY - pointer.y) * frameScale

		pointer.velocityX = pointer.velocityX * 0.25 + nextVelocityX * 0.75
		pointer.velocityY = pointer.velocityY * 0.25 + nextVelocityY * 0.75
		pointer.x = event.clientX
		pointer.y = event.clientY
		pointer.lastTime = event.timeStamp
	}

	const handleScroll = () => {
		const now = performance.now()
		const elapsed = clamp(now - previousScrollTime, 8, 40)
		const frameScale = 1000 / 60 / elapsed
		const nextVelocityY = (window.scrollY - previousScrollY) * frameScale

		pointer.scrollVelocityY = pointer.scrollVelocityY * 0.3 + nextVelocityY * 0.7
		previousScrollY = window.scrollY
		previousScrollTime = now
	}

	const resetPointer = () => {
		pointer.seen = false
		pointer.velocityX = 0
		pointer.velocityY = 0
		pointer.scrollVelocityY = 0
	}

	const render = () => {
		animationFrame = window.requestAnimationFrame(render)

		if (document.hidden || !isSectionVisible) return

		effects.forEach((effect) => effect.update(pointer))
		pointer.velocityX *= config.velocityDecay
		pointer.velocityY *= config.velocityDecay
		pointer.scrollVelocityY *= config.scrollDecay
	}

	window.addEventListener("pointermove", handlePointerMove, { passive: true })
	window.addEventListener("scroll", handleScroll, { passive: true })
	window.addEventListener("blur", resetPointer)
	document.documentElement.addEventListener("mouseleave", resetPointer)

	const section = images[0].closest(".main")
	const observer = section && "IntersectionObserver" in window
		? new IntersectionObserver(([entry]) => {
			isSectionVisible = entry.isIntersecting
		}, { threshold: 0 })
		: null

	if (section && observer) observer.observe(section)
	render()

	return () => {
		window.cancelAnimationFrame(animationFrame)
		window.removeEventListener("pointermove", handlePointerMove)
		window.removeEventListener("scroll", handleScroll)
		window.removeEventListener("blur", resetPointer)
		document.documentElement.removeEventListener("mouseleave", resetPointer)
		observer?.disconnect()
		effects.forEach((effect) => effect.destroy())
	}
}
