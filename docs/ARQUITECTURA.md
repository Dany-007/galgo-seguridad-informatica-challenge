# Arquitectura de la solución

## 1. Diagrama de componentes (laboratorio local)

```
                              ┌─────────────────────────────────────────────┐
                              │              Docker network (bridge)         │
                              │              "galo_internal" (aislada)       │
                              │                                               │
  Navegador / Postman ───▶ 8443/TCP  ┌────────────┐      ┌────────────────┐  │
  (equipos consumidores)   (TLS)  ─▶ │   nginx    │ ───▶ │   api (Node)   │  │
                                     │ TLS term.  │ 3000  │  Express + JWT │  │
                                     │ 8080→8443  │      │  RBAC + Zod    │  │
                                     └────────────┘      └───────┬────────┘  │
                                                                  │ 5432     │
                                                                  ▼          │
                                                          ┌────────────────┐ │
                                                          │   PostgreSQL   │ │
                                                          │  (sin puerto   │ │
                                                          │  expuesto al   │ │
                                                          │  host)         │ │
                                                          └────────────────┘ │
                              └───────────────────────────────────────────────┘
                                          ▲
                                          │ HTTPS GET (cron cada 30 min
                                          │ + on-demand /ingestion/run)
                              ┌───────────┴───────────┐
                              │ Proveedor externo      │
                              │ mockapi.io/api/v1/     │
                              │ usuarios               │
                              └────────────────────────┘
```

**Decisión clave de segmentación:** Postgres no publica ningún puerto hacia el host ni hacia
fuera de la red `galo_internal`; solo el contenedor `api` puede alcanzarlo. El único punto de
entrada externo es `nginx:8443` (TLS). Esto reduce la superficie de ataque: aunque la máquina host
esté comprometida, un atacante no puede conectarse directo a la base de datos sin antes comprometer
el contenedor `api` o `nginx`.

## 2. Flujo de datos (secuencia)

1. **Ingesta:** el job programado (o disparado manualmente) hace `GET` al proveedor externo →
   valida cada registro contra un esquema estricto (Zod) → descarta/loguea los registros inválidos →
   cifra los campos sensibles (AES-256-GCM) → hace `upsert` en Postgres por `provider_id`.
2. **Consumo:** un equipo/aplicación se autentica (`/auth/login` con usuario humano, o `X-API-Key`
   para integraciones máquina-a-máquina) → recibe un JWT de corta duración (15 min) → consulta
   `/api/v1/usuarios` y recibe los datos con los campos sensibles **enmascarados**.
3. **Revelación controlada:** si un usuario con rol `admin` necesita el dato completo (ej. soporte
   a un cliente, investigación de fraude), llama `POST /api/v1/usuarios/:id/reveal` con un motivo
   obligatorio → la acción se registra en `audit_log` (quién, cuándo, IP, motivo, resultado) antes
   de responder.

## 3. Modelo de datos y clasificación de la información

| Campo del proveedor | Clasificación | Tratamiento en este lab |
|---|---|---|
| `credit_card_num` | Sensible (PCI DSS - PAN) | Cifrado AES-256-GCM en columna `credit_card_enc`; se expone `credit_card_mask` (`**** **** **** 5169`); `pan_hash` (HMAC-SHA256) permite deduplicar sin exponer el valor |
| `credit_card_ccv` | Sensible (PCI DSS - dato sensible de autenticación) | Cifrado; **nunca** se expone enmascarado ni en listados, solo accesible vía `/reveal` auditado. En un entorno productivo real, CVV **no debería almacenarse** una vez completada la autorización (requisito PCI DSS 3.2); aquí se conserva cifrado únicamente para fines del ejercicio |
| `cuenta_numero` | Sensible (financiero) | Cifrado; se expone versión enmascarada |
| `geo_latitud` / `geo_longitud` | Sensible (dato de geolocalización / posible dato personal) | Cifrado; no se expone en listados, solo en `/reveal` |
| `ip` | Sensible (dato personal bajo LGPD/GDPR) | Cifrado; no se expone en listados |
| `user_name`, `direccion`, `codigo_zip`, `fec_alta`, `fec_birthday`, `auto*`, `color_favorito`, `foto_dni`, `avatar`, `cantidad_compras_realizadas` | No sensible / dato de perfil | Texto plano, consultable libremente por cualquier rol autenticado |

## 4. Cifrado: diseño y justificación

- **Dónde:** a nivel de aplicación (antes de que el dato llegue a Prisma/Postgres), no solo a nivel
  de disco. Así el dato sigue protegido ante un `pg_dump`, una copia de los archivos de datos, o un
  acceso indebido al motor de base de datos con privilegios elevados.
- **Algoritmo:** AES-256-GCM (AEAD): entrega confidencialidad **e** integridad/autenticidad —
  cualquier manipulación del ciphertext hace fallar el descifrado, en vez de devolver basura
  silenciosamente.
- **IV:** aleatorio de 12 bytes por operación, nunca reutilizado (requisito de seguridad de GCM).
- **Formato almacenado:** `iv (12B) || authTag (16B) || ciphertext`, todo en una columna `bytea`.
- **Gestión de claves (KEK):** la clave maestra (`MASTER_KEK_BASE64`) vive solo en variables de
  entorno / secret del contenedor, nunca en el código ni en la base de datos. Este es el punto que
  en el informe original quedaba solo como "se recomienda AWS KMS"; aquí se implementó el patrón de
  *envelope encryption* de forma funcional, simulando localmente lo que en producción haría un KMS.

### Evolución a KMS gestionado (siguiente paso hacia producción)

En este lab, la KEK cifra directamente cada campo. En un entorno productivo se recomienda:
1. Generar una **Data Encryption Key (DEK)** por tabla o por lote de registros.
2. Cifrar cada campo con la DEK (más rápido, no requiere llamar al KMS por cada operación).
3. Cifrar la DEK con la KEK gestionada en AWS KMS / GCP Cloud KMS / Azure Key Vault / HashiCorp Vault.
4. Rotar la KEK periódicamente sin tener que re-cifrar todos los datos (solo se re-envuelve la DEK).

## 5. Autenticación, autorización y consumo por distintos equipos

- **Humanos (dashboard, exploración manual, Swagger):** JWT firmado con `HS256`, expiración corta
  (15 minutos), emitido tras validar usuario/contraseña (Argon2id). Roles: `admin`, `analyst`, `viewer`.
- **Aplicaciones/otros equipos (integraciones servicio-a-servicio):** `X-API-Key`, almacenada
  hasheada (SHA-256) en base de datos — el valor en claro solo se muestra una vez al crearla.
  Rol dedicado `service`, sin acceso a `/reveal`.
- **RBAC:** matriz de permisos aplicada por middleware (`requireRole`), no por convención en el
  código de cada handler:

  | Acción | admin | analyst | viewer | service |
  |---|---|---|---|---|
  | Listar/ver clientes (enmascarado) | ✅ | ✅ | ✅ | ✅ |
  | Revelar datos sensibles en claro | ✅ | ❌ | ❌ | ❌ |
  | Disparar ingesta manual | ✅ | ❌ | ❌ | ✅ |
  | Ver estado de ingesta | ✅ | ✅ | ❌ | ✅ |

## 6. Controles de seguridad transversales implementados

- **Transporte:** TLS 1.2/1.3 en nginx (HTTP en 8080 solo redirige a HTTPS, nunca sirve contenido).
- **Cabeceras HTTP:** Helmet (HSTS, `X-Content-Type-Options`, CSP restrictiva, sin `X-Powered-By`).
- **CORS:** lista blanca explícita de orígenes permitidos (no `*`).
- **Rate limiting:** general (120 req/min), estricto en login (10/15min) y en `/reveal` (20/hora).
- **Validación de entrada:** Zod en *todos* los endpoints (body/query/params) — nunca se confía en
  el request crudo (mitiga inyección, payloads malformados, mass assignment).
- **Acceso a datos:** Prisma genera *siempre* consultas parametrizadas → no hay superficie para
  inyección SQL vía concatenación de strings.
- **Logs:** Pino con redacción explícita de contraseñas, tokens y campos sensibles — los logs nunca
  contienen PAN, CCV ni credenciales en claro.
- **Auditoría:** tabla `audit_log` append-only para login, listados, revelaciones e ingesta manual.
- **Contenedores:** imagen `runtime` corre como usuario no-root (`galo`), build multi-stage (no
  quedan herramientas de compilación ni el código fuente TypeScript en la imagen final), healthchecks
  en `api` y `postgres`.
- **Secretos:** `.env` fuera de control de versiones (`.gitignore`), plantilla `.env.example` sin
  valores reales, contraseñas y claves generadas con `openssl rand` (alta entropía).
- **Segmentación de red:** Postgres solo accesible dentro de la red interna de Docker.

## 7. Diferencias con el informe original (2022) y motivo del cambio

| Informe original | Ajuste en esta actualización | Motivo |
|---|---|---|
| Lenguaje Python/Django, sin repo real (`github.com/prueba/test.git`) | TypeScript + Express, repositorio funcional local con código real y probado | El challenge otorga puntaje adicional explícito por TypeScript; el equipo solo había documentado la parte teórica, sin entregable funcional |
| Arquitectura basada 100% en servicios gestionados de AWS (ELB, CloudFront, Shield/WAF, Inspector) sin nada desplegado | Arquitectura equivalente pero **funcional en Docker Compose local**, con nota explícita de cómo mapear cada control a su equivalente cloud | El objetivo del challenge es entregar "una aplicación funcional"; una arquitectura solo documental no demuestra los controles en funcionamiento |
| Se menciona cifrado "recomendado" (SHA256/AES/DES/RSA mezclados, sin implementar) | Cifrado de campos sensibles **implementado y verificado** (AES-256-GCM, envelope encryption), con hash de PAN aparte para deduplicación | El informe original confundía hashing (SHA256) con cifrado, y no se había implementado nada; se corrige el criterio técnico y se implementa |
| CCV se contemplaba almacenar cifrado sin más análisis | Se documenta explícitamente que en producción real el CCV no debería persistirse tras la autorización (PCI DSS 3.2); se mantiene cifrado solo por alcance del ejercicio | Alinear el informe con el requisito PCI DSS real en vez de solo cifrar todo por igual |
| No había control de acceso a la API (era Django Admin abierto a "todo el mundo" según el propio informe: *"Account es disponible para todo el mundo"*) | Autenticación obligatoria (JWT/API Key) + RBAC en todos los endpoints de datos, sin excepción | Ese hallazgo del informe original es en sí mismo una vulnerabilidad crítica (control de acceso roto / OWASP A01); se corrige de raíz |
| Matriz de riesgos genérica, sin controles verificables | Matriz de riesgos actualizada (`docs/MATRIZ_RIESGOS.md`) que distingue controles ya implementados y verificados vs. recomendados para un entorno productivo | Consistencia entre lo que se documenta y lo que realmente se puede demostrar en el laboratorio |

## 8. Bitácora de problemas

| Problema | Causa | Solución aplicada |
|---|---|---|
| `npm audit` reportaba una vulnerabilidad **crítica** en `vitest`/`vite` (dependencias de testing) y una **moderada** en `node-cron` (vía `uuid`) | Versiones desactualizadas fijadas en el `package.json` inicial | Se actualizó `vitest` a la rama 3.x y `node-cron` a 4.x; `npm audit` quedó en 0 vulnerabilidades. Ver evidencia `docs/evidencias/npm-audit-0-vulns.png` |
| `openssl req -subj` fallaba en Git Bash (Windows) por conversión automática de rutas MSYS, interpretando `/C=CL/O=...` como una ruta de archivo | Comportamiento de MSYS2/Git-Bash que reescribe argumentos que empiezan con `/` | Se antepuso `MSYS_NO_PATHCONV=1` a la invocación de `openssl` en `scripts/generate-certs.sh` |
| Prisma Client fallaba (o fallaría) dentro del contenedor Alpine por no incluir el *binary target* de OpenSSL 3 de musl | La imagen `node:22-alpine` usa musl libc + OpenSSL 3, distinto al motor "native" generado en el host | Se agregó `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` en `prisma/schema.prisma` |
| Se necesitaba generar la migración inicial de Prisma sin exponer Postgres permanentemente al host | Buenas prácticas de segmentación de red vs. necesidad puntual de tooling | Se expuso el puerto 5432 solo temporalmente durante la generación de la migración inicial, y se removió después (ver `docker-compose.yml` final, sin `ports` en `postgres`) |
