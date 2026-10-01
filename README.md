# PrecioPulso: monitor de precios gaming

Aplicación web estática para registrar y consultar capturas diarias de precios de portátiles gaming, junto con sus especificaciones y su histórico. Funciona en GitHub Pages sin backend ni proceso de compilación.

> **Aviso sobre los datos:** los rankings contienen las diez capturas manuales visibles por tienda del 30/09/2026. Los precios pueden cambiar; cada registro conserva configuración, vendedor y ficha fuente. No hay recolección automática diaria activa todavía.

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

- Dos rankings independientes, top 10 de Amazon y top 10 de PcComponentes.
- Clasificación por tienda: `(puntuación GPU + puntuación RAM) / precio de esa tienda`.
- Cada entrada incluye configuración, GPU y VRAM, vendedor, precio, puntuación y fecha de captura.
- Histórico diario para todos los modelos o uno seleccionado. El histórico actual empieza con una captura por configuración; las variaciones se harán útiles al acumular fechas.
- KPIs de catálogo; diseño usable en escritorio, tablet y móvil.

## Captura diaria

Ahora mismo la consulta es manual; GitHub Pages no ejecuta un proceso que lea tiendas ni guarde snapshots. Para actualizar el monitor cada día:

1. Comprueba el precio y vendedor de las fichas de cada tienda.
2. Actualiza `data/precios.json` y añade el punto del día en `data/historico.json`, conservando un identificador distinto para cada configuración.
3. Publica los cambios en `main` con `git add data && git commit -m "Update daily price snapshots" && git push origin main`.
4. GitHub Actions desplegará automáticamente Pages al recibir el push.

Un disparador programado diario no puede recolectar precios por sí mismo. La automatización requeriría una fuente autorizada o un proceso externo aprobado que genere los JSON; el workflow actual solo publica archivos.

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
- `data/precios.json`: capturas por tienda, URL de ficha fuente, vendedor, moneda y fecha.
- `data/historico.json`: series temporales independientes de la vista.
- Los tres archivos declaran `schemaVersion`; los identificadores de producto enlazan los conjuntos.
- Mantén los precios como números en EUR, valida fechas ISO (`YYYY-MM-DD`) y añade una observación al histórico cada día que se recopilen datos.
- Chart.js 4 se carga desde jsDelivr. Sin la librería, los rankings siguen disponibles y se muestra un aviso en el área del gráfico.

## Puntuación

La puntuación GPU y la fórmula están definidas en `assets/js/ranking.js`. El ranking se ordena de forma descendente por valor por euro; consulta [docs/scoring.md](docs/scoring.md) para sus límites e interpretación.

## Arquitectura y evolución

- [Arquitectura](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Puntuación](docs/scoring.md)
- [Integraciones futuras](future/)

## Licencia y afiliación

Este monitor no está afiliado a Amazon ni a PcComponentes. No incluye compra, scraping, precios en tiempo real ni enlaces de afiliación; las URL solo identifican la ficha de origen de cada observación.