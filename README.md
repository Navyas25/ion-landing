# ION Classic Alpha — Landing Page

A scroll-driven product showcase for the ION energy drink, featuring a 477-frame image sequence of a rotating can that responds to user scroll.

## Tech Stack

- **Next.js 16** — React framework with App Router
- **React 19** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Utility-first styling
- **GSAP + ScrollTrigger** — Scroll-driven animations and timeline control
- **Lenis** — Smooth scroll with configurable duration/easing

## Features

- **Scroll-driven can rotation** — 477 WebP frames preloaded into memory, rendered on a `<canvas>` via 2D context with soft-snap crossfade between frames
- **Curved SVG text** — Animated text paths that straighten as you scroll
- **Zone-based text reveals** — 8 keyword stops that highlight as the can rotates past each position
- **Fade-in sections** — Scroll-triggered opacity and translate animations
- **Loading screen** — Progress bar that tracks frame preload completion

## Getting Started
<<<<<<< HEAD

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
=======
http://ion-landing.vercel.app/
>>>>>>> 2924ee5685407ae010ad55e603f505998062ebe8

## Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with fonts and metadata
│   ├── page.tsx            # Main landing page with all sections
│   └── globals.css         # Tailwind imports and global styles
├── components/
│   ├── ProductCanvas.tsx   # Canvas renderer for the 477-frame sequence
│   └── Loader.tsx          # Preloader with progress bar
├── hooks/
│   ├── useImageSequence.ts # Preloads all frames into memory
│   └── useSmoothScroll.ts  # Lenis smooth scroll configuration
├── lib/
│   └── animations.ts       # GSAP ScrollTrigger animation utilities
└── public/
    └── frames_480/         # 477 WebP frames (frame_001.webp – frame_477.webp)
```

## How It Works

1. **Preload** — `useImageSequence` loads all 477 frames into memory before the page is shown, reporting progress to the loader
2. **Scroll** — Lenis smooths wheel/touch input; GSAP ScrollTrigger maps scroll position to a 0–1 progress value
3. **Render** — `ProductCanvas` receives progress via `setProgress()`, converts it to a frame index, and draws to canvas using the GSAP ticker for frame-synced rendering
4. **Crossfade** — A soft-snap blend between adjacent frames eliminates hard pops at frame boundaries while keeping frames sharp for 90%+ of the transition

<<<<<<< HEAD
## License

Private
=======
>>>>>>> 2924ee5685407ae010ad55e603f505998062ebe8
