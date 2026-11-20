import { useEffect } from 'react';
import { Check, MessageCircle, Phone, X } from 'lucide-react';
import type { Flower, InquiryDetails, StoreSettings } from '../types/flower.ts';
import { buildTelUrl, buildWhatsAppMessage, buildWhatsAppUrl } from '../utils/catalog.ts';

interface InquiryDrawerProps {
  open: boolean;
  flowers: Flower[];
  selectedIds: string[];
  storeSettings: StoreSettings;
  details: InquiryDetails;
  onToggleSelect: (flowerId: string) => void;
  onUpdateDetails: (next: InquiryDetails) => void;
  onClose: () => void;
}

export function InquiryDrawer({
  open,
  flowers,
  selectedIds,
  storeSettings,
  details,
  onToggleSelect,
  onUpdateDetails,
  onClose,
}: InquiryDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const selectedFlowers = flowers.filter((flower) => selectedIds.includes(flower.id));
  const shopName = storeSettings.shopNameEn || 'BSBlooms';
  const whatsappMessage = buildWhatsAppMessage(selectedFlowers, details, shopName);
  const whatsappUrl = buildWhatsAppUrl(storeSettings.whatsapp, whatsappMessage);
  const telUrl = buildTelUrl(storeSettings.phone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-zinc-950/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-sheet-title"
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] bg-white rounded-t-3xl sm:rounded-2xl border border-zinc-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200/80 flex items-start justify-between gap-4">
          <div>
            <h2 id="inquiry-sheet-title" className="font-display text-2xl font-semibold text-zinc-900">
              Send Flower Inquiry
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Select one or more varieties to message {shopName} on WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inquiry sheet"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-zinc-500">Choose Varieties</span>
              <span className="text-xs font-medium text-[#4F6603] tabular-nums">
                {selectedFlowers.length} selected
              </span>
            </div>

            <div className="space-y-2">
              {flowers.map((flower) => {
                const checked = selectedIds.includes(flower.id);
                return (
                  <div
                    key={flower.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      checked ? 'border-[#637F04] bg-[#F7FAEE]' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleSelect(flower.id)}
                        aria-pressed={checked}
                        className="flex items-center gap-3 flex-1 text-left min-h-[40px]"
                      >
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-[#637F04] border-[#637F04] text-white'
                              : 'border-zinc-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        </span>
                        {flower.photos[0] && (
                          <img
                            src={flower.photos[0]}
                            alt={flower.nameEn}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-md object-contain bg-white border border-zinc-100 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="block text-sm font-medium text-zinc-900 truncate">
                            {flower.nameEn}
                          </span>
                          {flower.color && (
                            <span className="block text-xs text-zinc-500">{flower.color}</span>
                          )}
                        </div>
                      </button>

                      {checked && (
                        <input
                          type="text"
                          aria-label={`${flower.nameEn} quantity`}
                          value={details.quantities[flower.id] ?? ''}
                          onChange={(e) =>
                            onUpdateDetails({
                              ...details,
                              quantities: {
                                ...details.quantities,
                                [flower.id]: e.target.value,
                              },
                            })
                          }
                          placeholder="Qty (e.g. 200 stems)"
                          className="w-full sm:w-40 px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
            <div>
              <label htmlFor="inquiry-name" className="block text-xs font-medium text-zinc-700 mb-1">
                Your Name (optional)
              </label>
              <input
                id="inquiry-name"
                type="text"
                value={details.customerName}
                onChange={(e) => onUpdateDetails({ ...details, customerName: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
              />
            </div>

            <div>
              <label htmlFor="inquiry-notes" className="block text-xs font-medium text-zinc-700 mb-1">
                Note (optional)
              </label>
              <input
                id="inquiry-notes"
                type="text"
                value={details.notes}
                onChange={(e) => onUpdateDetails({ ...details, notes: e.target.value })}
                placeholder="Delivery city or date"
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#637F04]"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-[#FAFAF8] border-t border-zinc-200/80 flex flex-col sm:grid sm:grid-cols-2 gap-2.5 sm:gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="drawer-whatsapp-cta"
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#637F04] hover:bg-[#516803] text-white text-sm font-medium rounded-lg transition-colors text-center"
          >
            <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Send on WhatsApp</span>
          </a>

          <a
            href={telUrl}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-medium border border-zinc-200 rounded-lg transition-colors text-center"
          >
            <Phone className="w-4 h-4 text-[#637F04] shrink-0" aria-hidden="true" />
            <span>Call Now</span>
          </a>
        </div>
      </div>
    </div>
  );
}
