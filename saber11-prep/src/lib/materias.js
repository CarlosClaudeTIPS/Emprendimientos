import { Calculator, BookOpen, Globe2, FlaskConical, Languages } from 'lucide-react'

// ─── Las cinco pruebas del Saber 11 (nombre, color e ícono) ──────────────────
// Antes vivían en components/Login.jsx; están aquí para que la pantalla de acceso
// se pueda cargar aparte sin arrastrar al resto de la app.
export const ICONO_PRUEBA = {
  lectura_critica: BookOpen, matematicas: Calculator, sociales_ciudadanas: Globe2, ciencias_naturales: FlaskConical, ingles: Languages,
}
export const MATERIAS = [
  { id: 'lectura_critica', nombre: 'Lectura Crítica', color: '#8B5CF6', fondo: '#F3EEFF', frase: 'Comprende, infiere y evalúa textos continuos y discontinuos.' },
  { id: 'matematicas', nombre: 'Matemáticas', color: '#1FA9EC', fondo: '#E6F6FE', frase: 'Interpreta datos, formula y resuelve, argumenta con números.' },
  { id: 'sociales_ciudadanas', nombre: 'Sociales y Ciudadanas', color: '#F59E0B', fondo: '#FFF6E5', frase: 'Analiza perspectivas, historia, territorio y ciudadanía.' },
  { id: 'ciencias_naturales', nombre: 'Ciencias Naturales', color: '#10B981', fondo: '#E7F8F1', frase: 'Explica fenómenos e indaga con datos de experimentos.' },
  { id: 'ingles', nombre: 'Inglés', color: '#EC4899', fondo: '#FDEBF4', frase: 'Avisos, conversaciones, vocabulario y lectura en inglés.' },
]
