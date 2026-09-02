"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Preloads the entire frame sequence before marking ready.
 * All images live in memory so scroll never triggers network loads.
 */
export function useImageSequence(
  frameCount: number,
  pathPattern: string = "/frames_480/frame_{index}.webp",
  onProgress?: (p: number) => void,
  onComplete?: () => void
) {
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const images: (HTMLImageElement | null)[] = new Array(frameCount).fill(null);
    let loaded = 0;
    let cancelled = false;

    const bump = () => {
      if (cancelled) return;
      loaded += 1;
      const p = loaded / frameCount;
      setProgress(p);
      onProgressRef.current?.(p);
      if (loaded >= frameCount) {
        imagesRef.current = images;
        setReady(true);
        onCompleteRef.current?.();
      }
    };

    // Load ALL frames up front (batched to avoid browser connection limits)
    const loadOne = (index: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        const num = String(index + 1).padStart(3, "0");
        img.src = pathPattern.replace("{index}", num);
        img.onload = () => {
          images[index] = img;
          bump();
          resolve();
        };
        img.onerror = () => {
          console.warn("Failed frame:", img.src);
          bump();
          resolve();
        };
      });

    (async () => {
      // Priority: first frame for instant first paint
      await loadOne(0);
      if (cancelled) return;

      const BATCH = 12;
      for (let i = 1; i < frameCount; i += BATCH) {
        if (cancelled) return;
        const batch: Promise<void>[] = [];
        for (let j = i; j < Math.min(i + BATCH, frameCount); j++) {
          batch.push(loadOne(j));
        }
        await Promise.all(batch);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frameCount, pathPattern]);

  const getImage = useCallback(
    (index: number) => {
      const i = Math.max(0, Math.min(frameCount - 1, Math.floor(index)));
      return imagesRef.current[i] || null;
    },
    [frameCount]
  );

  return { getImage, ready, progress, totalFrames: frameCount };
}
