# Arquitectura

## Vista actual

FrameRate es una aplicación estática sin fase de build. `index.html` declara la estructura accesible y carga CSS, módulos ES y Chart.js. `assets/js/app.js` coordina la carga de JSON, la composición de productos y la representación de KPIs, tabla y ranking. Los módulos `filters.js`, `ranking.js` y `chart.js` encapsulan sus respectivas reglas. Los datos están separados por frecuencia de cambio en `data/`.

```text
index.html
  ├── assets/css/styles.css
  ├── assets/js/app.js ── filters.js
  │                    ├─ ranking.js
  │                    └─ chart.js ── Chart.js (CDN)
  └── data/*.json
```

El navegador descarga los JSON desde el mismo origen. En local se necesita un servidor HTTP; GitHub Pages ya ofrece ese origen. No se guardan datos personales ni estado entre sesiones.

## Contratos de datos

- `catalogo.json`: `products[]` con `id`, fabricante, modelo, CPU y puntuación de CPU, GPU, RAM, SSD y pantalla.
- `precios.json`: `products[]` asociado por `id`, ofertas opcionales por tienda (`price`, `url`) y `updatedAt`.
- `historico.json`: `dates[]` compartido y `models[]`, con `id` y una serie `prices[]` alineada con las fechas.
- Todos llevan `schemaVersion` y moneda explícita. Los IDs son claves estables, no nombres de presentación.

Los precios y el histórico de esta distribución son ficticios. En datos reales, una oferta ausente debe omitirse o ser `null`, nunca convertirse en precio cero. Para las series, conviene preservar `null` cuando no hay observación.

## Límites y seguridad

No hay autenticación, API ni escritura desde el cliente. Los enlaces externos se abren con `noopener noreferrer`. El contenido de cadenas se escapa antes de insertarse en HTML. Las futuras fuentes deben validarse y normalizarse antes de generar los JSON públicos. No publicar credenciales, datos personales ni respuestas de APIs privadas en este repositorio.

## Camino de migración

Conservar el contrato JSON como formato de intercambio permite añadir un generador Python o una API sin acoplar el navegador a SQLite. Un proceso de backend puede leer adaptadores de tiendas, normalizar a modelos internos, persistir snapshots y exportar estos mismos documentos estáticos. Véanse las notas de [future/](../future/).