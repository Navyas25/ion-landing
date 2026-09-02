import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function createScrollAnimations(
  canvasRef: { current: { setProgress: (p: number) => void } | null },
  containerRef: HTMLElement | null
) {
  if (!containerRef) return () => {};

  const ctx = gsap.context(() => {
    // Main product rotation scroll
    ScrollTrigger.create({
      trigger: containerRef,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      onUpdate: (self) => {
        canvasRef.current?.setProgress(self.progress);
      },
    });

    // Text reveals
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "top 50%",
            scrub: 0.8,
          },
        }
      );
    });

    // Feature labels
    gsap.utils.toArray<HTMLElement>(".feature-label").forEach((el, i) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: i * 0.1,
        scrollTrigger: {
          trigger: el.closest("section") || el,
          start: "top 60%",
          toggleActions: "play none none reverse",
        },
      });
    });
  }, containerRef);

  return () => ctx.revert();
}
