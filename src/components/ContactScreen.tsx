import { ArrowUp, ListChecks, MessageCircle, Phone } from 'lucide-react';
import { BS_LOGO_URL } from '../catalog/defaultFlowers.ts';
import type { Flower, InquiryDetails, StoreSettings } from '../types/flower.ts';
import { buildTelUrl, buildWhatsAppMessage, buildWhatsAppUrl } from '../utils/catalog.ts';

interface ContactScreenProps {
  storeSettings: StoreSettings;
  selectedFlowers: Flower[];
  inquiryDetails: InquiryDetails;
  onOpenInquiry: () => void;
  onBackToTop: () => void;
  onOpenAdmin: () => void;
}

export function ContactScreen({
  storeSettings,
  selectedFlowers,
  inquiryDetails,
  onOpenInquiry,
  onBackToTop,
  onOpenAdmin,
}: ContactScreenProps) {
  const shopName = storeSettings.shopNameEn || 'BSBlooms';
  const whatsappUrl = buildWhatsAppUrl(
    storeSettings.whatsapp,
    buildWhatsAppMessage(selectedFlowers, inquiryDetails, shopName),
  );
  const telUrl = buildTelUrl(storeSettings.phone);

  return (
    <section
      id="contact-screen"
      data-screen="contact"
      className="relative min-h-[100dvh] lg:h-[100dvh] w-full snap-start snap-always bg-[#637F04] text-white flex flex-col items-center justify-between px-5 sm:px-10 pt-8 pb-6 sm:py-10 overflow-x-hidden"
    >
      <div className="flex flex-col items-center">
        <img
          src={BS_LOGO_URL}
          alt="BSBlooms emblem"
          referrerPolicy="no-referrer"
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
        />
      </div>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center my-auto py-4">
        {/* Authentic Greenhouse Harvest & Dispatch Photo */}
        <div className="lg:col-span-6">
          <div className="w-full aspect-[4/3] max-h-[30dvh] lg:max-h-none rounded-2xl overflow-hidden bg-white/10 border border-white/15">
            <img
              src="/assets/showcase/greenhouse-dispatch.jpg"
              alt="Freshly packed wholesale Gerbera bunches inside the BSBlooms greenhouse"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Clean Contact & Multi-Variety Inquiry CTAs */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          <p className="text-xs font-medium tracking-wider uppercase text-white/80 mb-2">
            Greenhouse Direct Dispatch
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance">
            Connect with {shopName}
          </h2>
          <p className="text-sm sm:text-base text-white/85 mt-2.5 max-w-md leading-relaxed">
            Direct wholesale inquiries, daily farm dispatches, and custom Gerbera assortments.
          </p>

          <div className="w-full max-w-sm flex flex-col gap-2.5 mt-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="contact-whatsapp-cta"
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-white text-[#3F5202] hover:bg-white/90 text-sm sm:text-base font-semibold rounded-xl transition-colors"
            >
              <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>WhatsApp Inquiry</span>
            </a>

            <a
              href={telUrl}
              data-testid="contact-call-cta"
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-white/12 hover:bg-white/20 text-white border border-white/30 text-sm sm:text-base font-medium rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Call Now</span>
            </a>

            <button
              type="button"
              onClick={onOpenInquiry}
              data-testid="contact-build-inquiry-cta"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white/95 hover:text-white underline underline-offset-4 transition-colors"
            >
              <ListChecks className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Select Varieties for Inquiry
                {selectedFlowers.length > 0 ? ` (${selectedFlowers.length})` : ''}
              </span>
            </button>
          </div>

          {(storeSettings.locationEn || storeSettings.hoursEn || storeSettings.phone) && (
            <p className="text-xs text-white/80 mt-5">
              {[storeSettings.locationEn, storeSettings.hoursEn, storeSettings.phone]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Subtle Footer Links */}
      <div className="w-full max-w-5xl flex items-center justify-between text-xs text-white/85">
        <button
          type="button"
          onClick={onBackToTop}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-2 hover:text-white transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Top</span>
        </button>

        <button
          type="button"
          onClick={onOpenAdmin}
          className="min-h-[40px] px-2 hover:text-white underline underline-offset-4 transition-colors"
        >
          Merchant Admin
        </button>
      </div>
    </section>
  );
}
