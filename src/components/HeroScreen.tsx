import { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { BRAND_NAME, BS_LOGO_URL } from '../catalog/defaultFlowers.ts';

interface HeroScreenProps {
  onSwipeDown: () => void;
}

const GREETING_TEXT = 'Hello';

export function HeroScreen({ onSwipeDown }: HeroScreenProps) {
  const [visibleChars, setVisibleChars] = useState(0);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setVisibleChars(GREETING_TEXT.length);
      setTypingDone(true);
      return;
    }

    let stepTimer: number | undefined;
    let doneTimer: number | undefined;

    const startTimer = window.setTimeout(() => {
      let count = 0;
      stepTimer = window.setInterval(() => {
        count += 1;
        setVisibleChars(count);
        if (count >= GREETING_TEXT.length) {
          window.clearInterval(stepTimer);
          doneTimer = window.setTimeout(() => {
            setTypingDone(true);
          }, 1400);
        }
      }, 115);
    }, 240);

    return () => {
      window.clearTimeout(startTimer);
      if (stepTimer !== undefined) window.clearInterval(stepTimer);
      if (doneTimer !== undefined) window.clearTimeout(doneTimer);
    };
  }, []);

  const typedGreeting = GREETING_TEXT.slice(0, visibleChars);

  return (
    <section
      id="hero-screen"
      data-screen="hero"
      className="relative h-[100dvh] min-h-[100dvh] w-full snap-start snap-always bg-[#637F04] text-white flex flex-col items-center justify-between px-6 sm:px-10 pt-7 pb-9 sm:pt-10 sm:pb-12 overflow-hidden"
    >
      {/* Top-left sleek light Outfit typing greeting */}
      <div className="w-full max-w-5xl mx-auto text-left shrink-0 h-9 sm:h-10 flex items-center">
        <p
          aria-label={GREETING_TEXT}
          className="font-display font-light text-2xl sm:text-[28px] tracking-[0.02em] text-white/95 inline-flex items-center leading-none select-none"
        >
          <span>{typedGreeting}</span>
          <span
            aria-hidden="true"
            className={`inline-block w-[1.5px] h-[0.9em] bg-white/80 ml-[3px] transition-opacity duration-700 ${
              typingDone ? 'opacity-0' : 'animate-caret-blink'
            }`}
          />
        </p>
      </div>

      {/* Center Stage: Large Gently Floating BS Logo + BSBlooms Text */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        <div className="animate-float-emblem">
          <img
            src={BS_LOGO_URL}
            alt="BSBlooms emblem"
            referrerPolicy="no-referrer"
            className="w-56 h-56 sm:w-72 sm:h-72 object-contain select-none"
          />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white mt-3 sm:mt-4 select-none">
          {BRAND_NAME}
        </h1>
      </div>

      {/* Bottom Swipe Down Indicator */}
      <div className="pb-2 sm:pb-4 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onSwipeDown}
          aria-label="Swipe Down"
          className="group inline-flex flex-col items-center gap-1.5 min-h-[44px] px-6 py-2 text-white/90 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white rounded-lg"
        >
          <span className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase">
            Swipe Down
          </span>
          <ArrowDown className="w-4 h-4 animate-swipe-arrow" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
