# FrameRate: comparador de portátiles gaming

Aplicación web estática para comparar portátiles gaming por especificaciones, ofertas, puntuación de valor e histórico de precios. Funciona en GitHub Pages sin backend, base de datos ni proceso de compilación.

> **Aviso sobre los datos:** el catálogo y los precios incluidos son ejemplos ilustrativos, no ofertas verificadas. Los enlaces llevan a búsquedas en las tiendas; confirma siempre el modelo exacto, el precio final, la disponibilidad y las condiciones antes de comprar.

## Probar en local

La aplicación carga JSON mediante `fetch`, por lo que debe servirse por HTTP y no abrirse como `file://`.

Con Python 3:

```sh
python3 -m http.server 8000
```

Abre <http://localhost:8000>. No se requiere instalar dependencias Python o JavaScript.

## Publicar en GitHub Pages

El workflow de `.github/workflows/pages.yml` publica la raíz del repositorio en cada push a `main` y también se puede ejecutar manualmente. En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de publicación. El primer despliegue puede tardar unos minutos; la URL aparecerá en la ejecución del workflow.

Para publicar cambios desde la rama de funcionalidad, crea y fusiona un pull request a `main`. El workflow no publica automáticamente ramas de características.

## Funcionalidades

- Tabla responsive con procesador, gráfica, memoria, pantalla, precios de ejemplo, diferencia y actualización.
- Filtros por RTX 5060/5070/5080, marca, precio máximo, RAM y SSD, además de ordenación por precio, potencia, calidad/precio, CPU, GPU o RAM.
- Ranking por valor por euro con la fórmula `(puntuación GPU + puntuación RAM) / mejor precio`.
- Histórico mensual de seis meses, para todos los modelos o uno seleccionado, con precio actual, mínimo, máximo y variación.
- KPIs de catálogo; diseño usable en escritorio, tablet y móvil.

## Estructura

```text
.
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── js/{app,chart,filters,ranking}.js
│   └── images/
├── data/{catalogo,precios,historico}.json
├── docs/{architecture,roadmap,scoring}.md
├── future/
└── .github/workflows/pages.yml
```

## Datos y mantenimiento

- `data/catalogo.json`: identidad y especificaciones relativamente estables del equipo.
- `data/precios.json`: ofertas por tienda, enlaces, moneda y fecha de actualización.
- `data/historico.json`: series temporales independientes de la vista.
- Los tres archivos declaran `schemaVersion`; los identificadores de producto enlazan los conjuntos.
- Mantén los precios como números en EUR, valida fechas ISO (`YYYY-MM-DD`) y actualiza el histórico al registrar cada observación.
- Chart.js 4 se carga desde jsDelivr. Sin la librería, la tabla y los filtros siguen disponibles y se muestra un aviso en el área del gráfico.

## Puntuación

La puntuación GPU y la fórmula están definidas en `assets/js/ranking.js`. El ranking se ordena de forma descendente por valor por euro; consulta [docs/scoring.md](docs/scoring.md) para sus límites e interpretación.

## Arquitectura y evolución

- [Arquitectura](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Puntuación](docs/scoring.md)
- [Integraciones futuras](future/)

## Licencia y afiliación

Este proyecto de demostración no está afiliado a Amazon ni a PcComponentes. No incluye scraping, precios en tiempo real ni enlaces de afiliación.