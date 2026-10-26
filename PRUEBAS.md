# Verificación de Stay Here 1.1.0

Comprobada el 26 de octubre de 2026.

- 32 pruebas automatizadas aprobadas con `node --test tests/protection.test.cjs`. Usan el código real con APIs de Chrome simuladas e incluyen falsificación de políticas, inyección por documento, reinicio del worker, pausa/excepciones y cierres de pestañas.
- Archivos JavaScript del producto comprobados con `node --check`.
- Extensión instalada mediante Playwright en un perfil temporal de **Microsoft Edge 156.0.4314.42**, motor Chromium. No se usó el perfil personal.
- Prueba de integración aprobada: carga del service worker, falsificación del antiguo mensaje sin desactivar el guard, bloqueo de window.open, enlace target blank, Ctrl + clic permitido, panel con estado real y excepción de dominio aplicada tras recargar.
- Capturas `store/panel-real.png` y `store/pagina-real.png` obtenidas con la extensión real y una página local de prueba. El panel se abrió en una pestaña de extensión y se seleccionó explícitamente la pestaña fuente mediante su identificador real. No se simularon contadores ni APIs para estas capturas.

## Pendientes manuales

- Probar en Google Chrome con y sin uBlock Origin Lite. Edge no sustituye esta comprobación.
- Probar el popup desde el botón de la barra del navegador, reinicio completo de Chrome, formularios, navegación compleja de acceso/pago, iframes y sitios de uso habitual.
- Probar incógnito cuando se habilite y los límites del regreso opcional.
- Ko-fi permanece sin configurar. La prueba verifica que el enlace está oculto; no se ha probado un pago.

La política por documento requiere recargar para aplicar todos los ajustes. La instalación de scripts es asíncrona y no garantiza ejecutarse antes que todos los scripts del sitio. Los contadores son orientativos y no prueban que una apertura sea publicidad.
