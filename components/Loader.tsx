"use client";

import { useEffect, useState } from "react";

interface Props {
  progress: number;
  isComplete: boolean;
  onFinish?: () => void;
}

export default function Loader({ progress, isComplete, onFinish }: Props) {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  // Failsafe after 12 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isComplete) {
        console.warn("Loading timeout – continuing");
        setFade(true);
        setTimeout(() => {
          setVisible(false);
          onFinish?.();
        }, 600);
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [isComplete, onFinish]);

  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => {
        setFade(true);
        setTimeout(() => {
          setVisible(false);
          onFinish?.();
        }, 600);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isComplete, onFinish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050508] transition-opacity duration-600 ${
        fade ? "opacity-0" : "opacity-100"
      }`}
    >
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
        ION
      </h1>
      <p className="mt-3 text-sm tracking-[0.35em] text-white/50 uppercase">
        Classic Alpha
      </p>
      <p className="mt-2 text-[10px] tracking-[0.3em] text-blue-400/70 uppercase">
        Energy in Motion
      </p>

      <div className="mt-14 w-48">
        <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-white/30 tracking-widest">
          {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}
