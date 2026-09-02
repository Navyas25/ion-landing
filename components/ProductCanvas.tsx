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
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const currentFrameRef = useRef(0);
    const pendingFrameRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

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

        if (!ctxRef.current) {
          ctxRef.current = canvas.getContext("2d", { alpha: true });
        }
        const ctx = ctxRef.current;
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w === 0 || h === 0) return;

        const tw = Math.round(w * dpr);
        const th = Math.round(h * dpr);
        if (canvas.width !== tw || canvas.height !== th) {
          canvas.width = tw;
          canvas.height = th;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Split into integer frame + fractional part for crossfade
        const clamped = Math.max(0, Math.min(frameCount - 1, frameFloat));
        const idx = Math.floor(clamped);
        const frac = clamped - idx;

        const img = getImage(idx);
        if (!img || !img.complete || img.naturalWidth === 0) return;

        // object-fit: cover dimensions
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = w / h;
        let dw: number, dh: number, x: number, y: number;
        if (imgAspect > canvasAspect) {
          dh = h; dw = h * imgAspect; x = (w - dw) / 2; y = 0;
        } else {
          dw = w; dh = w / imgAspect; x = 0; y = (h - dh) / 2;
        }

        // Draw current frame at full opacity
        ctx.globalAlpha = 1;
        ctx.drawImage(img, x, y, dw, dh);

        // Crossfade: blend next frame on top when between frames
        if (frac > 0.01 && idx < frameCount - 1) {
          const nextImg = getImage(idx + 1);
          if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
            ctx.globalAlpha = frac;
            ctx.drawImage(nextImg, x, y, dw, dh);
            ctx.globalAlpha = 1;
          }
        }
      },
      [getImage, frameCount]
    );

    useEffect(() => {
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    useEffect(() => {
      const onResize = () => {
        requestAnimationFrame(() => {
          draw(currentFrameRef.current);
        });
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [draw]);

    // Draw first frame when ready
    useEffect(() => {
      if (ready) {
        currentFrameRef.current = 0;
        draw(0);
      }
    }, [ready, draw]);

    useImperativeHandle(
      ref,
      () => ({
        setProgress: (p: number) => {
          pendingFrameRef.current =
            Math.max(0, Math.min(1, p)) * (frameCount - 1);

          if (rafRef.current !== null) return;

          rafRef.current = requestAnimationFrame(() => {
            if (pendingFrameRef.current !== null) {
              currentFrameRef.current = pendingFrameRef.current;
              draw(pendingFrameRef.current);
              pendingFrameRef.current = null;
            }
            rafRef.current = null;
          });
        },
      }),
      [draw, frameCount]
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
