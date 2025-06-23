export default interface OnSubmitReturnForm {
  queryType: string,
  queryValue: string,
  queryValueLocation?: string,
  
  // New fields for location-specific searches
  country?: string,
  city?: string,
  
  // New fields for filters
  minRating?: string,
  maxRating?: string,
  maxReviews?: string,
  excludeVerified?: boolean,
  checkWhatsApp?: boolean,
  detectChatbot?: boolean,
  strictWhatsAppMode?: boolean // Controls WhatsApp detection accuracy vs. coverage
}