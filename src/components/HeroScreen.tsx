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
      className="relative h-[100dvh] min-h-[100dvh] w-full snap-start snap-always bg-[#637F04] text-white flex flex-col items-center justify-between px-6 sm:px-10 pt-7 pb-9 sm:pt-10 sm:pb-12 overflow-hidden"
    >
      {/* Top-left handwritten greeting matching reference style */}
      <div className="w-full self-start text-left shrink-0">
        <p className="font-script font-light text-base sm:text-xl md:text-[22px] leading-relaxed text-white/95 select-none">
          hello,
          <br />
          find peace in 8 different shades,
        </p>
      </div>

      {/* Center Stage: Large Gently Floating BS Logo + BSBlooms Text */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        <div className="animate-float-emblem">
          <img
            src={BS_LOGO_URL}
            alt="BSBlooms emblem"
            referrerPolicy="no-referrer"
            className="w-52 h-52 sm:w-68 sm:h-68 md:w-72 md:h-72 object-contain select-none"
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
