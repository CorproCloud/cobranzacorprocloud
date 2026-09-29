# Plan: Actualizar el directorio de contactos

## Objetivo
Adaptar la carga al nuevo archivo `DATOS-2.xlsx` y enviar cada cobranza a todos los correos registrados en las columnas de compras y pagos.

## Cambios
- Leer las nuevas columnas **CORREOS COMPRAS**, **CORREOS PAGOS**, **DÍAS DE VENCIMIENTO** y **AGENTE**.
- Limpiar, validar y eliminar correos duplicados entre ambas columnas.
- Usar el primer correo válido como destinatario y todos los demás como copias, para que el envío directo llegue a ambas áreas.
- Mostrar dentro de la ficha del cliente los correos de compras, los correos de pagos, los días de crédito y el agente.
- Mantener compatibilidad con el formato anterior del directorio.
- Probar el archivo proporcionado y verificar que la aplicación siga compilando correctamente.
