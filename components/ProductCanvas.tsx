"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useImageSequence } from "@/hooks/useImageSequence";

export interface ProductCanvasHandle {
  /** Scroll only sets the *target* — rAF loop renders the matching frame */
  setProgress: (p: number) => void;
}

interface Props {
  frameCount?: number;
  onReady?: () => void;
  onProgress?: (p: number) => void;
  className?: string;
}

const ProductCanvas = forwardRef<ProductCanvasHandle, Props>(
  function ProductCanvas(
    {
      frameCount = 477,
      onReady,
      onProgress,
      className = "",
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const targetFrameRef = useRef(0);
    const lastDrawnRef = useRef(-1);

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

        const idx = Math.max(
          0,
          Math.min(frameCount - 1, Math.round(frameFloat))
        );
        if (idx === lastDrawnRef.current) return;
        lastDrawnRef.current = idx;

        const img = getImage(idx);
        if (!img || !img.complete || img.naturalWidth === 0) return;

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

        // object-fit: cover
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = w / h;
        let dw: number, dh: number, x: number, y: number;
        if (imgAspect > canvasAspect) {
          dh = h;
          dw = h * imgAspect;
          x = (w - dw) / 2;
          y = 0;
        } else {
          dw = w;
          dh = w / imgAspect;
          x = 0;
          y = (h - dh) / 2;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, x, y, dw, dh);
      },
      [getImage, frameCount]
    );

    /**
     * Core loop:
     *  - Scroll events ONLY write targetFrameRef
     *  - This rAF loop reads the exact target and renders the matching frame
     *  - No interpolation — the can is directly connected to scroll position
     *  - lastDrawnRef prevents redundant draws when the frame hasn't changed
     */
    useEffect(() => {
      let raf = 0;
      let running = true;

      const tick = () => {
        if (!running) return;

        // Draw the exact frame the scroll dictates — no chasing
        draw(targetFrameRef.current);

        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
      return () => {
        running = false;
        cancelAnimationFrame(raf);
      };
    }, [draw, ready]);

    useEffect(() => {
      const onResize = () => {
        lastDrawnRef.current = -1;
        draw(targetFrameRef.current);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [draw]);

    // When frames become ready, paint the first frame
    useEffect(() => {
      if (ready) {
        lastDrawnRef.current = -1;
        draw(0);
      }
    }, [ready, draw]);

    useImperativeHandle(ref, () => ({
      setProgress: (p: number) => {
        // Lightweight: only update target. rAF loop renders it directly.
        targetFrameRef.current =
          Math.max(0, Math.min(1, p)) * (frameCount - 1);
      },
    }));

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
