import type {
  Flower,
  FlowerDraft,
  InquiryDetails,
  StoreSettings,
} from '../types/flower.ts';

export function sortFlowersByOrder(flowers: Flower[]): Flower[] {
  return [...flowers].sort((a, b) => {
    const orderDiff = (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
    if (orderDiff !== 0) return orderDiff;
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export function computeSwapOrderUpdates(
  orderedFlowers: Flower[],
  index: number,
  direction: 'up' | 'down',
): Array<{ id: string; orderIndex: number }> | null {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= orderedFlowers.length ||
    targetIndex < 0 ||
    targetIndex >= orderedFlowers.length
  ) {
    return null;
  }

  const reordered = [...orderedFlowers];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);

  return reordered.map((item, idx) => ({
    id: item.id,
    orderIndex: idx,
  }));
}

export function buildWhatsAppMessage(
  selectedFlowers: Flower[],
  details: InquiryDetails,
  shopName = 'BSBlooms',
): string {
  const brand = shopName.trim() || 'BSBlooms';
  if (selectedFlowers.length === 0) {
    return `Hello ${brand}, I would like to inquire about your fresh Gerbera varieties.`;
  }

  const lines: string[] = [
    `Hello ${brand}, I would like to inquire about the following varieties:`,
    '',
  ];

  selectedFlowers.forEach((flower, index) => {
    const colorSuffix = flower.color ? ` (${flower.color})` : '';
    const qty = details.quantities[flower.id]?.trim();
    const qtySegment = qty ? ` — Qty: ${qty}` : '';
    lines.push(`${index + 1}. ${flower.nameEn}${colorSuffix}${qtySegment}`);
  });

  if (details.customerName.trim()) {
    lines.push('');
    lines.push(`Name: ${details.customerName.trim()}`);
  }
  if (details.notes.trim()) {
    lines.push(`Notes: ${details.notes.trim()}`);
  }

  return lines.join('\n');
}

export function sanitizeWhatsAppDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function buildWhatsAppUrl(whatsappDigits: string, message: string): string {
  const digits = sanitizeWhatsAppDigits(whatsappDigits);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function buildTelUrl(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

export function slugifyFlowerId(nameEn: string, existingId?: string): string {
  if (existingId && /^[a-zA-Z0-9_-]{1,128}$/.test(existingId)) {
    return existingId;
  }
  const base = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'flower'}-${suffix}`;
}

export function validateFlowerDraft(draft: FlowerDraft): string | null {
  if (!draft.nameEn.trim()) {
    return 'Please enter the variety name.';
  }
  if (!draft.photos.length) {
    return 'Please upload at least 1 photo.';
  }
  if (draft.photos.length > 5) {
    return 'Maximum 5 photos allowed per variety.';
  }
  return null;
}

export function validateStoreSettings(settings: StoreSettings): string | null {
  if (!settings.shopNameEn.trim()) {
    return 'Please enter a brand name.';
  }
  if (!/^\+?[0-9\- ]{6,20}$/.test(settings.phone.trim())) {
    return 'Enter a valid phone number (6–20 digits/characters).';
  }
  if (!/^[0-9]{8,18}$/.test(settings.whatsapp.trim())) {
    return 'Enter 8–18 digits including country code (e.g. 919876543210).';
  }
  return null;
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword) {
    return 'Please enter your current password.';
  }
  if (newPassword.length < 6 || newPassword.length > 128) {
    return 'New password must be between 6 and 128 characters.';
  }
  if (newPassword !== confirmPassword) {
    return 'New password and confirmation do not match.';
  }
  if (newPassword === currentPassword) {
    return 'New password must be different from your current password.';
  }
  return null;
}
