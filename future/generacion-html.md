# Generación automática de HTML

La opción preferida es conservar un frontend estable que lea JSON versionado, no generar HTML con concatenación de cadenas a partir de datos de tiendas.

Si en el futuro se requiere renderizado previo, un generador Python debe usar una plantilla con autoescape, validar el esquema, escapar contenido y crear el sitio completo en un directorio temporal antes de sustituir el artefacto publicado. El resultado sigue siendo estático y se puede servir en GitHub Pages. Probar enlaces relativos, caracteres especiales, contenido ausente y rutas bajo un `base path` antes del despliegue.