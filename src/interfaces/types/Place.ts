export default interface Place {
  placeId: string;
  address: string;
  storeName: string;
  category: string | null;
  phone: string | null;
  googleUrl: string;
  numberOfReviews: string | null;
  bizWebsite: string | null;
  ratingText: string;
  stars: string;
  hasWhatsApp?: boolean;
  whatsAppNumber?: string;
  isChatbot?: boolean;
  isVerified?: boolean;
  chatbotResponseTime?: number;
  country?: string;
  city?: string;
  ratingValue?: number;
}