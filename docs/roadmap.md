# Roadmap

## Base actual

- Comparador estático, responsive y modular, con diez equipos de ejemplo.
- Filtros, ordenaciones, score, KPIs e histórico Chart.js.
- Publicación mediante GitHub Pages Actions.

## Siguiente etapa: datos fiables

- Sustituir los datos de muestra por observaciones con fuente, moneda, fecha y condiciones verificables.
- Acordar política de actualización, caducidad y disponibilidad para precios ausentes.
- Incorporar validación automática de esquema y consistencia entre IDs, fechas y series.

## Etapa posterior: ingestión

- Investigar primero APIs y permisos de cada tienda; no asumir que el scraping está permitido.
- Crear tareas programadas fuera de GitHub Pages para obtener y normalizar datos.
- Mantener snapshots históricos y comparar cambios antes de publicar los JSON.

## Backend opcional

- Introducir Python para adaptadores, validación y generación determinista del catálogo.
- Migrar snapshots a SQLite cuando hagan falta consultas o una operación de escritura concurrente.
- Mantener el frontend estático consumiendo JSON versionado o una API pública cacheable.
- Automatizar pruebas de contrato, accesibilidad y capturas responsive antes del despliegue.