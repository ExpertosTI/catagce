export type DashboardInsight = {
  type: 'success' | 'warning' | 'info' | 'ai';
  text: string;
};

export type DashboardSummary = {
  invoices?: {
    total?: number;
    creditPending?: string;
    paidCount?: number;
    openCount?: number;
  };
  pendingDispatch?: { count?: number; units?: number };
  stock?: { totalUnits?: number; inWarehouse?: number; reserved?: number };
  activeClients?: number;
  paymentsToday?: { count?: number; total?: string };
  salesMonth?: { count?: number; total?: string };
  overdue?: { count?: number; total?: string };
  recentPayments?: Array<{
    id: string;
    amount: string;
    method: string;
    paidAt: string;
    invoiceReference: string;
    clientName: string;
  }>;
  recentInvoices?: Array<{
    id: string;
    reference: string;
    ncf?: string | null;
    status: string;
    totalAmount: string;
    clientName: string;
    issuedAt?: string | null;
  }>;
  recentImports?: Array<{ id: string; reference: string; status: string }>;
  insights?: DashboardInsight[];
  updatedAt?: string;
};
