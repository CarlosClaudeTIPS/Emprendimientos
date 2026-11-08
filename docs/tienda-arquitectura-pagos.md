# Tienda Nivytek: arquitectura para vender directamente en la web (etapa futura)

Estado hoy (noviembre de 2026): catálogo + carrito + pedido por WhatsApp. Sin pasarela, sin registro, sin checkout. Este documento deja escrito cómo crecer sin rehacer nada.

## Dónde se opera hoy

- **Panel de administración (artefacto de Claude):** https://claude.ai/artifact/1dgB2Y7iTa6hz7qWdPgNNt — inventario (unidades, costo, precio, ganancia), combos, productos por encargo, ranking de ofertas, vendidos, **pedidos** y **clientes**. Guarda pedidos y decisiones en su propia base compartida (colecciones `pedidos` y `decisiones`). Es la fuente operativa: lo que se decide ahí se baja a los JSON de la tienda.
- **Tareas del equipo:** https://claude.ai/artifact/CzbDqZFZaLNj95Rpg1zgwE
- **Hoja de Google «Catálogo Nivytek (tienda)»:** productos por encargo que la tienda lee en vivo cuando la pestaña «Vitrina (pública)» está publicada.

## Lo que ya está listo para crecer

| Pieza | Dónde vive | Sirve para pagos porque… |
|---|---|---|
| Catálogo centralizado | `data/catalogo.json` (propios), hoja de Google → `data/encargo.json` (por encargo), `data/combos.json` (kits) | Cada producto tiene `id`, `precio`, `stock`, `disponible`, `modalidad` (stock / encargo), `categoria`, `variantes`. Un checkout solo necesita leer esos campos. |
| Carrito | `js/app.js` → `T.carrito` (localStorage) | Guarda `{id, variantes, cantidad}`, respeta el tope de inventario, calcula total. Es el mismo objeto que se enviaría a una pasarela. |
| Eventos de conversión | `T.registrar(...)` y `T.pixel(...)` | Ya emite view_item, add_to_cart, whatsapp_click, begin_checkout. GA4 y píxel de Meta se activan poniendo el ID en `data/config.json` → `analitica` y `js/config.js`. |
| Políticas | `data/config.json` → `politicas` | Entregas, pagos, retracto, garantía, reclamos y datos del responsable, que la Ley 1480 exige mostrar antes de comprar. |

Regla: los datos de producto no se duplican. Las fichas `p/*.html` y el sitemap se generan con `scripts/generar-paginas.mjs` a partir de los JSON; nunca se editan a mano.

## Cómo se conectaría una pasarela (cuando las ventas lo justifiquen)

Opciones en Colombia con cuenta gratuita y cobro por transacción (sin mensualidad):

- **Wompi (Bancolombia)**: botón de pago o checkout web; PSE, tarjetas, Nequi, Bancolombia. Comisión aproximada 2,65 % + IVA por transacción. Es la opción natural si los pagos ya llegan a Nequi/Bancolombia.
- **Mercado Pago**: checkout Pro con enlace de pago; tarjetas, PSE, efectivo. Comisión aproximada 3,5 % + IVA.
- **ePayco / PayU**: similares; conviene comparar comisiones en el momento.

Pasos técnicos, en orden, cuando llegue el momento:

1. **Función de servidor para crear el pago** (`api/crear-pago.js` en Vercel): recibe el carrito `{items}`, vuelve a calcular el total leyendo los JSON del catálogo (nunca confiar en el total que manda el navegador), crea la transacción en la pasarela con la clave privada guardada como variable de entorno en Vercel, y devuelve la URL de pago.
2. **Checkout mínimo** (`checkout.html`): nombre, WhatsApp, correo, dirección y ciudad; muestra total, costo de envío (tabla por ciudad en `data/envios.json`) y las políticas con casilla de aceptación. Botón «Pagar» que llama a la función anterior.
3. **Pedidos**: el panel de administración ya guarda pedidos y clientes (colección `pedidos`); el checkout escribiría ahí mismo, de modo que WhatsApp y web compartan una sola lista. Cada pago crea un registro `{id, fecha, items, total, envío, cliente, estado}`. Al inicio basta con una tabla en Supabase (ya se usa en el ICFES) o una hoja de Google escrita desde la función. Estados: pendiente de pago → pagado → preparando → enviado → entregado → devuelto.
4. **Webhook de la pasarela** (`api/pago-confirmado.js`): la pasarela avisa cuando el pago se aprueba; la función marca el pedido como pagado, descuenta inventario y envía la confirmación (correo o mensaje de WhatsApp al cliente).
5. **Página de estado** (`pedido.html?id=…`): el cliente consulta su pedido con el número y el WhatsApp.
6. **Inventario**: pasar `stock` de los JSON a la misma tabla de pedidos para que un pago lo descuente de forma automática; mientras se venda por WhatsApp, el JSON y la hoja bastan.

Lo que NO se necesita todavía: registro obligatorio de clientes, base de datos compleja, app propia. Volumen actual: menos de 10 productos propios y ventas por chat.

## Señales para dar el paso

- Más de 30 pedidos cerrados al mes por WhatsApp durante dos meses seguidos.
- Margen conocido por producto (costo, envío, empaque) y positivo.
- Al menos un producto que se repone de forma constante.
- Tiempo de respuesta en WhatsApp que ya no alcanza.
