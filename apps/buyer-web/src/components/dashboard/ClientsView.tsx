'use client';

export function ClientsView({ color, orders }: any) {
  // Derive unique clients from orders
  const clientMap = new Map<string, any>();
  orders.forEach((o: any) => {
    const key = o.buyerPhone;
    if (!clientMap.has(key)) {
      clientMap.set(key, { 
        name: o.buyerName, 
        phone: o.buyerPhone, 
        totalSpent: 0, 
        orderCount: 0,
        lastOrder: o.createdAt
      });
    }
    const c = clientMap.get(key);
    c.totalSpent += Number(o.totalAmount) || 0;
    c.orderCount += 1;
    if (new Date(o.createdAt) > new Date(c.lastOrder)) {
      c.lastOrder = o.createdAt;
    }
  });

  const clients = Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <h2 className="text-6xl font-bebas tracking-wide uppercase">BASE DE <span style={{ color }}>CLIENTES</span></h2>
        <span className="font-bebas text-2xl text-gray-700">{clients.length} CLIENTES ÚNICOS</span>
      </div>

      <div className="glass rounded-[40px] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-8 py-6 font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest">CLIENTE</th>
              <th className="px-8 py-6 font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">PEDIDOS</th>
              <th className="px-8 py-6 font-rajdhani text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">TOTAL GASTADO</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="px-8 py-6">
                  <p className="font-bebas text-2xl uppercase tracking-wide group-hover:text-white transition-colors">{c.name}</p>
                  <p className="font-rajdhani text-[10px] font-bold text-gray-500 uppercase tracking-widest">{c.phone}</p>
                </td>
                <td className="px-8 py-6 text-center font-bebas text-2xl">{c.orderCount}</td>
                <td className="px-8 py-6 text-right font-bebas text-2xl" style={{ color }}>${c.totalSpent.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
