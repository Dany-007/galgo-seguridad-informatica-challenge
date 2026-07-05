# GALO · Laboratorio de manejo seguro de información de clientes

Solución funcional al *Challenge de Seguridad Informática*: ingesta de datos de clientes desde un
proveedor externo, almacenamiento cifrado en una base de datos relacional y exposición controlada
de esa información a distintos equipos/aplicaciones consumidoras, vía una API con autenticación,
autorización por roles, enmascaramiento de datos sensibles y auditoría.

> Ver también [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md), [`docs/AMENAZAS.md`](docs/AMENAZAS.md)
> y [`docs/MATRIZ_RIESGOS.md`](docs/MATRIZ_RIESGOS.md) para el detalle de diseño y análisis de riesgo,
> y el informe Word entregable con las evidencias.

## Stack técnico

- **Lenguaje:** TypeScript (Node.js 22)
- **API:** Express 4 + Helmet + CORS + rate limiting + Zod (validación de entrada)
- **Base de datos:** PostgreSQL 16 (relacional) vía Prisma ORM (queries parametrizadas por diseño)
- **Cifrado de campos sensibles:** AES-256-GCM a nivel de aplicación (envelope encryption simulada)
- **Autenticación:** JWT (usuarios humanos) + API Key (consumo servicio-a-servicio)
- **Contraseñas:** Argon2id
- **TLS:** nginx como reverse proxy / terminador TLS con certificado (autofirmado en este lab local)
- **Contenedores:** Docker + Docker Compose
- **Documentación de API:** OpenAPI 3 + Swagger UI (`/docs`)
- **Logs:** Pino, con redacción de campos sensibles

## Por qué este stack (resumen, detalle en el informe)

- **TypeScript**: tipado estático reduce errores de manejo de datos sensibles en tiempo de
  compilación y es la opción explícitamente valorada con puntaje adicional en el challenge.
- **PostgreSQL**: los datos del proveedor son homogéneos y tabulares (un esquema fijo de atributos
  por cliente); un modelo relacional con tipos y constraints es más seguro/auditable que uno
  documental para este caso de uso, sin perder la capacidad de escalar horizontalmente si el
  volumen creciera.
- **Cifrado a nivel de aplicación en vez de solo "cifrado de disco"**: si un atacante obtiene un
  volcado (`pg_dump`) o acceso directo a los archivos de datos, los campos sensibles siguen
  cifrados. El cifrado de disco (o `pgcrypto`/TDE) es complementario, no sustituto.

## Estructura del proyecto

```
src/
  config/       # Carga y validación de variables de entorno, logger
  crypto/       # Cifrado de campos (AES-256-GCM), hashing/mascarado de PAN
  auth/         # JWT, hashing de contraseñas (Argon2)
  middleware/   # Autenticación, RBAC, rate limiting, validación, manejo de errores
  ingestion/    # Cliente del proveedor externo, validación de esquema, upsert cifrado
  routes/       # Endpoints HTTP (auth, usuarios, ingestion, health)
  services/     # Lógica de negocio (usuarios, auditoría)
  jobs/         # Scheduler de ingesta periódica (cron)
  seed/         # Alta de usuarios administrativos iniciales y API key de servicio
public/         # Dashboard estático de consumo (ejemplo de "app de otro equipo")
docker/         # Dockerfile, configuración nginx, certificados TLS (generados, no versionados)
prisma/         # Esquema de datos y migraciones
docs/           # Arquitectura, amenazas (STRIDE), matriz de riesgos, evidencias (png)
scripts/        # Utilidades (generación de certificados TLS)
```

## Requisitos previos

- Docker Desktop (o Docker Engine + Compose v2) — **es lo único obligatorio** para correr el laboratorio.
- Node.js 22+ y npm — solo necesarios si se quiere ejecutar en modo desarrollo fuera de Docker.
- OpenSSL — para generar el certificado TLS local (incluido en Git Bash / WSL / Linux).

## Puesta en marcha (Docker — recomendado)

1. **Clonar/copiar el proyecto** y ubicarse en la carpeta raíz.

2. **Crear el archivo `.env`** a partir de la plantilla y completar los secretos:

   ```bash
   cp .env.example .env
   ```

   Reemplazar como mínimo:
   - `POSTGRES_PASSWORD` (contraseña fuerte)
   - `JWT_SECRET` → generar con `openssl rand -hex 64`
   - `MASTER_KEK_BASE64` → generar con `openssl rand -base64 32`
   - `SEED_ADMIN_PASSWORD`, `SEED_ANALYST_PASSWORD`, `SEED_VIEWER_PASSWORD` (contraseñas fuertes)

3. **Generar el certificado TLS local** (autofirmado, solo para desarrollo):

   ```bash
   bash scripts/generate-certs.sh
   ```

4. **Levantar la base de datos y la API:**

   ```bash
   docker compose up -d --build
   ```

5. **Aplicar migraciones y crear los usuarios/roles iniciales + API key de servicio:**

   ```bash
   docker compose run --rm seed
   ```

   Esto imprime en consola la API key de servicio (solo se muestra una vez, se guarda hasheada en BD).

6. **Ejecutar la primera ingesta de datos del proveedor externo:**

   ```bash
   docker compose run --rm ingest
   ```

   (La ingesta también corre automáticamente cada 30 minutos vía el scheduler interno del contenedor `api`,
   configurable con `INGESTION_CRON`, y puede dispararse on-demand vía `POST /api/v1/ingestion/run`.)

7. **Acceder a la aplicación:**

   - Dashboard: https://localhost:8443/  (el navegador mostrará advertencia de certificado autofirmado, es esperado en este lab local)
   - Documentación interactiva de la API: https://localhost:8443/docs
   - Health check: https://localhost:8443/health

   Usuarios de prueba (los definidos en `.env`): `admin`, `analyst`, `viewer`.

## Apagar el laboratorio

```bash
docker compose down          # detiene los contenedores, conserva los datos (volumen pgdata)
docker compose down -v       # detiene y elimina también los datos persistidos
```

## Modo desarrollo (sin Docker para la API)

```bash
npm install
npx prisma generate
npx prisma migrate dev   # requiere un Postgres accesible en localhost, ver docker-compose.override ejemplo
npm run seed:users
npm run ingest
npm run dev               # http://localhost:3000 (sin TLS; en dev no pasa por nginx)
```

## Pruebas rápidas con curl

```bash
# Login
curl -sk -X POST https://localhost:8443/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<password del .env>"}'

# Listado (con el token recibido)
curl -sk https://localhost:8443/api/v1/usuarios?page=1&pageSize=5 \
  -H "Authorization: Bearer <TOKEN>"

# Revelar datos sensibles (solo admin, requiere motivo, queda auditado)
curl -sk -X POST https://localhost:8443/api/v1/usuarios/1/reveal \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Validacion de calidad de datos solicitada por Auditoria"}'
```

## Pruebas automatizadas

```bash
npm test   # vitest: cifrado AES-256-GCM (roundtrip, integridad AEAD), hashing y enmascarado de PAN
```

## Evidencias (docs/evidencias/)

Las capturas en `docs/evidencias/` fueron generadas ejecutando el laboratorio real levantado con
`docker compose` (no son mockups). Se generaron con Puppeteer (`scripts/capture-evidence.js`,
`scripts/capture-ratelimit-evidence.js`, `scripts/capture-vitest-evidence.js`), un dev-tool opcional
que no forma parte del runtime de la aplicación:

```bash
npm install --no-save puppeteer
node scripts/capture-evidence.js
```

## Supuestos y decisiones (resumen; detalle completo en el informe)

- El proveedor externo (`mockapi.io`) no ofrece autenticación ni TLS mutuo; se asumió que la
  confidencialidad del canal la entrega HTTPS estándar del proveedor y que la validación de
  esquema en la ingesta es el control principal contra datos maliciosos/corruptos de origen.
- Se asumió que "distintos equipos y aplicaciones" consumen la información vía API REST (JSON),
  no acceso directo a la base de datos — el acceso directo a Postgres está deshabilitado desde
  fuera de la red interna de Docker.
- Este es un laboratorio **local**, no un despliegue productivo: el certificado TLS es autofirmado,
  no hay HSM/KMS gestionado ni alta disponibilidad real. `docs/ARQUITECTURA.md` documenta cómo
  evolucionar cada uno de estos puntos a un entorno productivo (cloud o on-prem).
- Los campos `foto_dni`, `avatar`, `auto*`, `color_favorito` se tratan como no sensibles (datos de
  perfil/demo del proveedor). `credit_card_num`, `credit_card_ccv`, `cuenta_numero`, `geo_latitud`,
  `geo_longitud` e `ip` se tratan como sensibles y se cifran en reposo.

## Problemas encontrados y solución (bitácora)

Ver `docs/ARQUITECTURA.md` sección "Bitácora de problemas" para el detalle con evidencia.
