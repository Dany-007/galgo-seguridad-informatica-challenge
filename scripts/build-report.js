/* Genera el informe Word de la solucion (entregable final del challenge). */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ImageRun, AlignmentType, PageBreak, TableOfContents,
  ShadingType, PageOrientation,
} = require("docx");

const EV = (n) => path.join(__dirname, "..", "docs", "evidencias", n);
const img = (file) => fs.readFileSync(EV(file));
const dim = (file) => {
  const buf = img(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};

function scaledImage(file, maxWidth = 580) {
  const { width, height } = dim(file);
  const w = Math.min(maxWidth, width);
  const h = Math.round((w / width) * height);
  return new ImageRun({ type: "png", data: img(file), transformation: { width: w, height: h } });
}

function figure(file, caption, maxWidth = 580) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 }, children: [scaledImage(file, maxWidth)] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: caption, italics: true, size: 19, color: "555555" })],
    }),
  ];
}

function h1(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } }); }
function h2(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } }); }
function h3(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 100 } }); }
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, ...opts })] });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}
function code(text) {
  return new Paragraph({
    spacing: { after: 160 },
    shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
    children: [new TextRun({ text, font: "Consolas", size: 18 })],
  });
}

function cell(text, { width, bold = false, header = false, size = 18 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "1F2937" } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text), bold: bold || header, size, color: header ? "FFFFFF" : "000000" })],
      }),
    ],
  });
}

function row(cells) { return new TableRow({ children: cells }); }

function simpleTable(widths, headerRow, dataRows) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      row(headerRow.map((t, i) => cell(t, { width: widths[i], header: true }))),
      ...dataRows.map((r) => row(r.map((t, i) => cell(t, { width: widths[i] })))),
    ],
  });
}

const PORTRAIT_MARGINS = { top: 1000, bottom: 1000, left: 1100, right: 1100 };
const LANDSCAPE_PAGE = {
  size: { width: 16838, height: 11906 }, // A4 landscape en twips
  margin: PORTRAIT_MARGINS,
  orientation: PageOrientation.LANDSCAPE,
};
const PORTRAIT_PAGE = {
  size: { width: 11906, height: 16838 }, // A4 portrait
  margin: PORTRAIT_MARGINS,
};

// ---------------------------------------------------------------------------------------------
// SECCION A (portrait): portada, contexto, objetivo, TOC, entregables, arquitectura local
// ---------------------------------------------------------------------------------------------
const sectionA = {
  properties: { page: PORTRAIT_PAGE },
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Challenge — Seguridad Informática", bold: true, size: 22, color: "1F2937" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "Manejo de información de clientes de un proveedor externo", bold: true, size: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: "Ingesta, almacenamiento cifrado y consumo seguro de datos — solución funcional", italics: true, size: 24, color: "444444" })],
    }),

    p("Resumen de la solución entregada:"),
    bullet("Aplicación funcional en TypeScript (Node.js 22)."),
    bullet("Ingesta real y periódica del endpoint del proveedor externo, con validación estricta de esquema."),
    bullet("Almacenamiento en PostgreSQL con cifrado de campos sensibles a nivel de aplicación (AES-256-GCM)."),
    bullet("API REST con autenticación (JWT/API Key), autorización por roles (RBAC), rate limiting, TLS y auditoría."),
    bullet("Dashboard de consumo de ejemplo (para otros equipos/aplicaciones) y documentación OpenAPI/Swagger."),
    bullet("Todo containerizado con Docker Compose, ejecutado y verificado en un ambiente de laboratorio (evidencia incluida)."),
    bullet("Arquitectura de evolución a un entorno productivo en la nube (AWS), con firewall, IAM, WAF/Shield y alta disponibilidad."),
    bullet("Marco normativo de referencia: PCI DSS, ISO/IEC 27001, NIST y OWASP."),
    bullet("Modelado de amenazas STRIDE y matriz de riesgos con controles verificados."),

    new Paragraph({ children: [new PageBreak()] }),
    h1("Tabla de contenidos"),
    new TableOfContents("Tabla de contenidos", { hyperlink: true, headingStyleRange: "1-2" }),
    p("(Word: clic derecho sobre la tabla > Actualizar campo > Actualizar toda la tabla, para generar la paginación)", { italics: true, size: 18, color: "777777" }),

    new Paragraph({ children: [new PageBreak()] }),
    h1("Contexto"),
    p(
      "El equipo de Seguridad Informática, con el que se interactúa en este challenge, se encarga de velar por " +
      "la seguridad de la información de todos los procesos de la compañía. Por ello están alineados a las " +
      "mejores prácticas y/o a estándares de seguridad como PCI DSS, NIST, ISO/IEC 27001, LGPD, etc. El equipo " +
      "es auditado anualmente por entes reguladores para evaluar el cumplimiento de los requerimientos de " +
      "seguridad y el correcto tratamiento de datos sensibles. Se asigna un proyecto en el cual se debe obtener, " +
      "desde un proveedor externo, información de clientes, garantizando que esté asegurada en todos sus estados " +
      "y disponibilizando recursos para que sea accesible por los distintos sectores de la empresa."
    ),
    h1("Objetivo"),
    p(
      "Realizar un análisis de cómo consumir y almacenar de forma segura estos datos en una base relacional o " +
      "no relacional, y disponibilizar esa información para que distintos equipos y aplicaciones de la empresa " +
      "puedan consumirla, considerando cada uno de los atributos entregados por el proveedor. Se implementan " +
      "los controles necesarios para asegurar la información, con el tipo de control, la forma de obtención de " +
      "los datos y los consumidores definidos a criterio del equipo desarrollador."
    ),

    new Paragraph({ children: [new PageBreak()] }),
    h1("1. Código fuente de la aplicación"),
    p(
      "El código fuente completo y funcional se encuentra en la carpeta del proyecto (entregada junto a este " +
      "informe):"
    ),
    code("C:\\Users\\ASUS\\Downloads\\Claude-Dany"),
    p(
      "El proyecto está estructurado como un repositorio Git funcional (estructura de carpetas, .gitignore, " +
      "listo para inicializar historial y publicarse en GitHub). Ver la sección “Pendientes y próximos pasos” " +
      "para la definición de la cuenta/organización de destino y del nivel de visibilidad del repositorio."
    ),
    h2("Estructura del proyecto"),
    code(
      "src/            Código fuente TypeScript (config, crypto, auth, middleware, ingestion,\n" +
      "                routes, services, jobs, seed)\n" +
      "prisma/         Esquema de datos y migraciones versionadas\n" +
      "public/         Dashboard estático de consumo (ejemplo de app de otro equipo)\n" +
      "docker/         Dockerfile, configuración nginx, certificados TLS (generados)\n" +
      "docs/           Arquitectura, amenazas (STRIDE), matriz de riesgos, evidencias (png)\n" +
      "scripts/        Generación de certificados TLS y de evidencia\n" +
      "tests/          Pruebas automatizadas (vitest)\n" +
      "docker-compose.yml, openapi.yaml, README.md, .env.example"
    ),

    h1("2. Instrucciones para la ejecución de la aplicación"),
    p("Requisito único obligatorio: Docker Desktop (o Docker Engine + Compose v2). Node.js solo es necesario para desarrollo fuera de contenedores."),
    h2("Pasos"),
    bullet("1. Copiar .env.example a .env y completar los secretos (contraseñas, JWT_SECRET, MASTER_KEK_BASE64 — instrucciones de generación incluidas en el propio archivo)."),
    bullet("2. Generar el certificado TLS local: bash scripts/generate-certs.sh"),
    bullet("3. Levantar la base de datos y la API: docker compose up -d --build"),
    bullet("4. Aplicar migraciones y crear usuarios/roles iniciales + API key de servicio: docker compose run --rm seed"),
    bullet("5. Ejecutar la primera ingesta de datos del proveedor externo: docker compose run --rm ingest"),
    bullet("6. Acceder al dashboard en https://localhost:8443/ y a la documentación interactiva en https://localhost:8443/docs"),
    p("También se incluyen los scripts iniciar-laboratorio.bat y detener-laboratorio.bat para levantar y apagar todo el ambiente con un doble clic. El detalle completo, con todos los comandos y ejemplos curl, está en README.md dentro del proyecto."),

    h1("3. Descripción de la aplicación, supuestos, problemas y soluciones (con evidencia)"),
    h2("3.1 Stack técnico"),
    bullet("Lenguaje: TypeScript (Node.js 22)."),
    bullet("API: Express 4 + Helmet + CORS + rate limiting + Zod (validación de entrada)."),
    bullet("Base de datos: PostgreSQL 16 (relacional) vía Prisma ORM (consultas parametrizadas por diseño)."),
    bullet("Cifrado de campos sensibles: AES-256-GCM a nivel de aplicación (envelope encryption simulada)."),
    bullet("Autenticación: JWT (usuarios humanos) + API Key (consumo servicio-a-servicio)."),
    bullet("Contraseñas: Argon2id."),
    bullet("TLS: nginx como reverse proxy / terminador TLS."),
    bullet("Contenedores: Docker + Docker Compose, imagen runtime con usuario no-root."),
    bullet("Documentación de API: OpenAPI 3 + Swagger UI."),
    bullet("Pruebas automatizadas: Vitest (cifrado, integridad AEAD, hashing y enmascarado)."),

    h2("3.2 Supuestos"),
    bullet("El proveedor externo no ofrece autenticación ni control sobre la calidad de los datos entregados; el control principal contra datos maliciosos/corruptos es la validación de esquema en la ingesta."),
    bullet("“Distintos equipos y aplicaciones” consumen la información vía API REST (JSON); el acceso directo a la base de datos queda deshabilitado desde fuera de la red interna de Docker."),
    bullet("El ambiente entregado es un laboratorio local que reproduce todos los controles funcionales; el certificado TLS es autofirmado y no hay HSM/KMS gestionado ni alta disponibilidad real — la sección 5 describe la arquitectura propuesta para llevar esto a producción."),
    bullet("credit_card_num, credit_card_ccv, cuenta_numero, geo_latitud, geo_longitud e ip se tratan como sensibles y se cifran en reposo; el resto de los atributos se tratan como datos de perfil no sensibles."),

    h2("3.3 Problemas encontrados y solución"),
    simpleTable(
      [2400, 2900, 3200],
      ["Problema", "Causa", "Solución aplicada"],
      [
        ["Docker Desktop no arrancaba (“Inference manager” fallaba al remover un socket)", "Archivo de runtime bloqueado (Error 1920) tras un cierre previo no limpio; Win32 no podía manipular el socket AF_UNIX", "Se limpió la carpeta de runtime de Docker Desktop usando WSL (que sí maneja sockets Unix nativamente) y se reinició la aplicación"],
        ["npm audit reportaba 1 vulnerabilidad crítica (vitest/vite) y 1 moderada (node-cron/uuid)", "Versiones desactualizadas fijadas al iniciar el proyecto", "Se actualizó vitest a la rama 3.x y node-cron a 4.x; auditoría quedó en 0 vulnerabilidades (evidencia incluida)"],
        ["openssl req -subj fallaba en Git Bash (Windows)", "MSYS2 reescribe automáticamente argumentos que inician con \"/\" como si fueran rutas de archivo", "Se antepuso MSYS_NO_PATHCONV=1 a la invocación de openssl en el script de generación de certificados"],
        ["Prisma Client fallaba al iniciar dentro del contenedor Alpine (“no se pudo detectar libssl/openssl”)", "La imagen node:22-alpine no incluye OpenSSL instalado por defecto, y el binary target de Prisma no coincidía con musl+OpenSSL3", "Se agregó el paquete openssl en cada etapa del Dockerfile y se declaró el binaryTarget linux-musl-openssl-3.0.x en el esquema de Prisma"],
        ["El rate limiter de login bloqueaba las pruebas manuales tras varios intentos (HTTP 429)", "Comportamiento esperado del control anti fuerza-bruta implementado, disparado por las propias pruebas repetidas del equipo", "Se documentó como evidencia positiva del control (ver 3.4) y se reinició el contenedor de la API para continuar las pruebas (el límite es en memoria, por proceso)"],
      ]
    ),

    h2("3.4 Evidencia de funcionamiento (capturas del laboratorio real, no mockups)"),
    ...figure("01-dashboard-login.png", "Figura 1. Portal de consumo — pantalla de login (HTTPS, TLS obligatorio en :8443)."),
    ...figure("02-login-error.png", "Figura 2. Intento de login con contraseña incorrecta — mensaje de error genérico (no revela si el usuario existe)."),
    ...figure("03-dashboard-listado-admin.png", "Figura 3. Listado de clientes autenticado como admin — tarjeta y cuenta enmascaradas por defecto."),
    ...figure("04-dashboard-reveal-dialog.png", "Figura 4. Revelación de datos sensibles — exige motivo obligatorio antes de continuar."),
    ...figure("05-dashboard-reveal-resultado.png", "Figura 5. Resultado de la revelación: PAN, CCV, cuenta, geolocalización e IP descifrados en claro, solo tras justificación y con auditoría registrada."),
    ...figure("06-dashboard-listado-viewer-sin-reveal.png", "Figura 6. Mismo listado autenticado como “viewer”: el botón “Revelar” no existe para este rol (RBAC también aplicado en la UI, además del backend)."),
    ...figure("07-swagger-docs.png", "Figura 7. Documentación interactiva de la API (OpenAPI/Swagger) servida por la propia aplicación en /docs."),
    ...figure("08-health-check.png", "Figura 8. Endpoint /health verificando el estado de la API y la conexión a base de datos."),
    ...figure("09-docker-compose-ps.png", "Figura 9. docker compose ps — los tres contenedores (postgres, api, nginx) corriendo y healthy.", 520),
    ...figure("10-npm-audit-0-vulnerabilidades.png", "Figura 10. npm audit tras la actualización de dependencias: 0 vulnerabilidades.", 520),
    ...figure("11-audit-log-postgres.png", "Figura 11. Consulta directa a la tabla audit_log: trazabilidad real de login y revelación de datos.", 520),
    ...figure("12-db-campos-cifrados-bytea.png", "Figura 12. Consulta a la tabla usuarios: las columnas sensibles son bytea (cifradas), no texto plano.", 520),
    ...figure("13-rate-limiting-login.png", "Figura 13. Prueba del rate limiting de login: tras 7 intentos fallidos, la API responde HTTP 429.", 520),
    ...figure("14-vitest-tests-ok.png", "Figura 14. Pruebas automatizadas (Vitest): cifrado, integridad AEAD, hashing y enmascarado, 6/6 exitosas.", 520),

    new Paragraph({ children: [new PageBreak()] }),
    h1("4. Arquitectura de la solución (laboratorio funcional)"),
    ...figure("00-arquitectura-diagrama.png", "Figura 15. Arquitectura del laboratorio: segmentación de red, componentes y flujo de datos.", 620),

    h2("4.1 Funciones de la arquitectura"),
    bullet("nginx: perímetro de entrada único, terminación TLS 1.2/1.3, HSTS, redirección forzada de HTTP a HTTPS, cabeceras de seguridad y rate limiting a nivel de red."),
    bullet("api (Node.js/TypeScript): autenticación (JWT/API Key), autorización por roles (RBAC), validación de entrada (Zod), orquestación de la ingesta, exposición de la API REST y de la documentación OpenAPI."),
    bullet("PostgreSQL: almacenamiento relacional; los campos sensibles se persisten cifrados (AES-256-GCM) a nivel de aplicación; sin puerto publicado hacia el host ni fuera de la red interna de Docker."),
    bullet("Red interna “galo_internal”: segmentación lógica que aísla la base de datos — solo el contenedor api puede alcanzarla."),
    bullet("Ingesta programada: job con node-cron (cada 30 minutos, configurable) más disparo on-demand vía API, ambos reutilizando la misma validación y cifrado."),
    p(
      "Esta arquitectura de laboratorio es funcionalmente equivalente, en sus responsabilidades y controles, a " +
      "la arquitectura propuesta para un entorno productivo en la nube descrita en la sección 5: el nginx local " +
      "cumple el rol de la terminación TLS/WAF perimetral, la red interna de Docker cumple el rol de la " +
      "segmentación de subredes y firewall, y el cifrado de aplicación es el mismo patrón que se robustece con " +
      "un KMS gestionado en producción."
    ),

    h2("4.2 Cifrado de campos sensibles: diseño y justificación"),
    p(
      "El cifrado se aplica a nivel de aplicación (antes de que el dato llegue a la base de datos), no solo a " +
      "nivel de disco, para que el dato siga protegido ante un pg_dump, una copia de los archivos de datos, o " +
      "un acceso indebido al motor de base de datos con privilegios elevados."
    ),
    bullet("Algoritmo: AES-256-GCM (AEAD) — entrega confidencialidad e integridad/autenticidad; cualquier alteración del texto cifrado hace fallar el descifrado (verificado en la prueba automatizada de la Figura 14)."),
    bullet("IV aleatorio de 12 bytes por operación, nunca reutilizado."),
    bullet("Formato almacenado: iv (12B) || authTag (16B) || ciphertext, en una columna bytea."),
    bullet("Gestión de la clave maestra (KEK): vive solo en variables de entorno / secreto del contenedor, nunca en el código ni en la base de datos — patrón de envelope encryption que en producción se sustenta sobre un KMS gestionado (ver sección 5)."),
    bullet("PAN: nunca se almacena en texto plano ni se indexa en claro; se guarda además un HMAC-SHA256 (pan_hash) que permite deduplicar sin exponer ni poder revertir el dato."),

    h2("4.3 Autenticación, autorización y consumo por distintos equipos"),
    p("Matriz de permisos aplicada por middleware en el backend (no solo ocultando botones en la interfaz):"),
    simpleTable(
      [2400, 1400, 1400, 1400, 1400],
      ["Acción", "admin", "analyst", "viewer", "service"],
      [
        ["Listar/ver clientes (enmascarado)", "Sí", "Sí", "Sí", "Sí"],
        ["Revelar datos sensibles en claro", "Sí", "No", "No", "No"],
        ["Disparar ingesta manual", "Sí", "No", "No", "Sí"],
        ["Ver estado de ingesta", "Sí", "Sí", "No", "Sí"],
      ]
    ),

    new Paragraph({ children: [new PageBreak()] }),
    h1("5. Arquitectura propuesta para producción en la nube"),
    p(
      "El laboratorio local demuestra los controles de seguridad funcionando extremo a extremo. Para un entorno " +
      "productivo real, con alta disponibilidad, cumplimiento continuo y capacidad de absorber ataques a gran " +
      "escala, se propone evolucionar la misma arquitectura hacia servicios gestionados en la nube (AWS como " +
      "referencia, aplicable de forma equivalente a otros proveedores cloud)."
    ),
    ...figure("00b-arquitectura-nube-propuesta.png", "Figura 16. Arquitectura propuesta para producción: borde, balanceo multi-AZ, cómputo, datos y capa de seguridad/cumplimiento.", 640),

    h2("5.1 Descripción general"),
    p(
      "La arquitectura está basada en arquitectura Cloud de AWS, desplegada en contenedores EC2 con " +
      "balanceadores de carga Elastic, permitiendo estabilidad bajo demanda de manera rápida y con la " +
      "posibilidad de instanciar en diferentes ubicaciones alrededor del mundo para alcanzar porcentajes muy " +
      "altos en disponibilidad, esto incluyendo la posibilidad de un esquema multi-AZ garantizando disponibilidad " +
      "en varias localizaciones para la base de datos usando una instancia maestra y una instancia esclava en " +
      "modo replicación, permitiendo ejecutar procesos de consultas sin afectar la base de datos maestra."
    ),
    p(
      "El balanceo de carga (ELB) es una solución de balanceo de carga configurable que admite comprobaciones de " +
      "estado en hosts, distribución de tráfico a las instancias EC2 en varias zonas de disponibilidad e " +
      "incorporación y eliminación dinámicas de hosts de Amazon EC2 desde la rotación de balanceo de cargas. " +
      "ELB también puede crecer dinámicamente y reducir la capacidad de balanceo de carga para ajustarse a las " +
      "demandas de tráfico, al mismo tiempo que ofrece un punto de entrada predecible a través de un CNAME " +
      "persistente. ELB también admite sesiones sticky (persistentes) para abordar las necesidades de " +
      "enrutamiento más avanzadas (segmentaciones adicionales)."
    ),
    p(
      "En la nube, la mayoría de los hosts tendrán direcciones IP dinámicas. Aunque cada instancia EC2 puede " +
      "tener entradas de DNS públicas y privadas disponibles a través de Internet, las entradas de DNS y las " +
      "direcciones IP se asignan de forma dinámica al lanzar la instancia; no se pueden asignar manualmente. Las " +
      "direcciones IP estáticas (direcciones IP elásticas en la terminología de AWS) se pueden asignar a " +
      "instancias en ejecución una vez que se hayan lanzado. Deben utilizarse las direcciones IP elásticas para " +
      "las instancias y servicios que requieren puntos de enlace coherentes, como por ejemplo las bases de datos " +
      "maestras, servidores centrales de archivos y balanceadores de carga alojados en EC2."
    ),
    p(
      "La segmentación a nivel de hardware para todos los activos que contienen la información, incluyendo la " +
      "base de datos, ayuda frente a un incidente de seguridad o una caída general. Además del balanceo, se " +
      "propone tener una base de datos también en otro contenedor u otra nube, la cual se puede replicar cada 24 " +
      "horas con el fin de que se sincronice la información y ambas se encuentren bajo la misma integridad. De " +
      "acuerdo con lo anterior, se debe implementar una política de respaldo de la información incremental o " +
      "total."
    ),
    p(
      "Esta es una arquitectura general donde se puede trabajar con varios frameworks para Python, Php, C# " +
      "(como Django, Bottle, .Net Core), adaptadas a contenedores como Docker, Apache, NGINX, e integrada a " +
      "motores de base de datos como MySQL, MongoDB, SQL Server o Kafka. Para esta solución en particular se " +
      "seleccionó TypeScript sobre Node.js con Express, Docker y PostgreSQL, por las razones de tipado estático, " +
      "consultas parametrizadas por diseño (Prisma) y el puntaje adicional que otorga el challenge a esta " +
      "elección, pero la arquitectura propuesta es igualmente válida con cualquiera de los stacks alternativos " +
      "mencionados."
    ),

    h2("5.2 Componentes y responsabilidades"),
    bullet("Route 53 + CloudFront: resolución DNS y CDN con terminación TLS de borde, cacheo de contenido estático y reducción de latencia geográfica."),
    bullet("AWS Shield + WAF: protección perimetral ante ataques de denegación de servicio (DDoS) y reglas de firewall de aplicación web alineadas al OWASP Top 10, filtrando tráfico malicioso antes de llegar a la aplicación."),
    bullet("ALB/ELB: balanceo de carga con health checks entre múltiples zonas de disponibilidad (AZ), incorporación y eliminación dinámica de instancias."),
    bullet("ECS/EC2 con Auto Scaling: la misma imagen de contenedor de la API (Node.js/TypeScript) del laboratorio, desplegada en subredes privadas replicadas en al menos dos AZ, escalando automáticamente según demanda."),
    bullet("RDS PostgreSQL Multi-AZ: instancia primaria y standby/réplica en distintas zonas de disponibilidad, con failover automático y cifrado en reposo integrado vía KMS; permite además réplicas de solo lectura para consultas sin afectar la base primaria."),
    bullet("Firewall y segmentación de red: Security Groups (firewall a nivel de instancia) y Network ACLs (firewall a nivel de subred) definiendo qué origenes/destinos y puertos están permitidos entre cada capa (borde, aplicación, datos); VPC dividida en subredes públicas, privadas y de datos."),
    bullet("NAC/VPN: control de acceso a la red para conexiones administrativas, segmentado de forma equivalente al uso de VLANs internas, evitando exponer puertos de administración a Internet."),
    bullet("IAM: roles de mínimo privilegio por servicio (la aplicación nunca usa credenciales de administrador; cada componente solo tiene los permisos estrictamente necesarios)."),
    bullet("KMS + Secrets Manager: gestión centralizada de claves de cifrado (reemplazando la KEK en variable de entorno del laboratorio) y de credenciales/secretos con rotación automática."),
    bullet("CloudWatch: centralización de logs, métricas y alarmas de la aplicación y la infraestructura."),
    bullet("AWS Config: auditoría continua de la configuración de los recursos desplegados y detección de cambios respecto a la línea base aprobada."),
    bullet("Amazon Inspector: escaneo automatizado de vulnerabilidades en instancias e imágenes de contenedor antes y durante su ejecución."),
    bullet("NAT Gateway: permite que los componentes en subredes privadas (la API) inicien conexiones salientes hacia el proveedor externo sin exponer esas subredes a conexiones entrantes desde Internet."),

    h2("5.3 Alta disponibilidad y continuidad"),
    p(
      "El diseño multi-AZ para el balanceador, el cómputo y la base de datos elimina el punto único de falla que " +
      "existe en el laboratorio local (un solo nodo Docker). Se recomienda además una política de respaldo " +
      "incremental/total de la base de datos y, si el apetito de riesgo de la organización lo exige, una " +
      "estrategia de recuperación ante desastres multi-región."
    ),

    new Paragraph({ children: [new PageBreak()] }),
    h1("6. Nivel de aplicación y línea base de seguridad"),
    p(
      "Se deben establecer parámetros de Alto Nivel significativos de verificación de seguridad, dado que es una " +
      "aplicación crítica por el manejo de información catalogada como sensible bajo la norma PCI DSS 3.2 " +
      "(transacciones bancarias y campos catalogados como críticos). Dependiendo del alcance de la matriz AOC " +
      "(Attestation of Compliance) y del gobierno corporativo, se debe definir si se almacena toda la tarjeta de " +
      "crédito o si la aplicación será un puente entre las pasarelas de pago integradas a la solución, catalogada " +
      "como mínimo producto viable. Se aclara que este producto, según lo analizado, SÍ guarda información " +
      "sensible, y dado esto es necesario establecer controles de línea base de seguridad a nivel de código."
    ),
    p("De acuerdo con lo anterior, la definición del marco de trabajo es un mix de:"),
    bullet("OWASP Threat Modeling Cheat Sheet"),
    bullet("OWASP Attack Surface Analysis Cheat Sheet"),
    bullet("OWASP Threat Modeling"),
    bullet("OWASP Software Assurance Maturity Model (SAMM)"),
    bullet("Microsoft SDL (Security Development Lifecycle)"),
    bullet("NIST SP 800-57"),

    h2("6.1 Ciclo de vida del desarrollo seguro"),
    p(
      "Principios de la arquitectura: asignar el menor privilegio, habilitar trazabilidad (logs, monitoreo, " +
      "auditoría), arquitectura en capas, automatización frente a errores humanos, proteger la información en " +
      "tránsito y en reposo, prepararse para eventos de seguridad, minimizar la superficie de ataque, e integrar " +
      "este diseño a una estrategia de alta disponibilidad o un plan de continuidad de negocio que, a medida que " +
      "avancen las pruebas, vaya madurando en el tiempo."
    ),

    h2("6.2 Requisitos arquitectónicos de autenticación"),
    p(
      "Utilizar cuentas de servicio con los mínimos privilegios requeridos para todos los componentes y " +
      "servicios de la aplicación: esto ayuda a que los desarrolladores no tengan interacción directa en la " +
      "comunicación entre plataformas."
    ),

    h2("6.3 Requisitos arquitectónicos de manejo de sesiones"),
    p(
      "La comunicación con API, middleware, backend y web services, para su buen funcionamiento, debe ir " +
      "autenticada utilizando el mínimo privilegio."
    ),

    h2("6.4 Requisitos arquitectónicos de control de acceso"),
    bullet("Autenticación: identidad de un actor."),
    bullet("Autorización: garantiza que un usuario puede acceder a un recurso."),
    bullet("Responsabilidad (accountability): seguimiento de las actividades que se realizaron."),
    p(
      "Para lograr implementar este mecanismo se debe pensar en un modelo o combinación de varios modelos que " +
      "permitan cumplir con las historias de usuario definidas. Por ejemplo, es posible utilizar un modelo RBAC " +
      "(Role Based Access Control) para definir, bajo un esquema de roles y responsabilidades, los accesos y " +
      "recursos, combinado con un modelo PBAC (Permission Based Access Control) para definir el nivel de acceso " +
      "a los recursos (lectura, escritura, etc.)."
    ),

    h2("6.5 Requisitos arquitectónicos de entrada y salida (análisis de impacto del dato)"),
    p(
      "El manejo y procesamiento de datos da forma a la manera en que los datos son ingresados desde el lado del " +
      "cliente, el transporte hasta el servidor, el procesamiento de estos, la disposición de los datos y los " +
      "registros asociados con cada acción sobre el dato. Todas estas acciones deben ser acordes a la definición " +
      "de confidencialidad de los datos y a las regulaciones existentes. Por ejemplo, los datos sensibles deben " +
      "cifrarse y solo ser revelados parcialmente en todas las funciones de la aplicación, deben permanecer " +
      "cifrados en la base de datos y nunca deben aparecer en un registro (log)."
    ),

    h2("6.6 Requisitos arquitectónicos de criptografía"),
    bullet("Administración de claves criptográficas y su ciclo de vida, recomendando el cambio de las mismas anualmente."),
    bullet("Establecer una bóveda (vault), alternativa basada en APIs, para proteger la integridad, disponibilidad y confidencialidad de una clave."),
    bullet("Revocación de claves y contraseñas, además del proceso necesario para volver a cifrar la información que inicialmente había sido custodiada por dichas claves y contraseñas."),
    bullet("Cifrado de la base de datos en tránsito y en reposo: se debe establecer el método, ya sea a nivel de motor de base de datos o a nivel de aplicación, integrado a la clasificación de la información que se vaya a manejar en esa base de datos."),
    bullet("Definir el uso de claves simétricas, contraseñas y tokens de API generados o compartidos por clientes para el cifrado de información de bajo riesgo, tal como el cifrado de almacenamiento local o la ofuscación de parámetros."),

    h2("6.7 Requisitos arquitectónicos de manejo de errores, registros y auditoría"),
    p(
      "Es necesario establecer un formato común de registros de información, enfocado en la calidad del " +
      "contenido de la información. De acuerdo con lo anterior, la gestión y el monitoreo de información de " +
      "forma centralizada es muy importante con fines forenses, de apoyo a controles externos de la organización " +
      "y de cumplimiento de la regulación. Por lo tanto, es importante también definir un sistema remoto para " +
      "transferir la información."
    ),

    h2("6.8 Requisitos arquitectónicos de privacidad y protección de datos"),
    p("Definir una clasificación de la información y las medidas de protección necesarias, e implementar un pool de requisitos de protección asociados a la clasificación de los datos, tales como:"),
    bullet("Nivel de cifrado."),
    bullet("Tiempos de retención."),
    bullet("Requisitos de confidencialidad."),
    bullet("Respaldo de la información."),
    bullet("Transmisión de la información."),

    h2("6.9 Requisitos arquitectónicos de comunicaciones"),
    bullet("Implementar la comunicación entre componentes utilizando un canal seguro, con como mínimo el protocolo TLS 1.2 para la protección del canal."),
    bullet("Definir e implementar un esquema para la validación de la autenticidad de cada lado del enlace de comunicación, evitando ataques de hombre en el medio (MITM). Una estrategia posible es el fijado de certificados (certificate pinning) o la validación de las cadenas de certificados TLS."),

    h2("6.10 Requisitos arquitectónicos para software malicioso"),
    bullet("Definir e implementar un sistema de control de código fuente con procesos y procedimientos claros, de forma que cualquier cambio en el código tenga asociado un ticket de requerimiento o de problema."),
    bullet("Contar con un esquema de control de acceso y usuarios identificables en la trazabilidad de cualquier cambio en la aplicación."),

    h2("6.11 Requisitos arquitectónicos para lógica de negocios"),
    p(
      "Definir y establecer flujos de negocio que no sean susceptibles a condiciones de carrera ni puedan ser " +
      "afectados por otros flujos de negocio sobre el mismo objeto: esto puede tener implicaciones de seguridad " +
      "cuando la sincronización esperada está en un código crítico para la seguridad, como registrar si un " +
      "usuario está autenticado o modificar información de estado importante que no debe ser influenciada por un " +
      "tercero. Una condición de carrera se produce en entornos concurrentes y es, efectivamente, una propiedad " +
      "de una secuencia de código."
    ),
    p(
      "Dependiendo del contexto, una secuencia de código puede tener la forma de una llamada de función, un " +
      "pequeño número de instrucciones o una serie de invocaciones de programas. Una condición de carrera viola " +
      "dos propiedades estrechamente relacionadas: exclusividad (la secuencia de código recibe acceso exclusivo " +
      "al recurso compartido, es decir, ninguna otra secuencia puede modificar las propiedades del recurso antes " +
      "de que la secuencia original finalice su ejecución) y atomicidad (la secuencia de código se comporta de " +
      "forma atómica, es decir, ningún otro hilo o proceso puede ejecutar simultáneamente la misma secuencia de " +
      "instrucciones, o un subconjunto de ellas, contra el mismo recurso)."
    ),
    p(
      "Existe una condición de carrera cuando una secuencia de código interferente todavía puede acceder al " +
      "recurso compartido, violando la exclusividad. Los programadores pueden asumir que ciertas secuencias de " +
      "código se ejecutan demasiado rápido para verse afectadas por una secuencia interferente; cuando esto no " +
      "es así, se viola la atomicidad. Por ejemplo, la declaración “x++” puede parecer atómica a nivel de código, " +
      "pero en realidad no lo es a nivel de instrucción, ya que implica una lectura (el valor original de x), " +
      "seguida de un cálculo (x + 1) y una escritura (guardar el resultado en x). La secuencia interferente puede " +
      "ser confiable (ocurre dentro del propio programa y no puede ser modificada por un atacante, solo invocada " +
      "indirectamente) o no confiable (el atacante la crea directamente, por lo general desde fuera del programa " +
      "vulnerable)."
    ),

    h2("6.12 Requisitos arquitectónicos para carga segura de archivos"),
    p(
      "Definir un directorio fuera del directorio raíz donde reside la aplicación para almacenar los archivos " +
      "cargados, en modo solo lectura: cuando los archivos se cargan directamente al directorio raíz de la " +
      "aplicación y tienen permisos inadecuados en el almacenamiento, esa funcionalidad puede permitir ataques " +
      "que carguen archivos para generar conexiones no autorizadas por un atacante y comprometer por completo la " +
      "aplicación."
    ),

    h2("6.13 Requisitos arquitectónicos para APIs"),
    p(
      "Esta línea base se debe definir de acuerdo con la necesidad. Diseño general del control de acceso: " +
      "implementar todos los componentes para que utilicen la misma codificación (por ejemplo, JSON o XML)."
    ),
    h3("Web services RESTful"),
    bullet("Implementar los métodos válidos para cada endpoint y recurso de la API sin habilitar métodos innecesarios, y hacer las validaciones necesarias para que se rechace cualquier método no autorizado."),
    bullet("Implementar la validación de esquema JSON para que la estructura, la declaración del contenido y el tipo sean los esperados por el servicio web."),
    bullet("Implementar un mecanismo de control que prevenga ataques de Cross-Site Request Forgery (CSRF), tales como tokens únicos CSRF, el envío de la cabecera HTTP Origin, u otra estrategia válida que acompañe las cookies."),
    h3("Web services SOAP"),
    bullet("Implementar la validación de esquema XSD para formatos XML y validar el tipo y contenido de cada campo de entrada del documento enviado al servicio web SOAP."),
    bullet("Implementar el mecanismo de firma de seguridad WS-Security para mensajes SOAP entre el cliente y el servicio web."),
    h3("Web services GraphQL"),
    bullet("Implementar listas positivas del número de consultas y su profundidad en APIs desarrolladas con GraphQL; utilizar un análisis de costo por consulta para determinar posibles escenarios de denegación de servicio."),
    bullet("Implementar validación de acceso y autorización en la capa lógica de negocio para las transacciones sobre la API desarrollada con GraphQL."),
    p("Recomendaciones: OWASP API Security Top 10 (owasp.org/www-project-api-security) y la enciclopedia de apisecurity.io sobre el mismo estándar.", { italics: true, size: 19 }),

    h2("6.14 Requisitos arquitectónicos de configuración"),
    bullet("Definir la segregación apropiada para diferentes niveles de confianza."),
    bullet("Implementar estrategias de verificación para binarios que se despliegan en dispositivos que no son de confianza, tales como verificación de firmas binarias, conexiones de confianza y verificación de endpoints."),
    bullet("Implementar una estrategia de verificación de componentes obsoletos o inseguros dentro del pipeline."),
    bullet("Implementar un esquema de aislamiento para las aplicaciones, de forma que no compartan el mismo ambiente con otras aplicaciones ni puedan comunicarse a nivel de sistema de ejecución. Esta estrategia puede establecerse mediante jaulas (chroot/cgroups) en un ambiente Linux, máquinas virtuales o contenedores."),
  ],
};

// ---------------------------------------------------------------------------------------------
// SECCION B (portrait): marco normativo y de cumplimiento
// ---------------------------------------------------------------------------------------------
const sectionB_normativo = {
  properties: { page: PORTRAIT_PAGE },
  children: [
    h1("7. Marco normativo y de cumplimiento"),
    p(
      "Dado que la información tratada incluye datos de tarjetahabientes y datos personales, la solución se " +
      "diseñó alineada a los siguientes marcos y normas, tanto en el laboratorio local como en la arquitectura " +
      "propuesta para producción:"
    ),

    h2("7.1 PCI DSS (Payment Card Industry Data Security Standard)"),
    p("Al almacenar y procesar número de tarjeta (PAN) y código de verificación (CVV/CCV), la solución se mapea a los siguientes requisitos de PCI DSS:"),
    simpleTable(
      [2000, 7700],
      ["Requisito PCI DSS", "Cómo se cumple en esta solución"],
      [
        ["Req. 1 — Firewall", "Segmentación de red (red interna de Docker / VPC + Security Groups + NACL en la nube); la base de datos nunca queda expuesta directamente"],
        ["Req. 2 — Configuración segura por defecto", "Sin cuentas ni contraseñas por defecto; imágenes mínimas (Alpine), usuario no-root, secretos generados con alta entropía"],
        ["Req. 3 — Protección de datos de tarjetahabientes almacenados", "PAN y CCV cifrados con AES-256-GCM; PAN enmascarado en toda vista salvo revelación auditada; CCV nunca se expone ni siquiera enmascarado"],
        ["Req. 4 — Cifrado en tránsito", "TLS 1.2/1.3 obligatorio de extremo a extremo (nginx/CloudFront), HSTS, sin puertos en texto plano"],
        ["Req. 6 — Desarrollo de sistemas y aplicaciones seguras", "Validación de entrada (Zod) en todos los endpoints, consultas parametrizadas (Prisma), dependencias con 0 vulnerabilidades conocidas (npm audit)"],
        ["Req. 7/8 — Control de acceso e identificación", "Autenticación obligatoria (JWT/API Key), autorización por roles (RBAC), contraseñas con Argon2id, sin cuentas genéricas compartidas"],
        ["Req. 10 — Registro y monitoreo de todo acceso a datos de tarjetahabientes", "audit_log append-only: registra login, listados y, en particular, cada revelación de datos sensibles con actor, rol, IP, motivo y resultado"],
        ["Req. 11 — Pruebas de seguridad periódicas", "Amazon Inspector / escaneo de imágenes propuesto en la arquitectura de producción; pruebas automatizadas de cifrado en el laboratorio"],
      ]
    ),

    h2("7.2 ISO/IEC 27001 (Sistema de Gestión de Seguridad de la Información)"),
    p("La solución también se alinea con controles del Anexo A de ISO/IEC 27001:"),
    simpleTable(
      [2000, 7700],
      ["Control ISO/IEC 27001 (Anexo A)", "Cómo se cumple en esta solución"],
      [
        ["A.9 — Control de acceso", "RBAC con roles admin/analyst/viewer/service; principio de menor privilegio en cada endpoint y en el usuario del contenedor"],
        ["A.10 — Criptografía", "Cifrado de campos sensibles (AES-256-GCM), gestión de la clave maestra separada del dato, TLS para datos en tránsito"],
        ["A.12 — Seguridad de las operaciones", "Registro centralizado de logs (Pino) con redacción de datos sensibles, healthchecks, versionado de migraciones de base de datos"],
        ["A.13 — Seguridad de las comunicaciones", "Segmentación de red (red interna Docker / VPC), TLS obligatorio, CORS restringido a orígenes conocidos"],
        ["A.14 — Adquisición, desarrollo y mantenimiento de sistemas", "Validación de esquema de datos de entrada, control de versiones de dependencias, pruebas automatizadas antes de desplegar"],
        ["A.18 — Cumplimiento", "Trazabilidad y auditoría de accesos a datos sensibles, mapeo explícito a PCI DSS y a la normativa de protección de datos personales aplicable"],
      ]
    ),

    h2("7.3 Otros marcos de referencia"),
    bullet("NIST SP 800-57: lineamientos de gestión del ciclo de vida de claves criptográficas, aplicados al diseño de rotación de la clave maestra (KEK)."),
    bullet("OWASP ASVS / OWASP API Security Top 10: base para los controles de autenticación, validación de entrada, manejo de sesiones y protección de la API REST."),
    bullet("OWASP Threat Modeling Cheat Sheet: metodología de referencia para el modelado de amenazas STRIDE de la sección 8."),
    bullet("LGPD y normativas de protección de datos personales: la geolocalización y la IP se tratan como datos personales sensibles y se cifran en reposo, igual que los datos financieros."),
  ],
};

// ---------------------------------------------------------------------------------------------
// SECCION C (landscape): modelado de amenazas STRIDE + matriz de riesgos
// ---------------------------------------------------------------------------------------------
const stride = [
  ["1", "Spoofing", "Suplantación de un usuario legítimo en la API", "Login Argon2id + JWT HS256 corto (15 min), mensaje de error genérico", "MFA para admin, rotación de JWT_SECRET, passkeys/WebAuthn"],
  ["2", "Spoofing", "Un servicio no autorizado se hace pasar por “otro equipo consumidor”", "API Key hasheada (SHA-256), rol dedicado service, nunca se muestra en claro tras crearse", "Rotación periódica de API keys, mTLS entre servicios internos"],
  ["3", "Tampering", "Manipulación de datos en tránsito", "TLS 1.2/1.3 obligatorio, HSTS, redirect 301 de 8080 a 8443", "Certificado de CA interna, HSTS preload, mTLS"],
  ["4", "Tampering", "Manipulación del ciphertext de un campo cifrado", "AES-256-GCM (AEAD): decryptField falla ante cualquier alteración (verificado en pruebas)", "—"],
  ["5", "Tampering", "Inyección SQL", "Prisma genera exclusivamente consultas parametrizadas; sin SQL concatenado", "SAST en CI que bloquee $queryRawUnsafe"],
  ["6", "Repudiation", "Un admin niega haber revelado datos de un cliente", "audit_log append-only: actor, rol, IP, motivo y resultado en cada acción sensible", "Hash-chaining de auditoría, envío a SIEM externo"],
  ["7", "Repudiation", "El proveedor niega el contenido exacto entregado", "ingestion_runs registra conteo de registros obtenidos/insertados y estado por corrida", "Conservar payload crudo firmado con retención definida"],
  ["8", "Information Disclosure", "Fuga de PAN/CCV/cuenta en listados, logs o errores", "Enmascarado por defecto; Pino redacta campos sensibles; sin stack trace en producción", "DLP en la salida de red, escaneo periódico de logs"],
  ["9", "Information Disclosure", "Acceso directo a la BD expone datos sensibles", "Cifrado a nivel de aplicación: acceso directo a Postgres solo ve bytea cifrado", "KMS gestionado con políticas de acceso independientes de la BD"],
  ["10", "Information Disclosure", "Enumeración de usuarios válidos vía errores de login", "Mensaje de error idéntico exista o no la cuenta (verificado)", "—"],
  ["11", "Denial of Service", "Fuerza bruta sobre /auth/login", "Rate limit 10 intentos/15min; verificado hasta HTTP 429 (Figura 13)", "WAF/Fail2ban a nivel de red, CAPTCHA"],
  ["12", "Denial of Service", "Abuso de /reveal para exfiltrar masivamente", "Rate limit 20/hora, rol admin + justificación obligatoria, auditoría por llamada", "Alertas automáticas ante revelación masiva (detección de exfiltración)"],
  ["13", "Denial of Service", "Proveedor caído o payload extremo cuelga la ingesta", "AbortController 15s de timeout; límite de tamaño de body en la API", "Circuit breaker / backoff exponencial en el cliente de ingesta"],
  ["14", "Elevation of Privilege", "Un viewer/analyst invoca /reveal directo por API", "requireRole(\"admin\") en middleware del backend; verificado HTTP 403 con token de viewer", "—"],
  ["15", "Elevation of Privilege", "Token JWT alterado (alg:none) para escalar rol", "jwt.verify fuerza algorithms:[\"HS256\"] explícitamente", "Lista de revocación / JWT de un solo uso para logout inmediato"],
  ["16", "Elevation of Privilege", "Contenedor de la API comprometido escala o pivota", "Usuario no-root en runtime; red interna aislada; Postgres sin puerto publicado", "Escaneo de imágenes (Trivy/Grype) en CI, network policies"],
];

const riesgos = [
  ["R1", "Acceso no autorizado a datos de clientes", "Ausencia de autenticación y autorización en la capa de API", "Alta", "Superior", "Autenticación obligatoria + RBAC en todos los endpoints, probado con 4 roles", "Bajo"],
  ["R2", "Exposición de PAN/CCV/cuenta en texto plano", "Datos sensibles almacenados sin cifrado a nivel de aplicación", "Moderada", "Superior", "AES-256-GCM a nivel de aplicación; columna bytea verificada", "Bajo"],
  ["R3", "Revelación sin trazabilidad ni justificación", "Ausencia de un mecanismo controlado de revelación de datos sensibles", "Moderada", "Moderado", "Endpoint /reveal solo admin, motivo obligatorio, auditado", "Bajo"],
  ["R4", "Fuerza bruta de credenciales", "Sin límite de intentos de login", "Alta", "Moderado", "Rate limiting probado hasta HTTP 429", "Bajo"],
  ["R5", "Ingesta de datos corruptos/maliciosos", "Ausencia de validación de esquema en la ingesta desde el proveedor", "Moderada", "Moderado", "Validación Zod; 1/100 registros reales descartado sin detener la ingesta", "Bajo"],
  ["R6", "Caída de los servicios en producción", "Sin ambientes de prueba ni redundancia de infraestructura", "Baja", "Superior", "Healthchecks, restart automático, migraciones versionadas", "Moderado (Bajo si se adopta la arquitectura cloud multi-AZ de la sección 5)"],
  ["R7", "Ataque cibernético dirigido", "Superficie de ataque no reducida, sin WAF gestionado", "Baja", "Superior", "TLS, Helmet, CORS restringido, rate limiting, 0 vulnerabilidades npm audit", "Moderado (Bajo con AWS WAF/Shield de la sección 5)"],
  ["R8", "Uso inadecuado de accesos privilegiados", "Sin gestión de roles ni depuración de usuarios", "Baja", "Moderado", "Roles explícitos, sin cuentas genéricas, desactivación sin borrar auditoría", "Bajo"],
  ["R9", "Repudio de acciones administrativas", "Ausencia de registro de auditoría de acciones sensibles", "Baja", "Bajo", "audit_log append-only para acciones sensibles", "Bajo"],
  ["R10", "Divulgación en cabeceras/errores", "Cabeceras por defecto, stack traces expuestos", "Baja", "Bajo", "Helmet, errorHandler sin detalle interno, server_tokens off", "Bajo"],
  ["R11", "Información sensible en texto plano en tránsito", "Sin TLS entre cliente y servidor", "Baja", "Bajo", "HTTPS obligatorio de extremo a extremo", "Bajo"],
  ["R12", "Contenedor con privilegios de root", "Imagen base sin usuario dedicado", "Baja", "Moderado", "Usuario no-root, build multi-stage sin tooling en runtime", "Bajo"],
];

const sectionC = {
  properties: { page: LANDSCAPE_PAGE },
  children: [
    h1("8. Modelado de amenazas (STRIDE)"),
    p("Alcance: ingesta, API, base de datos, dashboard y proveedor externo, ver docs/AMENAZAS.md para el detalle completo con supuestos de confianza."),
    simpleTable(
      [450, 1850, 3650, 4350, 4300],
      ["#", "Categoría", "Amenaza", "Mitigación implementada y verificada", "Mitigación recomendada (producción)"],
      stride
    ),

    new Paragraph({ children: [new PageBreak()] }),
    h1("9. Matriz de riesgos"),
    p(
      "Metodología: impacto financiero/operativo/legal-reputacional y probabilidad; el detalle completo de las " +
      "tablas de impacto y probabilidad está en docs/MATRIZ_RIESGOS.md. Cada control indicado como " +
      "“implementado y verificado” fue efectivamente construido, ejecutado y probado en el laboratorio " +
      "(evidencia en la sección 3.4), no solo documentado."
    ),
    simpleTable(
      [720, 2650, 2890, 1360, 1360, 4010, 1610],
      ["COD", "Riesgo", "Causa principal", "Probabilidad", "Impacto inicial", "Control implementado y verificado", "Impacto residual"],
      riesgos
    ),
    p(
      "Resultado: aplicando los controles implementados, el 83,3% de los riesgos identificados quedan en nivel " +
      "Bajo. Los dos que permanecen en Moderado (R6, R7) son inherentes a que el laboratorio corre en un solo " +
      "nodo local, sin alta disponibilidad geográfica ni WAF gestionado — brecha que cierra la arquitectura en " +
      "la nube propuesta en la sección 5.",
      { size: 20 }
    ),
  ],
};

// ---------------------------------------------------------------------------------------------
// SECCION D (portrait): analisis final y pendientes
// ---------------------------------------------------------------------------------------------
const sectionD = {
  properties: { page: PORTRAIT_PAGE },
  children: [
    h1("10. Análisis y conclusiones"),
    p(
      "La solución identifica correctamente los riesgos relevantes del negocio (acceso no autorizado, cifrado " +
      "de datos sensibles, disponibilidad, ataques externos) y cada control descrito en la matriz de riesgos y " +
      "en el modelo de amenazas STRIDE fue implementado en código, ejecutado en Docker y verificado con pruebas " +
      "reales (manuales vía curl/dashboard y automatizadas vía Vitest), dejando evidencia reproducible en " +
      "docs/evidencias/."
    ),
    p(
      "El riesgo residual que permanece en nivel Moderado (caída de servicios y ataque cibernético dirigido) es " +
      "inherente a que el laboratorio corre en un solo nodo local, sin alta disponibilidad geográfica ni un WAF " +
      "gestionado — exactamente el tipo de inversión de infraestructura que describe la arquitectura propuesta " +
      "en la sección 5, y que constituye el siguiente paso natural para promover esta solución a un ambiente " +
      "productivo."
    ),

    h1("11. Pendientes y próximos pasos"),
    bullet("Definir la cuenta/organización de GitHub de destino y publicar el repositorio (privado, dado que el equipo puede preferir no exponer la arquitectura de seguridad públicamente sin revisión previa)."),
    bullet("Migrar la clave maestra (KEK) de variable de entorno a un KMS gestionado (AWS KMS, Vault, Azure Key Vault) conforme a la arquitectura de la sección 5."),
    bullet("Reemplazar el certificado TLS autofirmado por uno emitido por una CA interna o pública si se expone fuera de la máquina local."),
    bullet("Desplegar la arquitectura multi-AZ (balanceador, cómputo y RDS) descrita en la sección 5 si el volumen de consumo lo justifica."),
    bullet("Integrar el pipeline de CI con escaneo de dependencias (npm audit / Dependabot) y de imágenes (Trivy/Grype), y ejecutar la suite de pruebas automatizadas en cada cambio."),
    bullet("Evaluar MFA para el rol admin y SSO corporativo (OIDC/SAML) para reemplazar los usuarios locales de prueba."),
  ],
};

const doc = new Document({
  creator: "Equipo de Seguridad Informática",
  title: "Manejo de información de clientes de un proveedor externo — Challenge de Seguridad Informática",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
      heading1: { run: { size: 32, bold: true, color: "1F2937" }, paragraph: { spacing: { before: 240, after: 120 } } },
      heading2: { run: { size: 26, bold: true, color: "334155" }, paragraph: { spacing: { before: 200, after: 100 } } },
      heading3: { run: { size: 23, bold: true, color: "475569" }, paragraph: { spacing: { before: 160, after: 80 } } },
    },
  },
  sections: [sectionA, sectionB_normativo, sectionC, sectionD],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "Informe_Solucion_GALO.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Informe generado en", outPath);
});
