# Propuestas y mantenimiento

El propietario y mantenedor del proyecto es [laloerraz](https://github.com/laloerraz).

Puedes comunicar errores o sugerencias en Issues. El mantenimiento y los commits los realiza el propietario. No se incorporan colaboradores con acceso de escritura de forma automática.

Antes de incorporar código externo, revisa su procedencia y licencia. Conserva las atribuciones exigidas por las licencias aplicables.

Para verificar una modificación, ejecuta `node --test tests/protection.test.cjs`, comprueba la extensión instalada y vuelve a generar el paquete. Nunca incluyas perfiles de navegador, tokens, archivos `.env` ni claves privadas en el repositorio.
