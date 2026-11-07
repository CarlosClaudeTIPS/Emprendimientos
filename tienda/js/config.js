/* Configuración pública de la tienda (se carga antes de app.js en todas las páginas).
   META_PIXEL_ID: ID numérico del píxel de Meta (Administrador de eventos → Orígenes de datos).
   Si está vacío, el píxel NO se carga. Con un valor, se carga en todas las páginas y envía:
   PageView, ViewContent (ficha), AddToCart (carrito), Contact (botones de WhatsApp) e InitiateCheckout (enviar carrito). */
window.TIENDA_CONFIG = {
  META_PIXEL_ID: ""
};
