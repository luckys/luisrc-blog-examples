# Token bucket: limitar solicitudes por tenant sin confundir ráfagas y concurrencia

Artículo: [rate-limiting-token-bucket-tenant](https://luisrc.pages.dev/posts/rate-limiting-token-bucket-tenant/). Borrador: la página no estará publicada hasta su aprobación.

## Archivos y ejecución

- [packages/api-threats/admission.mjs](../../../packages/api-threats/admission.mjs)
- [packages/api-threats/README.md](../../../packages/api-threats/README.md)

Desde la raíz: `cd packages/api-threats`. Sigue su README para los requisitos y las pruebas. El laboratorio es compartido por varios posts; no se duplica el código por capítulo.
