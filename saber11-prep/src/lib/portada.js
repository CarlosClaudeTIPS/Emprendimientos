// La portada pública vive en index.html (HTML estático, #portada). La app la muestra
// cuando no hay sesión y la ruta no es #/entrar, y la oculta en cualquier otro caso.
export function mostrarPortada(visible) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('sin-portada', !visible)
  const p = document.getElementById('portada')
  if (p) p.hidden = !visible
}
