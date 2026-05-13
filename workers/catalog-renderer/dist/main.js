"use strict";var b=Object.create;var d=Object.defineProperty;var u=Object.getOwnPropertyDescriptor;var w=Object.getOwnPropertyNames;var v=Object.getPrototypeOf,R=Object.prototype.hasOwnProperty;var E=(e,t,a,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of w(t))!R.call(e,o)&&o!==a&&d(e,o,{get:()=>t[o],enumerable:!(r=u(t,o))||r.enumerable});return e};var p=(e,t,a)=>(a=e!=null?b(v(e)):{},E(t||!e||!e.__esModule?d(a,"default",{value:e,enumerable:!0}):a,e));var g=require("bullmq"),m=require("@catagce/db");var c=p(require("puppeteer")),l=p(require("handlebars")),n=class{async renderPdf(t,a,r){console.log(`[Catalog Superpower] Renderizando PDF para: ${r.name}`);let o=await c.default.launch({args:["--no-sandbox","--disable-setuid-sandbox"],headless:"new"}),i=await o.newPage(),h=l.compile(`
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap');
            body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 40px; color: #000; }
            .header { border-bottom: 8px solid #000; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo-text { font-size: 48px; font-weight: 900; letter-spacing: -2px; text-transform: uppercase; }
            .accent { color: #00D1FF; }
            .catalog-name { font-size: 84px; font-weight: 900; line-height: 0.8; margin-bottom: 60px; letter-spacing: -4px; text-transform: uppercase; }
            .grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 40px; }
            .product-card { border: 4px solid #000; padding: 20px; position: relative; }
            .product-image { width: 100%; aspect-ratio: 1; object-fit: cover; border-bottom: 4px solid #000; margin-bottom: 15px; }
            .product-name { font-size: 24px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; }
            .product-price { font-size: 20px; font-weight: 400; color: #666; }
            .qr-section { margin-top: 80px; padding: 40px; background: #000; color: #fff; display: flex; align-items: center; gap: 30px; }
            .qr-text { font-size: 18px; font-weight: 900; text-transform: uppercase; }
            .footer { margin-top: 40px; font-size: 10px; font-weight: 900; color: #999; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">CATAGCE<span class="accent">.</span></div>
            <div style="font-weight: 900; font-size: 12px;">PRODUCIDO POR RENACE.TECH</div>
          </div>
          
          <h1 class="catalog-name">{{name}}</h1>
          
          <div class="grid">
            {{#each products}}
            <div class="product-card">
              <img class="product-image" src="{{imageUrl}}" />
              <div class="product-name">{{name}}</div>
              <div class="product-price">{{basePrice}} USD</div>
            </div>
            {{/each}}
          </div>

          <div class="qr-section">
            <div style="width: 100px; height: 100px; background: #fff; padding: 10px;">
              <!-- Aqu\xED ir\xEDa el QR generado -->
              <div style="width: 100%; height: 100%; border: 2px solid #000;"></div>
            </div>
            <div class="qr-text">
              ESCANE\xC1 PARA PEDIR POR WHATSAPP<br/>
              <span class="accent">CATAGCE.RENACE.TECH/C/{{slug}}</span>
            </div>
          </div>

          <div class="footer">\xA9 2026 CATAGCE SYSTEM - POWERED BY RENACETECH</div>
        </body>
      </html>
    `)(r);await i.setContent(h,{waitUntil:"networkidle0"});let s=`/tmp/catalog-${t}.pdf`;return await i.pdf({path:s,format:"A4",printBackground:!0,margin:{top:"0px",right:"0px",bottom:"0px",left:"0px"}}),await o.close(),console.log(`\u2705 PDF generado exitosamente en: ${s}`),s}};var A=process.env.REDIS_HOST??"localhost",C=parseInt(process.env.REDIS_PORT??"6379"),f=process.env.DATABASE_URL;if(!f)throw new Error("DATABASE_URL is missing");var O=(0,m.createClient)(f),P=new n,x=new g.Worker("catalog-render",async e=>{let{catalogId:t,sellerId:a,catalogData:r}=e.data;console.log(`[CatalogRenderer] Rendering PDF for catalog ${t}`);let o=await P.renderPdf(t,a,r);return console.log(`[CatalogRenderer] PDF saved to ${o}`),{pdfPath:o}},{connection:{host:A,port:C},concurrency:2});x.on("completed",e=>{console.log(`[CatalogRenderer] Job ${e.id} completed`)});x.on("failed",(e,t)=>{console.error(`[CatalogRenderer] Job ${e?.id} failed: ${t.message}`)});console.log("\u{1F680} Catalog Renderer Worker started \u2014 queue: catalog-render");
