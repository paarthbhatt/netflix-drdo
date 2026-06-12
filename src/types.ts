export interface UserAccount {
  uid: string;
  email: string;
  subscribed: boolean;
  plan: 'Mobile' | 'Standard' | 'Premium' | null;
  billingCycle: 'monthly' | 'yearly' | null;
  nextPaymentDate: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  status: 'active' | 'canceled' | 'paused';
  createdAt: string;
}

export interface ViewerProfile {
  id: string;
  name: string;
  avatar: string; // Tailwind background color or visual identifier
  isKids: boolean;
  watchlist: string[]; // collection of movie IDs
  createdAt: string;
}

export interface Movie {
  id: string;
  title: string;
  overview: string;
  backdropUrl: string;
  thumbnailUrl: string;
  videoUrl: string;
  rating: 'G' | 'PG' | 'PG-13' | 'R' | 'TV-14' | 'TV-MA';
  duration: string;
  releaseYear: number;
  genres: string[];
  cast: string[];
  matchScore: number; // e.g., 98 for "98% Match"
  isTrending?: boolean;
  isPopular?: boolean;
  isKids?: boolean;
}
