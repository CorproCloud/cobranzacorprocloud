# Plan: Nube compartida + orden por deuda + mejoras

## Objetivo
1. Guardar los archivos originales (PDF de cartera y Excel/CSV de contactos) en la nube, compartidos para todos los que entren (sin login).
2. Poder quitar o reemplazar/actualizar esos archivos desde la app.
3. Ordenar la lista de clientes por **deuda mayor a menor** (con selector para invertir).
4. Mejoras de usabilidad.

## 1. Activar Lovable Cloud + almacenamiento
- Activar Lovable Cloud (necesario para guardar archivos en la nube).
- Crear un **bucket público** `cobranza-files` para los archivos.
- Crear una tabla `archivos` para registrar cada archivo guardado:
  - `id`, `tipo` ('pdf' | 'excel'), `nombre`, `ruta` (path en storage), `url`, `tamano`, `subido_en`.
  - Acceso compartido (lecturas/escrituras abiertas, sin login) según lo pediste.
- Nota: al ser compartidos sin login, cualquiera con el enlace de la app puede ver, subir, reemplazar y borrar los archivos.

## 2. Biblioteca de archivos en la nube (UI)
- Nueva sección "Archivos en la nube" en el Dashboard que lista los archivos guardados (PDF y Excel) con nombre, fecha y tamaño.
- Botón **Subir a la nube** al cargar un archivo (guarda el archivo en storage + registro en tabla).
- Por cada archivo guardado:
  - **Usar** → lo carga y procesa directamente desde la nube.
  - **Actualizar/Reemplazar** → sube una versión nueva sobre el mismo registro.
  - **Quitar** → elimina el archivo del storage y su registro.
- Al entrar a la app, se cargan automáticamente los archivos guardados más recientes para procesarlos sin tener que volver a subirlos.

## 3. Ordenar clientes por deuda
- Añadir un selector de orden en la barra de filtros con opciones:
  - **Deuda: mayor a menor** (por defecto).
  - Deuda: menor a mayor.
  - (opcional) Días vencidos: mayor a menor.
- El orden se aplica sobre el total de deuda filtrada de cada cliente.

## 4. Mejoras adicionales
- Indicador de carga al subir/guardar/borrar archivos en la nube (con toasts).
- Texto del footer/empty-state ajustado: ahora los archivos sí pueden guardarse en la nube (ya no será "nunca salen de tu navegador").
- Confirmación antes de quitar un archivo de la nube.

## Detalles técnicos
- **Storage**: bucket público `cobranza-files`; subida con nombres únicos (timestamp + nombre).
- **Tabla `archivos`** en Lovable Cloud con GRANTs y políticas abiertas (sin login) por requerimiento de "compartido".
- **Procesado**: los archivos descargados de la nube se pasan a los parsers existentes (`parseCarteraPDF`, `parseContactsExcel`) como `File`/`Blob`, sin cambiar la lógica de parseo.
- **Orden**: nuevo estado `sortOrder` aplicado en el `useMemo` de `enriched` en `Dashboard.tsx`.
- Se elimina/ajusta el mensaje "Tus datos nunca abandonan tu navegador".

## Seguridad (a tener en cuenta)
Compartido sin login significa acceso público de lectura y escritura a los archivos. Si más adelante quieres que cada usuario vea solo lo suyo, se podría añadir login después.
