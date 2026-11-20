export type AvailabilityStatus = 'in_stock' | 'limited' | 'out_of_stock';

export interface Flower {
  id: string;
  orderIndex: number;
  nameEn: string;
  color: string;
  cropEn: string;
  typeEn: string;
  breederCode: string;
  stemLength: string;
  extraSpecEn: string;
  availability: AvailabilityStatus;
  photos: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlowerDraft {
  id?: string;
  orderIndex: number;
  nameEn: string;
  color: string;
  cropEn: string;
  typeEn: string;
  breederCode: string;
  stemLength: string;
  extraSpecEn: string;
  availability: AvailabilityStatus;
  photos: string[];
}

export interface StoreSettings {
  shopNameEn: string;
  phone: string;
  whatsapp: string;
  locationEn: string;
  hoursEn: string;
  updatedAt?: string;
}

export interface InquiryDetails {
  customerName: string;
  notes: string;
  quantities: Record<string, string>;
}

export const AVAILABILITY_STATUSES: AvailabilityStatus[] = [
  'in_stock',
  'limited',
  'out_of_stock',
];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: 'Available',
  limited: 'Limited Stock',
  out_of_stock: 'Out of Stock',
};
