import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminPanel } from './components/AdminPanel.tsx';
import { ContactScreen } from './components/ContactScreen.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { FlowerSlide } from './components/FlowerSlide.tsx';
import { HeroScreen } from './components/HeroScreen.tsx';
import { InquiryDrawer } from './components/InquiryDrawer.tsx';
import { useFlowerCatalog } from './hooks/useFlowerCatalog.ts';
import type { InquiryDetails } from './types/flower.ts';

function BSBloomsApp() {
  const [activeView, setActiveView] = useState<'swipe' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'swipe',
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryDetails, setInquiryDetails] = useState<InquiryDetails>({
    customerName: '',
    notes: '',
    quantities: {},
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const catalog = useFlowerCatalog();

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setActiveView('admin');
      } else {
        setActiveView('swipe');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const totalSlides = 1 + catalog.flowers.length + 1;
  const isOnGreenScreen =
    activeView === 'swipe' && (activeSlideIndex === 0 || activeSlideIndex === totalSlides - 1);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || activeView !== 'swipe') return;

    const handleScroll = () => {
      const height = container.clientHeight || window.innerHeight;
      if (height > 0) {
        const idx = Math.round(container.scrollTop / height);
        setActiveSlideIndex(idx);
      }
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeView, totalSlides]);

  useEffect(() => {
    if (activeView !== 'swipe' || inquiryOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        scrollToSlide(Math.min(totalSlides - 1, activeSlideIndex + 1));
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        scrollToSlide(Math.max(0, activeSlideIndex - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, inquiryOpen, activeSlideIndex, totalSlides]);

  const scrollToSlide = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const height = container.clientHeight || window.innerHeight;
    container.scrollTo({
      top: index * height,
      behavior: 'smooth',
    });
  };

  const toggleSelectFlower = (flowerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(flowerId) ? prev.filter((id) => id !== flowerId) : [...prev, flowerId],
    );
  };

  const selectedFlowers = useMemo(
    () => catalog.flowers.filter((flower) => selectedIds.includes(flower.id)),
    [catalog.flowers, selectedIds],
  );

  const openAdmin = () => {
    window.location.hash = 'admin';
    setActiveView('admin');
  };

  const openSwipe = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setActiveView('swipe');
  };

  return (
    <div className="relative min-h-[100dvh] w-full">
      {activeView === 'admin' ? (
        <AdminPanel catalog={catalog} onBackToStore={openSwipe} />
      ) : (
        <div
          ref={scrollContainerRef}
          data-testid="swipe-viewport"
          className="h-[100dvh] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        >
          {/* Screen 1: Floating BS Logo + BSBlooms + Swipe Down */}
          <HeroScreen onSwipeDown={() => scrollToSlide(1)} />

          {/* Screen 2..N: Flower Varieties one after another */}
          {catalog.flowers.map((flower, idx) => (
            <FlowerSlide
              key={flower.id}
              flower={flower}
              index={idx}
              total={catalog.flowers.length}
              onAdvanceNext={() => scrollToSlide(idx + 2)}
            />
          ))}

          {/* Final Screen: Contact, WhatsApp, Call & Multi-Variety Inquiry */}
          <ContactScreen
            storeSettings={catalog.storeSettings}
            selectedFlowers={selectedFlowers}
            inquiryDetails={inquiryDetails}
            onOpenInquiry={() => setInquiryOpen(true)}
            onBackToTop={() => scrollToSlide(0)}
            onOpenAdmin={openAdmin}
          />
        </div>
      )}

      {/* Subtle Vertical Slide Indicator on Desktop/Tablet */}
      {activeView === 'swipe' && (
        <nav
          aria-label="Slide navigation"
          className="hidden sm:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-2"
        >
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={`slide-nav-${idx}`}
              type="button"
              onClick={() => scrollToSlide(idx)}
              aria-label={
                idx === 0
                  ? 'BSBlooms Home'
                  : idx === totalSlides - 1
                    ? 'Contact'
                    : `Variety ${idx}`
              }
              aria-current={activeSlideIndex === idx ? 'step' : undefined}
              className={`transition-all rounded-full ${
                activeSlideIndex === idx
                  ? `w-2 h-5 ${isOnGreenScreen ? 'bg-white' : 'bg-[#637F04]'}`
                  : `w-2 h-2 ${
                      isOnGreenScreen
                        ? 'bg-white/40 hover:bg-white/75'
                        : 'bg-zinc-300 hover:bg-zinc-500'
                    }`
              }`}
            />
          ))}
        </nav>
      )}

      {/* Multi-Variety Inquiry Sheet (opened from Final Contact Screen) */}
      <InquiryDrawer
        open={inquiryOpen}
        flowers={catalog.flowers}
        selectedIds={selectedIds}
        storeSettings={catalog.storeSettings}
        details={inquiryDetails}
        onToggleSelect={toggleSelectFlower}
        onUpdateDetails={setInquiryDetails}
        onClose={() => setInquiryOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BSBloomsApp />
    </ErrorBoundary>
  );
}
