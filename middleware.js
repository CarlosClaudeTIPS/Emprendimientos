// Edge Middleware de Vercel: en tienda.nivytek.com la raíz debe ser la tienda.
// Las reglas de vercel.json no alcanzan a «/» porque el archivo index.html del
// portal existe y Vercel lo sirve antes de reescribir; el middleware corre antes.
export const config = { matcher: ['/', '/index.html'] };

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname === 'tienda.nivytek.com') {
    url.pathname = '/tienda/index.html';
    return new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });
  }
}
