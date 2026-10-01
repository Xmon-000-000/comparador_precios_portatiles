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
| 24 GB RAM | 15 |
| 32 GB RAM | 20 |
| 64 GB RAM | 30 |

Cada ranking usa el precio capturado para esa misma tienda, no el mínimo cruzado entre comercios. Las configuraciones intermedias de 24 GB reciben una interpolación lineal de 15 puntos. El ranking se ordena de mayor a menor. Si no hay precio positivo, el score es cero.

## Lectura y límites

Es una heurística transparente para ordenar este catálogo, no una medida de FPS. No modela potencia configurada de la GPU, refrigeración, calidad de pantalla, batería, CPU ni ampliabilidad. El campo `cpuScore` se usa únicamente para la ordenación de potencia y **no** entra en la fórmula de valor por euro.

El score usa el precio de la captura incluida en el conjunto de datos y puede quedar desactualizado. Un score más alto no implica que todos los componentes de ese portátil sean mejores. Los rankings solo comparan las diez capturas actuales de cada tienda, no la totalidad de su catálogo.