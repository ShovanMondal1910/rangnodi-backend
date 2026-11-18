export interface OrderItemDto {
  productId: string;
  productTitle: string;
  sku?: string;
  selectedSize?: string;
  selectedColor?: string;
  unitPrice: number;
  vat?: number;
  discount?: number;
  quantity: number;
  totalPrice: number;
}

export interface CreateOrderDto {
  userId?: string;
  
  // Customer & Delivery Details
  firstName: string;
  lastName?: string;
  customerName?: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  
  // Financials
  subtotal: number;
  shippingCharge: number;
  discountAmount: number;
  vatAmount: number;
  roundingOff: number;
  totalAmount: number;
  
  // Payment
  paymentMethod: string;
  
  // Items
  items: OrderItemDto[];
}
