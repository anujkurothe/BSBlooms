import { useState } from 'react';
import { ArrowDown, ChevronLeft, ChevronRight, Flower2 } from 'lucide-react';
import { AVAILABILITY_LABELS, type Flower } from '../types/flower.ts';

interface FlowerSlideProps {
  flower: Flower;
  index: number;
  total: number;
  onAdvanceNext: () => void;
}

function getSwatchColor(colorName: string): string {
  const lower = colorName.toLowerCase();
  if (lower.includes('white') && lower.includes('pink')) return '#F4A9C2';
  if (lower.includes('light pink')) return '#F59BB3';
  if (lower.includes('dark pink')) return '#D82E7A';
  if (lower.includes('pink')) return '#EC5D96';
  if (lower.includes('white')) return '#F4F4F0';
  if (lower.includes('yellow')) return '#F2C918';
  if (lower.includes('orange')) return '#EA5C20';
  if (lower.includes('red')) return '#C81E2B';
  return '#637F04';
}

export function FlowerSlide({ flower, index, total, onAdvanceNext }: FlowerSlideProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  const photos = flower.photos.length > 0 ? flower.photos : [];
  const activePhoto = photos[photoIdx] ?? photos[0];
  const hasMultiplePhotos = photos.length > 1;
  const availabilityLabel = AVAILABILITY_LABELS[flower.availability];

  const slideNum = String(index + 1).padStart(2, '0');
  const totalNum = String(total).padStart(2, '0');

  const specs: Array<{ label: string; value: string }> = [];
  if (flower.cropEn) specs.push({ label: 'Crop', value: flower.cropEn });
  if (flower.typeEn) specs.push({ label: 'Type', value: flower.typeEn });
  if (flower.breederCode) specs.push({ label: "Breeder's Code", value: flower.breederCode });
  if (flower.stemLength) specs.push({ label: 'Stem Length', value: flower.stemLength });

  return (
    <section
      id={`variety-${flower.id}`}
      data-testid={`flower-slide-${flower.id}`}
      className="relative min-h-[100dvh] lg:h-[100dvh] w-full snap-start snap-always bg-white text-zinc-900 flex flex-col justify-center px-5 sm:px-10 py-6 sm:py-10 overflow-x-hidden"
    >
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
        {/* Large Clean Flower Photograph */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[300px] sm:max-w-[420px] lg:max-w-[480px] max-h-[42dvh] lg:max-h-none aspect-square flex items-center justify-center rounded-2xl bg-white">
            {activePhoto && !imgError ? (
              <img
                src={activePhoto}
                alt={`${flower.nameEn} ${flower.color ? `${flower.color} ` : ''}Gerbera`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#F6F8F0] text-zinc-500 rounded-2xl">
                <Flower2 className="w-10 h-10 text-[#637F04]/70" aria-hidden="true" />
                <span className="text-sm font-medium">{flower.nameEn}</span>
              </div>
            )}

            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length)}
                  aria-label={`Previous photo of ${flower.nameEn}`}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/90 border border-zinc-200 text-zinc-800 hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((prev) => (prev + 1) % photos.length)}
                  aria-label={`Next photo of ${flower.nameEn}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/90 border border-zinc-200 text-zinc-800 hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {hasMultiplePhotos && (
            <div className="flex items-center gap-2 mt-2">
              {photos.map((_, idx) => (
                <button
                  key={`${flower.id}-dot-${idx}`}
                  type="button"
                  onClick={() => setPhotoIdx(idx)}
                  aria-label={`${flower.nameEn} photo ${idx + 1}`}
                  aria-pressed={photoIdx === idx}
                  className={`h-1.5 rounded-full transition-all ${
                    photoIdx === idx ? 'w-5 bg-[#637F04]' : 'w-1.5 bg-zinc-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Clean Essential Specifications Only (No Inquiry Button, No Rate/Price) */}
        <div className="lg:col-span-6 flex flex-col items-start text-left max-w-md mx-auto lg:mx-0 w-full">
          <div className="flex items-center justify-between w-full gap-3 mb-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500 tabular-nums">
              <span>
                {slideNum} / {totalNum}
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  flower.availability === 'in_stock'
                    ? 'text-[#4F6603] font-semibold'
                    : flower.availability === 'limited'
                      ? 'text-amber-700 font-semibold'
                      : 'text-zinc-400 font-medium'
                }
              >
                {availabilityLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onAdvanceNext}
              aria-label={`Next after ${flower.nameEn}`}
              className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-colors"
            >
              <ArrowDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 leading-[1.06]">
            {flower.nameEn}
          </h2>

          {flower.color && (
            <div className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-zinc-600">
              <span
                className="w-3 h-3 rounded-full border border-zinc-300/80 shrink-0"
                style={{ backgroundColor: getSwatchColor(flower.color) }}
                aria-hidden="true"
              />
              <span>{flower.color}</span>
            </div>
          )}

          {specs.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 w-full mt-5 pt-5 border-t border-zinc-200/80">
              {specs.map((item) => (
                <div key={item.label}>
                  <dt className="text-[11px] uppercase tracking-wider text-zinc-400">
                    {item.label}
                  </dt>
                  <dd className="text-sm sm:text-base font-medium text-zinc-900 mt-0.5">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {flower.extraSpecEn && (
            <p className="w-full mt-4 pt-4 border-t border-zinc-100 text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {flower.extraSpecEn}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
