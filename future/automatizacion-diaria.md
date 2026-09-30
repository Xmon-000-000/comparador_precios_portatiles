# Automatización diaria

Un workflow programado no debe llamar a tiendas desde el navegador. Una futura tarea de servidor podría ejecutarse diariamente en GitHub Actions u otro scheduler, siempre que los términos de cada fuente lo permitan.

Flujo propuesto:

1. Obtener credenciales desde secretos protegidos.
2. Consultar adaptadores autorizados con rate limit, timeout y reintentos acotados.
3. Normalizar resultados a un esquema versionado y validar modelo, moneda y fecha.
4. Rechazar cambios anómalos o datos caducados; registrar errores sin publicar parciales inválidos.
5. Guardar snapshots históricos y generar `catalogo.json`, `precios.json` e `historico.json` de forma determinista.
6. Probar contratos y abrir una propuesta de actualización revisable; evitar commits automáticos a producción hasta definir controles.
7. Publicar solo los datos aprobados. GitHub Pages sirve archivos; no ejecuta la tarea de ingestión.