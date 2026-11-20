import { ArrowDown } from 'lucide-react';
import { BRAND_NAME, BS_LOGO_URL } from '../catalog/defaultFlowers.ts';

interface HeroScreenProps {
  onSwipeDown: () => void;
}

export function HeroScreen({ onSwipeDown }: HeroScreenProps) {
  return (
    <section
      id="hero-screen"
      data-screen="hero"
      className="relative h-[100dvh] min-h-[100dvh] w-full snap-start snap-always bg-[#637F04] text-white flex flex-col items-center justify-between px-6 py-10 sm:py-12 overflow-hidden"
    >
      {/* Top spacer to keep center visual breathing room generous */}
      <div className="h-6 sm:h-10 shrink-0" aria-hidden="true" />

      {/* Center Stage: Large Gently Floating BS Logo + BSBlooms Text Only */}
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
