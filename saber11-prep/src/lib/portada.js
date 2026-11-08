// La portada pública vive en index.html (HTML estático, #portada). La app la muestra
// cuando no hay sesión y la ruta no es #/entrar, la oculta en cualquier otro caso, y
// también la puede mostrar con sesión (logo de la app): entonces la app (#root) se
// esconde y los botones «Ingresar» de la portada pasan a decir «Volver a mi panel».
export function mostrarPortada(visible, { conSesion = false } = {}) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('sin-portada', !visible)
  const p = document.getElementById('portada')
  if (p) p.hidden = !visible
  const root = document.getElementById('root')
  if (root) root.hidden = Boolean(visible && conSesion)
  if (p) p.querySelectorAll('a[href="#/entrar"]').forEach(a => {
    if (!a.dataset.textoOriginal) a.dataset.textoOriginal = a.textContent
    a.textContent = conSesion ? 'Volver a mi panel' : a.dataset.textoOriginal
  })
}
