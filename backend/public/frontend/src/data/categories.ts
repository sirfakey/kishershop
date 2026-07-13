export interface ProductGroup {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  /** Set when the index endpoint is called with products eager-loaded. */
  products?: Product[];
}


export interface Product {
  id: number;
  product_group_id: number;
  name: string;
  price: string;
  type: 'accounts' | 'currency' | 'items' | 'boosting' | 'gift-cards'; // Extensible types
  is_available: boolean;
  custom_form_code?: string | null;
}

export interface SingleCategoryResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  products: Product[];
}

// ─── Customer Account Types ──────────────────────────────

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  points: number;
}

export interface Trade {
  id: number;
  email: string | null;
  whatsapp_number: string;
  description: string;
  status: 'pending' | 'reviewed' | 'completed' | 'declined';
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface CustomerTransaction {
  id: number;
  transaction_id: string;
  product_name: string;
  price: string;
  status: string;
  points_earned: number;
  points_redeemed: number;
  created_at: string;
  product?: Product & { product_group?: ProductGroup };
}