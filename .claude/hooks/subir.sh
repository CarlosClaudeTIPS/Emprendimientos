#!/bin/sh
# Gancho Stop: al terminar cada respuesta de Claude, sube a GitHub (rama main) lo que
# haya quedado sin subir. Así el otro computador siempre encuentra lo último.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
git fetch -q origin main 2>/dev/null || true
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  n=$(git diff --cached --name-only | wc -l | tr -d ' ')
  carpetas=$(git diff --cached --name-only | cut -d/ -f1 | sort -u | tr '\n' ' ')
  git commit -q -m "Cambios de la sesión en: ${carpetas}(${n} archivos)" -m "Commit automático al terminar la respuesta (gancho Stop de .claude/settings.json)." || true
fi
if [ "$(git rev-list --count origin/main..HEAD 2>/dev/null)" != "0" ]; then
  if ! git merge -q --ff-only origin/main 2>/dev/null; then
    git merge -q --no-edit origin/main 2>/dev/null || { git merge --abort 2>/dev/null; echo "Conflicto con lo subido desde el otro computador: pide a Claude que lo resuelva." >&2; exit 2; }
  fi
  git push -q origin main 2>/dev/null || { echo "No se pudo subir a GitHub (¿sin internet?). Se intentará al terminar la próxima respuesta." >&2; exit 0; }
fi
exit 0
