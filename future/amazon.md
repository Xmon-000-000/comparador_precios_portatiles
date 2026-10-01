# Integración futura: Amazon

1. Investigar los programas, APIs oficiales, requisitos de afiliación, cuotas y políticas vigentes antes de implementar.
2. Preferir una API autorizada, como Product Advertising API si la cuenta y el uso cumplen sus condiciones; nunca asumir acceso anónimo o scraping permitido.
3. Guardar credenciales únicamente en secretos de un entorno de servidor, nunca en JavaScript, JSON público o el historial de Git.
4. Normalizar ASIN, variante, vendedor, precio, moneda, disponibilidad, URL canónica, hora de consulta y caducidad.
5. Mostrar la atribución y los avisos exigidos por los términos del programa. No presentar el precio como actual tras su caducidad.
6. Gestionar límites, errores y respuestas incompletas; conservar histórico solo cuando la licencia y los términos lo permitan.

El frontend de GitHub Pages no puede ocultar secretos ni ejecutar una tarea programada privada. La integración requiere un servicio externo autorizado.