"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { gsap } from "gsap";
import { useImageSequence } from "@/hooks/useImageSequence";

export interface ProductCanvasHandle {
  setProgress: (p: number) => void;
}

interface Props {
  frameCount?: number;
  onReady?: () => void;
  onProgress?: (p: number) => void;
  className?: string;
  /**
   * How quickly the drawn frame catches up to the scroll target
   * (higher = snappier, lower = heavier lag). Default: 8.
   */
  lerpSpeed?: number;
}

const ProductCanvas = forwardRef<ProductCanvasHandle, Props>(
  function ProductCanvas(
    {
      frameCount = 477,
      onReady,
      onProgress,
      className = "",
      lerpSpeed = 8,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Scroll writes the target frame; the ticker eases `current` toward it.
    const targetFrameRef = useRef(0);
    const currentFrameRef = useRef(0);
    const lastDrawnRef = useRef(-1);
    const lastIntFrameRef = useRef(-1);
    const coverRef = useRef<{ dw: number; dh: number; x: number; y: number } | null>(null);

    const { getImage, ready, progress } = useImageSequence(
      frameCount,
      "/frames_480/frame_{index}.webp",
      onProgress,
      onReady
    );

    const draw = useCallback(
      (frameFloat: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const clamped = Math.max(0, Math.min(frameCount - 1, frameFloat));
        if (clamped === lastDrawnRef.current) return;
        lastDrawnRef.current = clamped;

        const idxLo = Math.floor(clamped);
        const idxHi = Math.min(frameCount - 1, idxLo + 1);
        const frac = clamped - idxLo;

        // Only blend in a narrow band around the switch point (soft snap).
        // Outside this band, show a single sharp frame — no ghosting.
        const BLEND_HALF_WIDTH = 0.18;
        const blendAlpha =
          frac < BLEND_HALF_WIDTH
            ? 0
            : frac > 1 - BLEND_HALF_WIDTH
            ? 1
            : (frac - BLEND_HALF_WIDTH) / (1 - 2 * BLEND_HALF_WIDTH);

        const imgLo = getImage(idxLo);
        const imgHi = getImage(idxHi);
        if (!imgLo || !imgLo.complete || imgLo.naturalWidth === 0) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w === 0 || h === 0) return;

        const tw = Math.floor(w * dpr);
        const th = Math.floor(h * dpr);
        if (canvas.width !== tw || canvas.height !== th) {
          canvas.width = tw;
          canvas.height = th;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        ctx.clearRect(0, 0, w, h);

        // Cache cover dimensions — only recalc on resize
        if (!coverRef.current || canvas.width !== tw || canvas.height !== th) {
          const imgAspect = imgLo.naturalWidth / imgLo.naturalHeight;
          const canvasAspect = w / h;
          if (imgAspect > canvasAspect) {
            coverRef.current = { dh: h, dw: h * imgAspect, x: (w - h * imgAspect) / 2, y: 0 };
          } else {
            coverRef.current = { dw: w, dh: w / imgAspect, x: 0, y: (h - w / imgAspect) / 2 };
          }
        }
        const { dw, dh, x, y } = coverRef.current;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        if (blendAlpha <= 0) {
          ctx.globalAlpha = 1;
          ctx.drawImage(imgLo, x, y, dw, dh);
        } else if (blendAlpha >= 1) {
          ctx.globalAlpha = 1;
          ctx.drawImage(imgHi ?? imgLo, x, y, dw, dh);
        } else {
          ctx.globalAlpha = 1;
          ctx.drawImage(imgLo, x, y, dw, dh);
          if (imgHi && imgHi.complete && imgHi.naturalWidth > 0) {
            ctx.globalAlpha = blendAlpha;
            ctx.drawImage(imgHi, x, y, dw, dh);
          }
        }
        ctx.globalAlpha = 1;

        // Decode prefetch — only when integer frame changes, not every sub-float tick
        if (idxLo !== lastIntFrameRef.current) {
          lastIntFrameRef.current = idxLo;
          for (let i = Math.max(0, idxLo - 3); i <= Math.min(frameCount - 1, idxLo + 3); i++) {
            getImage(i)?.decode?.().catch(() => {});
          }
        }
      },
      [getImage, frameCount]
    );

    // Drive canvas draw from GSAP ticker — same tick as Lenis/ScrollTrigger.
    // The drawn frame eases toward the scroll target (lerp), so the visible
    // position lags slightly behind the raw scroll position for a fluid,
    // weight-based feel instead of mechanical snapping.
    useEffect(() => {
      if (!ready) return;
      const cb = (_time: number, deltaTime: number) => {
        const target = targetFrameRef.current;
        let current = currentFrameRef.current;
        // Frame-rate independent damping; clamp huge deltas (tab switches etc.)
        const dt = Math.min(deltaTime || 0.016, 0.05);
        const t = 1 - Math.exp(-lerpSpeed * dt);
        current = current + (target - current) * t;
        // Snap when close so we land exactly on the target frame
        if (Math.abs(target - current) < 0.001) current = target;
        currentFrameRef.current = current;
        draw(current);
      };
      gsap.ticker.add(cb);
      return () => gsap.ticker.remove(cb);
    }, [draw, ready, lerpSpeed]);

    useEffect(() => {
      const onResize = () => {
        lastDrawnRef.current = -1;
        coverRef.current = null;
        draw(currentFrameRef.current);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [draw]);

    // Draw first frame when ready
    useEffect(() => {
      if (ready) {
        targetFrameRef.current = 0;
        currentFrameRef.current = 0;
        lastDrawnRef.current = -1;
        draw(0);
      }
    }, [ready, draw]);

    useImperativeHandle(
      ref,
      () => ({
        setProgress: (p: number) => {
          targetFrameRef.current =
            Math.max(0, Math.min(1, p)) * (frameCount - 1);
        },
      }),
      [frameCount]
    );

    return (
      <div className={`relative w-full h-full ${className}`}>
        <canvas ref={canvasRef} className="w-full h-full block" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white/40 text-xs tracking-widest">
              {Math.round(progress * 100)}%
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default ProductCanvas;
