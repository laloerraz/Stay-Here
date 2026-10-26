# Código público y datos privados

En un repositorio público, todo el código, la documentación y el historial publicado son visibles. GitHub no permite ocultar archivos individuales a ciertos visitantes de un mismo repositorio público.

`extension/content.js`, las pruebas y `docs/PRUEBAS.md` contienen funcionamiento y documentación del producto. No contienen los datos de navegación de los usuarios ni credenciales de pagos. El código de una extensión distribuida también puede ser inspeccionado por quien la instala.

La integración con Ko-fi incluye únicamente el enlace público `https://ko-fi.com/laloerraz`. El navegador abre esa página al pulsar el botón; la extensión no incluye claves de Ko-fi, datos bancarios, contraseñas ni un procesador de tarjetas. No envía a Ko-fi el historial de navegación ni el dominio que se está protegiendo.

Las conversaciones, copias históricas y archivos locales se guardan fuera de la carpeta del repositorio. `.gitignore` excluye además credenciales y carpetas privadas conocidas. Ignorar un archivo no lo retira de commits anteriores: si se publicó un secreto, debe revocarse y revisarse el historial.

La comprobación preventiva busca formatos conocidos de credenciales en archivos versionados. No sustituye una revisión del contenido ni garantiza detectar todos los secretos posibles. Los commits nuevos utilizan el correo de privacidad de GitHub.
