"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ProductCanvas, { ProductCanvasHandle } from "@/components/ProductCanvas";
import Loader from "@/components/Loader";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

gsap.registerPlugin(ScrollTrigger);

const STOPS = 8;

function curveToStraight(t: number, yCurve = 55) {
  const bulge = yCurve * (1 - t);
  const midY = 100 - bulge;
  return `M 40 100 Q 400 ${midY} 760 100`;
}

function CurvedTitle({
  id,
  text,
  color = "white",
}: {
  id: string;
  text: string;
  color?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pathRef.current || !wrapRef.current) return;

    const obj = { t: 0 };
    const tween = gsap.to(obj, {
      t: 1,
      ease: "none",
      scrollTrigger: {
        trigger: wrapRef.current,
        start: "top 85%",
        end: "top 35%",
        scrub: true,
      },
      onUpdate: () => {
        if (pathRef.current) {
          pathRef.current.setAttribute("d", curveToStraight(obj.t, 55));
        }
      },
    });

    gsap.fromTo(
      wrapRef.current,
      { opacity: 0 },
      {
        opacity: 1,
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top 95%",
          end: "top 70%",
          scrub: true,
        },
      }
    );

    return () => {
      tween.kill();
      ScrollTrigger.getAll()
        .filter((st) => st.trigger === wrapRef.current)
        .forEach((st) => st.kill());
    };
  }, []);

  return (
    <div ref={wrapRef} className="w-full max-w-5xl px-4 mx-auto opacity-0">
      <svg
        viewBox="0 0 800 160"
        className="w-full h-auto overflow-visible"
        style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.7))" }}
      >
        <defs>
          <path ref={pathRef} id={id} d={curveToStraight(0, 55)} fill="none" />
        </defs>
        <text
          fill={color}
          style={{ fontSize: "64px", fontWeight: 700, letterSpacing: "-0.03em" }}
        >
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

const STOP_WORDS: { side: "left" | "right"; word: string }[] = [
  { side: "left", word: "PURE" },
  { side: "right", word: "BOLD" },
  { side: "left", word: "ENERGY" },
  { side: "right", word: "TASTE" },
  { side: "left", word: "STAY" },
  { side: "right", word: "ZERO" },
  { side: "left", word: "CHARGED" },
  { side: "right", word: "LIMITS" },
];

function PauseText({ zone }: { zone: number }) {
  // Zone 0–7

  return (
    <>
      <div className="absolute left-3 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-5 items-start pointer-events-none">
        {STOP_WORDS.filter((w) => w.side === "left").map((item) => {
          const i = STOP_WORDS.indexOf(item);
          const isCurrent = zone === i;
          const seen = zone >= i;
          return (
            <span
              key={item.word}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
              style={{
                opacity: isCurrent ? 1 : seen ? 0.25 : 0,
                transform: isCurrent
                  ? "translateY(0) scale(1)"
                  : seen
                    ? "translateY(0) scale(0.9)"
                    : "translateY(16px) scale(0.9)",
                transition: "none",
              }}
            >
              {item.word}
            </span>
          );
        })}
      </div>

      <div className="absolute right-3 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-5 items-end pointer-events-none">
        {STOP_WORDS.filter((w) => w.side === "right").map((item) => {
          const i = STOP_WORDS.indexOf(item);
          const isCurrent = zone === i;
          const seen = zone >= i;
          return (
            <span
              key={item.word}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
              style={{
                opacity: isCurrent ? 1 : seen ? 0.25 : 0,
                transform: isCurrent
                  ? "translateY(0) scale(1)"
                  : seen
                    ? "translateY(0) scale(0.9)"
                    : "translateY(16px) scale(0.9)",
                transition: "none",
              }}
            >
              {item.word}
            </span>
          );
        })}
      </div>
    </>
  );
}

export default function Home() {
  const canvasRef = useRef<ProductCanvasHandle>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [scrollZone, setScrollZone] = useState(0);
  const scrollProgressRef = useRef(0);

  useSmoothScroll(show);

  const onProgress = useCallback((p: number) => setLoadProgress(p), []);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!show) return;

    // Continuous scrub — 1:1 with native scroll
    const st = ScrollTrigger.create({
      trigger: "#scroll-track",
      start: "top top",
      end: "bottom bottom",
      scrub: true, // boolean true = exact sync, zero lag
      onUpdate: (self) => {
        canvasRef.current?.setProgress(self.progress);
        // Only trigger React re-render when the zone changes (8 total),
        // not on every scroll frame (~60/sec).
        scrollProgressRef.current = self.progress;
        const newZone = Math.min(STOPS - 1, Math.floor(self.progress * STOPS));
        setScrollZone((prev) => (prev === newZone ? prev : newZone));
      },
    });

    gsap.utils.toArray<HTMLElement>("[data-fade]").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "top 55%",
            scrub: true,
          },
        }
      );
    });

    return () => {
      st.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [show]);

  return (
    <>
      <Loader
        progress={loadProgress}
        isComplete={ready}
        onFinish={() => setShow(true)}
      />

      <div className="grain" />

      <div
        className={`fixed inset-0 z-10 transition-opacity duration-700 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      >
        <ProductCanvas
          ref={canvasRef}
          frameCount={477}
          onProgress={onProgress}
          onReady={onReady}
        />
      </div>

      <div
        className={`fixed inset-0 z-20 pointer-events-none transition-opacity duration-700 ${
          show ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse 42% 58% at 50% 50%, transparent 22%, rgba(5,5,8,0.55) 100%)",
        }}
      />

      <main
        className={`relative z-30 transition-opacity duration-700 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      >
        <section className="h-screen flex flex-col items-center justify-between py-10 md:py-14 pointer-events-none">
          <div className="text-center px-6">
            <p className="text-[10px] tracking-[0.4em] text-blue-400 uppercase mb-2 drop-shadow-lg">
              Energy Drink
            </p>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_6px_40px_rgba(0,0,0,0.9)]">
              ION
            </h1>
            <p className="text-sm sm:text-lg tracking-[0.3em] text-white/85 mt-1 drop-shadow-lg">
              CLASSIC ALPHA
            </p>
          </div>
          <div className="text-center pb-4">
            <p className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
              Scroll to explore
            </p>
            <div className="mx-auto mt-2 w-px h-6 bg-gradient-to-b from-white/25 to-transparent" />
          </div>
        </section>

        {/* Continuous rotation track — longer = slower, silkier turn */}
        <div id="scroll-track" style={{ height: "500vh" }} className="relative">
          <div className="sticky top-0 h-screen pointer-events-none">
            <PauseText zone={scrollZone} />
          </div>
        </div>

        <section className="h-[80vh] flex flex-col items-center justify-center pointer-events-none gap-2">
          <CurvedTitle id="path-pure" text="PURE ENERGY" color="white" />
          <p data-fade className="text-[10px] tracking-[0.3em] text-white/45 uppercase mt-2">
            Built to keep you moving
          </p>
        </section>

        <section className="h-[80vh] flex flex-col items-center justify-center pointer-events-none gap-2">
          <CurvedTitle id="path-zero" text="ZERO LIMITS" color="#60a5fa" />
          <div data-fade className="text-center space-y-1 mt-2">
            <p className="text-[10px] tracking-[0.3em] text-white/45 uppercase">Focus Harder</p>
            <p className="text-[10px] tracking-[0.3em] text-white/45 uppercase">Move Further</p>
            <p className="text-[10px] tracking-[0.3em] text-white/45 uppercase">Push Forward</p>
          </div>
        </section>

        <section className="h-[80vh] flex flex-col items-center justify-center pointer-events-none gap-2">
          <CurvedTitle id="path-classic" text="THE CLASSIC" color="white" />
          <p data-fade className="text-[10px] tracking-[0.3em] text-white/45 uppercase mt-2">
            The energy that never quits
          </p>
        </section>

        <section className="h-screen flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18)_0%,transparent_55%)]" />
          <div className="relative text-center px-6" data-fade>
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-none text-white drop-shadow-2xl">
              OWN
            </h2>
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-none text-white drop-shadow-2xl">
              YOUR
            </h2>
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-none text-blue-400 drop-shadow-2xl">
              ENERGY.
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center pointer-events-auto">
              <a
                href="#"
                className="px-8 py-3 bg-white text-black text-xs font-semibold tracking-[0.2em] uppercase hover:bg-blue-400 hover:text-white transition-colors"
              >
                Explore ION
              </a>
              <a
                href="#"
                className="px-8 py-3 border border-white/40 text-white text-xs tracking-[0.2em] uppercase hover:border-white transition-colors"
              >
                Find Your Energy
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
