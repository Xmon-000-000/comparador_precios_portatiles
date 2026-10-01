# Uso futuro de Python

Python puede alojar adaptadores de fuentes, validación, normalización, puntuación de calidad del dato y generación de JSON. Mantener separadas las capas `providers`, `domain`, `storage` y `export` permite cambiar de proveedor sin acoplarlo al frontend.

Se recomienda tipar los modelos de dominio, validar entradas externas y producir archivos deterministas. Las credenciales se inyectan desde variables seguras del entorno del proceso; no se serializan en artefactos públicos. El runtime de Python sería parte de la tarea de ingestión o del backend y no es requisito para abrir la web estática.