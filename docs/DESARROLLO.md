# Desarrollo y mantenimiento de Stay Here

Esta guía reúne la información técnica y de publicación para quien mantiene el proyecto. Para instalar y utilizar la extensión, consulta el [README](../README.md).

## Estructura

```text
extension/          Código que Chrome carga como extensión
  icons/           Iconos incluidos en la extensión
tests/              Pruebas automatizadas y comprobación en navegador
scripts/            Validación, revisión preventiva y empaquetado
docs/               Documentación del proyecto
  imagenes/         Logo, capturas y material visual
  publicacion/      Ficha y lista de preparación para Chrome Web Store
.github/            Comprobaciones de GitHub, propiedad y apoyo
README.md           Presentación e instrucciones de uso
LICENSE             Licencia MIT
```

La carpeta oculta `.git` guarda el historial, las ramas y las etiquetas del repositorio local. No forma parte del paquete de la extensión. Los archivos `.gitignore` y `.gitattributes` controlan las exclusiones y el tratamiento de archivos en Git.

Las versiones del código se identifican con etiquetas de Git, como `v1.1.1`. No se duplican versiones completas dentro de la raíz del repositorio. Las copias históricas locales se mantienen fuera de esta carpeta.

## Comprobaciones

Ejecuta desde la raíz:

```sh
node scripts/validate.cjs
node scripts/check-secrets.cjs
node --test tests/protection.test.cjs
```

La validación comprueba el manifiesto, los iconos, la sintaxis y las referencias a archivos locales. La revisión preventiva busca formatos conocidos de credenciales en los archivos versionados; no garantiza detectar cualquier dato sensible.

La prueba opcional `tests/extension-smoke.cjs` requiere Playwright y un navegador compatible con carga de extensiones por línea de comandos. Usa un perfil temporal independiente. Indica el ejecutable mediante `STAYHERE_BROWSER` si es necesario. Comprueba también la extensión manualmente en Chrome y con las otras extensiones que quieras utilizar. Los resultados y límites de la validación están en [PRUEBAS.md](PRUEBAS.md).

## Arquitectura y límites técnicos

El service worker instala la protección de scripts con `chrome.scripting` en el identificador exacto del documento. Las opciones quedan en una clausura privada hasta recargar; los mensajes públicos de la página no pueden cambiarlas. Los informes de bloqueos de la página son orientativos y no conceden permisos ni modifican ajustes.

La instalación es asíncrona después de consultar las preferencias y puede ocurrir después de scripts del sitio. El cierre de pestañas desde el service worker ofrece una defensa adicional, pero no garantiza aislar una página hostil. Al cambiar ajustes se deben recargar las páginas abiertas.

## Generar el paquete

En PowerShell, desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

El script obtiene la versión desde `extension/manifest.json` y crea el ZIP en `dist/`. Incluye los archivos de `extension/` y la licencia de la raíz; deja el manifiesto en la raíz del ZIP. Excluye pruebas, documentación de desarrollo, imágenes promocionales y `.git`.

## Preparar Chrome Web Store

Los materiales de publicación están separados del código:

- [Ficha y descripciones](publicacion/FICHA.txt).
- [Lista de preparación](publicacion/PENDIENTES.txt): controles del mantenedor antes de enviar a revisión; no son pasos para instalar o usar la extensión.
- [Captura para la ficha](imagenes/captura-1280x800.png).

La política incluida en `extension/privacy.html` debe coincidir con `docs/privacy.html`. Antes del envío, esta última debe alojarse en una URL pública accesible sin iniciar sesión. Un repositorio privado no la publica automáticamente. No hay enlace de instalación de Chrome Web Store hasta que la extensión esté aprobada y publicada.

## Ko-fi y datos privados

`extension/support-config.js` contiene solo el enlace público del creador. `.github/FUNDING.yml` configura el destino de Sponsor. No se necesitan claves ni datos de pago en el código.

Las conversaciones, credenciales y perfiles personales deben quedar fuera del repositorio. Consulta [Repositorio y privacidad](REPOSITORIO_Y_PRIVACIDAD.md) y la [política de seguridad](../.github/SECURITY.md).
