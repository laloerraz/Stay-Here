# Verificación de Stay Here 1.1.4

Comprobada el 26 de octubre de 2026.

- 34 pruebas automatizadas aprobadas con `node --test tests/protection.test.cjs`. Usan el código real con APIs de Chrome simuladas e incluyen falsificación de políticas, inyección por documento, reinicio del worker, pausa/excepciones y cierres de pestañas.
- Archivos JavaScript del producto comprobados con `node --check`.
- ZIP final extraído y comprobado: `manifest.json`, scripts e iconos directamente en la carpeta de instalación. La prueba de integración se ejecutó sobre esa copia extraída, no sobre el directorio de fuentes.
- Google Chrome **155.0.8059.85** leyó y empaquetó la copia del ZIP mediante `--pack-extension` (código de salida 0). Esto comprueba que Chrome acepta el manifiesto y empaquetado; no equivale a una instalación en el perfil personal.
- Extensión instalada mediante Playwright en un perfil temporal de **Microsoft Edge 156.0.4314.42**, motor Chromium. No se usó el perfil personal.
- Prueba de integración aprobada: carga del service worker, falsificación del antiguo mensaje sin desactivar el guard, bloqueo de window.open, enlace target blank, Ctrl + clic permitido, panel con estado real y excepción de dominio aplicada tras recargar.
- Capturas `imagenes/panel-real.png` y `imagenes/pagina-real.png` obtenidas con la extensión real y una página local de prueba. El panel se abrió en una pestaña de extensión y se seleccionó explícitamente la pestaña fuente mediante su identificador real. No se simularon contadores ni APIs para estas capturas.

## Pendientes manuales

- Probar en Google Chrome con y sin uBlock Origin Lite. Edge no sustituye esta comprobación.
- Probar el popup desde el botón de la barra del navegador, reinicio completo de Chrome, formularios, navegación compleja de acceso/pago, iframes y sitios de uso habitual.
- Probar incógnito cuando se habilite y los límites del regreso opcional.
- Ko-fi configurado: la prueba verifica el enlace público, que se abre en otra pestaña y sin acceso a window.opener. La navegación externa se sirve con una respuesta de prueba para no depender de la red; la página pública se comprobó por separado en el navegador. No se realiza ningún pago.

La política por documento requiere recargar para aplicar todos los ajustes. La instalación de scripts es asíncrona y no garantiza ejecutarse antes que todos los scripts del sitio. Los contadores son orientativos y no prueban que una apertura sea publicidad.

La versión 1.1.4 se comprobó con inglés por defecto, cambio a español y persistencia al volver a abrir el panel, además de las pruebas de aperturas y del enlace de Ko-fi. El símbolo de Ko-fi se sirve desde un archivo local del paquete y corresponde al recurso oficial, sin scripts externos.
