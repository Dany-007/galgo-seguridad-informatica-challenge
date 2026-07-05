import { env } from "../config/env";
import { logger } from "../config/logger";
import { providerResponseSchema, type ProviderUsuario } from "./schema";

/**
 * Obtiene el listado de usuarios del proveedor externo.
 * Controles aplicados:
 *  - Timeout explicito (AbortController) para evitar que un proveedor caido cuelgue la ingesta.
 *  - Verificacion de status HTTP antes de parsear.
 *  - Validacion de esquema con zod: cualquier registro que no cumpla el contrato se descarta y
 *    se reporta, en vez de propagar datos no confiables hacia la base de datos.
 */
export async function fetchProviderUsuarios(): Promise<ProviderUsuario[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(env.PROVIDER_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Proveedor respondio con status ${response.status}`);
    }

    const rawBody = await response.json();
    const parsed = providerResponseSchema.safeParse(rawBody);

    if (!parsed.success) {
      // No descartamos toda la carga: intentamos registro por registro para maximizar datos utiles
      // y dejamos evidencia de los que fallaron (control de calidad de datos / no confiar en 3ros).
      const results: ProviderUsuario[] = [];
      const rawArray = Array.isArray(rawBody) ? rawBody : [];
      for (const item of rawArray) {
        const single = providerResponseSchema.element.safeParse(item);
        if (single.success) {
          results.push(single.data);
        } else {
          logger.warn({ providerId: item?.id, issues: single.error.issues }, "Registro descartado por fallo de validacion");
        }
      }
      return results;
    }

    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}
