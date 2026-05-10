export class WhatsAppService {
  /**
   * Envía un recibo de pedido automatizado vía WhatsApp.
   * En producción, esto se conectaría con Twilio, Meta API o un proveedor como 360dialog.
   */
  async sendOrderReceipt(
    phone: string, 
    orderId: string, 
    sellerName: string, 
    buyerName: string, 
    totalAmount: number
  ): Promise<void> {
    console.log(`[WhatsApp Superpower] Enviando recibo a ${phone} para el Pedido ${orderId}`);
    
    const message = `
🌟 *¡Hola ${buyerName}!* 🌟

Gracias por tu pedido en *${sellerName}*.
Hemos recibido tu solicitud correctamente.

📄 *Detalles del Pedido:*
- *ID:* #${orderId.slice(0, 8)}
- *Total Estimado:* $${totalAmount.toLocaleString('en-US')}

🚀 El equipo de ventas revisará tu pedido y se pondrá en contacto contigo por este medio en breve para coordinar el pago y envío.

_Este es un mensaje automático del sistema Catagce._
    `.trim();
    
    // Mock de envío
    console.log("--- CONTENIDO DEL MENSAJE WHATSAPP ---");
    console.log(message);
    console.log("---------------------------------------");
    
    // Aquí iría el fetch a la API de WhatsApp
  }
}
