export interface ProductGroup {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  /** Set when the index endpoint is called with products eager-loaded. */
  products?: Product[];
}


/** A single field in the structured custom-checkout-fields array. */
export interface CheckoutField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  options?: { value: string; text: string }[];
}

export interface Product {
  id: number;
  product_group_id: number;
  name: string;
  description?: string | null;
  price: string;
  original_price?: string | null;
  type: 'accounts' | 'currency' | 'items' | 'boosting' | 'gift-cards'; // Extensible types
  is_available: boolean;
  custom_form_code?: string | null;
  /** Structured custom checkout fields (replaces custom_form_code parsing). */
  custom_checkout_fields?: CheckoutField[] | null;
  /** When true, the "Notes for Seller" section is shown at checkout for this product. */
  enable_seller_notes?: boolean;
  /** Raw HTML injected above the custom checkout fields at checkout. */
  custom_checkout_html?: string | null;
  image_url?: string | null;
  discount_percentage?: number | null;
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

export interface OrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  /** Per-item custom fields captured from the product's custom_form_code template. */
  custom_fields?: Record<string, string> | null;
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
  items?: OrderItem[] | null;
  quantity?: number;
  seller_notes?: string | null;
  product?: Product & { product_group?: ProductGroup };
}