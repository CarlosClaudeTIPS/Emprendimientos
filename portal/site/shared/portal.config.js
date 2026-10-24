/* =====================================================================
   CONFIGURACIÓN DEL PORTAL — un solo lugar para la marca y las pestañas
   ---------------------------------------------------------------------
   Para agregar una sección nueva (un curso, otro producto): copia un bloque
   de "secciones", cambia los textos, la carpeta y el ícono (iconoArchivo en
   shared/iconos/, siguiendo la hoja de marca), y vuelve a ejecutar
   `node portal/build.mjs`. La pestaña aparece sola en la portada y en la barra.
   ===================================================================== */
window.PORTAL_CONFIG = {
  marca: {
    nombre: "Nivytek",                     // Marca del sitio (dominio nivytek.com)
    lema: "Servicios y productos, en un solo lugar.",
    pregunta: "¿Qué estás buscando hoy?"
  },
  secciones: [
    {
      id: "icfes", carpeta: "icfes/", nombre: "Saber 11 (ICFES)", color: "#2F4D8C",
      publico: "Estudiantes y familias",
      titulo: "Prepárate para la prueba Saber 11 y los exámenes de admisión",
      texto: "Saber 11 y exámenes de admisión propios (Nacional, Antioquia): preguntas explicadas, simulacros y rutas por carrera.",
      boton: "Entrar a Saber 11", icono: "test", iconoArchivo: "shared/iconos/icfes.svg"
    },
    {
      id: "docentes", carpeta: "docentes/", nombre: "Apoyo docente", color: "#F4845F",
      publico: "Docentes",
      titulo: "Apoyo docente personalizado",
      texto: "Planeaciones, guías, rúbricas y PIAR según tu grado, tu área y tu tiempo.",
      boton: "Entrar a Apoyo docente", icono: "calendar", iconoArchivo: "shared/iconos/docentes.svg"
    },
    {
      id: "tienda", carpeta: "tienda/", nombre: "Tienda", color: "#1E9E7A",
      // Cuando el subdominio tienda.nivytek.com esté activo en Vercel y en el DNS, vuelve a poner:
      // url: "https://tienda.nivytek.com/", host: "tienda.nivytek.com",
      publico: "Compradores y emprendedores",
      titulo: "Tienda de productos",
      texto: "Catálogo con pedidos por WhatsApp. Productos útiles, listos para pedir hoy.",
      boton: "Ver catálogo", icono: "bag", iconoArchivo: "shared/iconos/tienda.svg"
    }
  ]
};
