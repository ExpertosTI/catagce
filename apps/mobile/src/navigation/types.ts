export type ClientOrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
};

export type AdminOrdersStackParamList = {
  PriceOrdersList: undefined;
  PriceOrderDetail: { orderId: string };
};

export type InvoicesStackParamList = {
  InvoicesList: undefined;
  InvoiceDetail: { invoiceId: string };
};
