# Stay Here

<p align="center"><img src="docs/imagenes/stay-here-logo.png" width="144" alt="Stay Here: mano abierta sobre un círculo celeste"></p>

Extensión gratuita para Chrome que ayuda a frenar ventanas y pestañas emergentes, con controles sencillos y excepciones por sitio. Puede utilizarse junto a uBlock Origin Lite.

Mantenido por [laloerraz](https://github.com/laloerraz) · [Licencia MIT](LICENSE)

## Instalación manual

La publicación en Chrome Web Store está pendiente. Para probarla desde el código:

1. Descarga el repositorio desde **Code → Download ZIP** y extrae el archivo, o clónalo con Git.
2. Abre `chrome://extensions` y activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta **`extension`**, que contiene `manifest.json`.
4. Recarga las páginas que ya estaban abiertas. Puedes fijar el icono de Stay Here en la barra del navegador.

Si utilizas un ZIP de distribución de la extensión, extráelo y selecciona directamente la carpeta que contiene `manifest.json`.

## Uso

- **Protección global:** activa o pausa la protección desde el interruptor del panel.
- **Permitir este sitio:** añade una excepción para el dominio actual. Los subdominios se gestionan por separado.
- **Permitir enlaces a otra pestaña:** deja abrir los enlaces que pulses, manteniendo el bloqueo de aperturas por scripts.
- **Abrir un enlace deliberadamente:** usa Ctrl + clic —Cmd + clic en Mac—, botón central o el menú contextual.
- **Volver tras una redirección automática:** opción desactivada inicialmente que intenta regresar ante ciertas redirecciones entre dominios.

Después de cambiar opciones o excepciones, recarga las páginas abiertas para aplicar todos los cambios. El panel incluye un botón para recargar la página actual.

![Panel de Stay Here durante una prueba local](docs/imagenes/panel-real.png)

## Límites

El bloqueo puede afectar ventanas legítimas de acceso, pago o reproducción. Si ocurre, permite el sitio y recarga. Una pestaña emergente puede aparecer brevemente antes de cerrarse.

Stay Here no elimina todos los anuncios ni garantiza detener toda apertura o redirección. El regreso opcional puede recargar formularios o reproducción y afectar inicios de sesión. Los contadores son orientativos.

No funciona en páginas internas del navegador ni en Chrome Web Store. Para usarla en incógnito debes habilitarla expresamente. Si la desinstalas, recarga las páginas abiertas para retirar la protección ya instalada.

## Privacidad

La protección funciona en tu navegador, sin servidores propios, analítica ni anuncios. Las preferencias se guardan localmente; las direcciones y los estados temporales de pestañas se procesan durante la sesión y no se envían al desarrollador.

Consulta la [política de privacidad y explicación de permisos](docs/privacy.html).

## Apoya el desarrollo

Todas las funciones son gratuitas. Puedes [apoyar Stay Here en Ko-fi](https://ko-fi.com/laloerraz) desde el panel de la extensión o desde **Sponsor** en GitHub. El aporte es voluntario y el pago se realiza en Ko-fi; la extensión no recibe datos de tu tarjeta.

## Pruebas y desarrollo

Desde la raíz del repositorio:

```sh
node --test tests/protection.test.cjs
```

La [guía de desarrollo](docs/DESARROLLO.md) explica la estructura, las comprobaciones y cómo generar el paquete. También puedes consultar los [resultados de pruebas](docs/PRUEBAS.md) y el [historial de cambios](docs/CHANGELOG.md).
