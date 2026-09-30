# Uso futuro de SQLite

SQLite puede almacenar snapshots y permitir consultas locales o de un proceso de ingestión sencillo. Un esquema inicial puede separar `laptop`, `store`, `offer_snapshot` y `source_run`, con claves foráneas e índices por producto y fecha. Los importes se guardan como enteros en céntimos junto con la moneda, no como flotantes.

SQLite no se consulta desde una página de GitHub Pages: un proceso Python externo debe leer la base, generar los JSON públicos y desplegarlos. No subir credenciales ni datos privados; definir backups y retención de snapshots antes de usarlo como fuente operativa.