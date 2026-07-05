import { prisma } from "../db/prisma";
import { decryptField } from "../crypto/fieldCrypto";

export interface ListUsuariosParams {
  page: number;
  pageSize: number;
  search?: string;
}

/**
 * Vista de "consumo habitual" para otros equipos/aplicaciones: expone todos los atributos no
 * sensibles y las versiones enmascaradas de los sensibles. Nunca expone el ciphertext ni permite
 * reconstruir el dato original desde esta ruta.
 */
export async function listUsuarios({ page, pageSize, search }: ListUsuariosParams) {
  const where = search
    ? { userName: { contains: search, mode: "insensitive" as const } }
    : {};

  const [total, rows] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: "asc" },
    }),
  ]);

  const data = rows.map((u) => ({
    id: u.id,
    providerId: u.providerId,
    userName: u.userName,
    fecAlta: u.fecAlta,
    fecBirthday: u.fecBirthday,
    codigoZip: u.codigoZip,
    direccion: u.direccion,
    colorFavorito: u.colorFavorito,
    fotoDni: u.fotoDni,
    avatar: u.avatar,
    auto: u.auto,
    autoModelo: u.autoModelo,
    autoTipo: u.autoTipo,
    autoColor: u.autoColor,
    cantidadComprasRealizadas: u.cantidadComprasRealizadas,
    creditCardMasked: u.creditCardMask,
    cuentaNumeroMasked: u.cuentaNumeroMask,
    geoLatitud: "[CIFRADO]",
    geoLongitud: "[CIFRADO]",
    ip: "[CIFRADO]",
  }));

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getUsuarioById(id: number) {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return null;
  return {
    id: u.id,
    providerId: u.providerId,
    userName: u.userName,
    direccion: u.direccion,
    creditCardMasked: u.creditCardMask,
    cuentaNumeroMasked: u.cuentaNumeroMask,
  };
}

/**
 * Revela los campos sensibles en claro. Solo debe invocarse desde una ruta protegida con rol
 * admin, rate-limit estricto y que registre auditoria obligatoria (ver routes/usuarios.routes.ts).
 */
export async function revealSensitiveFields(id: number) {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return null;
  return {
    id: u.id,
    creditCardNum: decryptField(u.creditCardEnc),
    creditCardCcv: decryptField(u.creditCardCcvEnc),
    cuentaNumero: decryptField(u.cuentaNumeroEnc),
    geoLatitud: decryptField(u.geoLatitudEnc),
    geoLongitud: decryptField(u.geoLongitudEnc),
    ip: decryptField(u.ipEnc),
  };
}
