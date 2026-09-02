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
  /** Draw frame on next animation frame — no continuous loop */
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
  const lastDrawnRef = useRef(-1);
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



    useEffect(() => {
      const onResize = () => {
        lastDrawnRef.current = -1;
        draw(currentFrameRef.current);
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
        const frame = Math.max(0, Math.min(1, p)) * (frameCount - 1);
        pendingFrameRef.current = frame;

        if (rafRef.current !== null) return;

        rafRef.current = requestAnimationFrame(() => {
          if (pendingFrameRef.current !== null) {
            draw(pendingFrameRef.current);
            currentFrameRef.current = pendingFrameRef.current;
          }
          pendingFrameRef.current = null;
          rafRef.current = null;
        });
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
