import { prisma } from "../db/prisma";
import { logger } from "../config/logger";
import { encryptField, hmacPan, maskPan, maskAccountNumber } from "../crypto/fieldCrypto";
import { fetchProviderUsuarios } from "./fetchProvider";
import type { ProviderUsuario } from "./schema";

function toUsuarioRow(item: ProviderUsuario) {
  return {
    providerId: item.id,
    userName: item.user_name,
    fecAlta: new Date(item.fec_alta),
    fecBirthday: new Date(item.fec_birthday),
    codigoZip: item.codigo_zip,
    direccion: item.direccion,
    colorFavorito: item.color_favorito,
    fotoDni: item.foto_dni,
    avatar: item.avatar,
    auto: item.auto,
    autoModelo: item.auto_modelo,
    autoTipo: item.auto_tipo,
    autoColor: item.auto_color,
    cantidadComprasRealizadas: item.cantidad_compras_realizadas,

    creditCardEnc: encryptField(item.credit_card_num),
    creditCardMask: maskPan(item.credit_card_num),
    panHash: hmacPan(item.credit_card_num),
    creditCardCcvEnc: encryptField(item.credit_card_ccv),
    cuentaNumeroEnc: encryptField(item.cuenta_numero),
    cuentaNumeroMask: maskAccountNumber(item.cuenta_numero),
    geoLatitudEnc: encryptField(item.geo_latitud),
    geoLongitudEnc: encryptField(item.geo_longitud),
    ipEnc: encryptField(item.ip),
  };
}

export async function runIngestion(): Promise<{ fetched: number; upserted: number; runId: number }> {
  const run = await prisma.ingestionRun.create({ data: { status: "running" } });
  logger.info({ runId: run.id }, "Inicio de ingesta del proveedor externo");

  try {
    const items = await fetchProviderUsuarios();
    let upserted = 0;

    for (const item of items) {
      const row = toUsuarioRow(item);
      await prisma.usuario.upsert({
        where: { providerId: row.providerId },
        create: row,
        update: row,
      });
      upserted += 1;
    }

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: "success",
        recordsFetched: items.length,
        recordsUpserted: upserted,
      },
    });

    logger.info({ runId: run.id, fetched: items.length, upserted }, "Ingesta finalizada correctamente");
    return { fetched: items.length, upserted, runId: run.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: "failed", errorMessage: message },
    });
    logger.error({ runId: run.id, error: message }, "Ingesta fallida");
    throw error;
  }
}
