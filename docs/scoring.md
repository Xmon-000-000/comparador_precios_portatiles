# Criterio de puntuación

## Fórmula publicada

```text
valor_por_euro = (score_gpu + score_ram) / mejor_precio_eur
```

| Componente | Valor |
| --- | ---: |
| RTX 5060 | 60 |
| RTX 5070 | 85 |
| RTX 5080 | 100 |
| 16 GB RAM | 10 |
| 32 GB RAM | 20 |
| 64 GB RAM | 30 |

El mejor precio es el mínimo de las ofertas disponibles. El ranking se ordena de mayor a menor. Si no hay precio positivo, el score es cero.

## Lectura y límites

Es una heurística transparente para ordenar este catálogo, no una medida de FPS. No modela potencia configurada de la GPU, refrigeración, calidad de pantalla, batería, CPU ni ampliabilidad. El campo `cpuScore` se usa únicamente para la ordenación de potencia y **no** entra en la fórmula de valor por euro.

Los precios de muestra pueden alterar el orden y no deben usarse para decisiones de compra. Un score más alto no implica que todos los componentes de ese portátil sean mejores.