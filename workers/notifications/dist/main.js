"use strict";var c=require("bullmq");var n=class{async sendOrderReceipt(e,t,r,s,i){console.log(`[WhatsApp Superpower] Enviando recibo a ${e} para el Pedido ${t}`);let a=`
\u{1F31F} *\xA1Hola ${s}!* \u{1F31F}

Gracias por tu pedido en *${r}*.
Hemos recibido tu solicitud correctamente.

\u{1F4C4} *Detalles del Pedido:*
- *ID:* #${t.slice(0,8)}
- *Total Estimado:* $${i.toLocaleString("en-US")}

\u{1F680} El equipo de ventas revisar\xE1 tu pedido y se pondr\xE1 en contacto contigo por este medio en breve para coordinar el pago y env\xEDo.

_Este es un mensaje autom\xE1tico del sistema Catagce._
    `.trim();console.log("--- CONTENIDO DEL MENSAJE WHATSAPP ---"),console.log(a),console.log("---------------------------------------")}};var p=process.env.REDIS_HOST??"localhost",m=parseInt(process.env.REDIS_PORT??"6379"),g=new n,l=new c.Worker("notifications",async o=>{let{type:e,data:t}=o.data;if(e==="ORDER_CREATED"){let{phone:r,orderId:s,sellerName:i,buyerName:a,totalAmount:d}=t;await g.sendOrderReceipt(r,s,i,a,d)}},{connection:{host:p,port:m}});l.on("completed",o=>{console.log(`[NotificationWorker] Job ${o.id} completed`)});l.on("failed",(o,e)=>{console.error(`[NotificationWorker] Job ${o?.id} failed: ${e.message}`)});console.log("\u{1F680} Notification Worker started \u2014 queue: notifications");
