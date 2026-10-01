import "./homepartners.scss"
import {
	gsap,
	ScrollTrigger
} from "gsap/all"

gsap.registerPlugin(ScrollTrigger)

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
	document.querySelectorAll("[data-home-partners-marquee-reveal]").forEach((marquee) => {
		gsap.fromTo(marquee, {
			clipPath: "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)",
			opacity: 0,
			y: 64,
			scale: 0.8
		}, {
			clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
			opacity: 1,
			y: 0,
			scale: 1,
			ease: "power3.out",
			scrollTrigger: {
				trigger: marquee,
				start: "bottom bottom",
				end: "center center-=20%",
				scrub: 1,
				invalidateOnRefresh: true
			}
		})
	})
}
