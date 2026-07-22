/** Approximate centre-points for neighbourhoods in Lagos and Abuja.
 *  Used for map marker placement across search and property pages. */
export const NEIGHBOURHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  // Lagos
  "Victoria Island": { lat: 6.4281, lng: 3.4219 },
  "Ikoyi": { lat: 6.4515, lng: 3.4369 },
  "Lekki Phase 1": { lat: 6.4391, lng: 3.4815 },
  "Lekki": { lat: 6.4391, lng: 3.4815 },
  "Surulere": { lat: 6.5045, lng: 3.3491 },
  "Yaba": { lat: 6.5102, lng: 3.3783 },
  "Banana Island": { lat: 6.4646, lng: 3.4064 },
  // Abuja
  "GRA": { lat: 9.0598, lng: 7.4898 },
  "Maitama": { lat: 9.0907, lng: 7.4923 },
  "Central District": { lat: 9.0627, lng: 7.4891 },
  "Asokoro": { lat: 9.0471, lng: 7.5203 },
  "Wuse 2": { lat: 9.0701, lng: 7.4752 },
  "Jabi": { lat: 9.0575, lng: 7.4312 },
  "Katampe": { lat: 9.0984, lng: 7.4358 },
  "Durumi": { lat: 9.0423, lng: 7.4651 },
  "Guzape": { lat: 9.0224, lng: 7.4892 },
};
