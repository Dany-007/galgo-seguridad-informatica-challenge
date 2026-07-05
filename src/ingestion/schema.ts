import { z } from "zod";

/**
 * Validacion estricta del payload del proveedor externo antes de tocar la base de datos.
 * Nunca se confia en datos externos sin validar (OWASP ASVS 5.x - Validacion de entrada).
 * Los campos numericos que llegan como string (ccv, cuenta) se mantienen como string para no
 * perder ceros a la izquierda; se valida formato con regex.
 */
export const providerUsuarioSchema = z.object({
  id: z.string().min(1),
  fec_alta: z.string().datetime({ offset: true }),
  fec_birthday: z.string().datetime({ offset: true }),
  user_name: z.string().min(1).max(255),
  codigo_zip: z.string().min(1).max(20),
  credit_card_num: z.string().regex(/^[0-9-]{8,32}$/, "Formato de tarjeta invalido"),
  credit_card_ccv: z.string().regex(/^[0-9]{3,4}$/, "Formato de CCV invalido"),
  cuenta_numero: z.string().regex(/^[0-9]{4,20}$/, "Formato de cuenta invalido"),
  direccion: z.string().min(1).max(255),
  geo_latitud: z.string(),
  geo_longitud: z.string(),
  color_favorito: z.string().min(1).max(50),
  foto_dni: z.string().url(),
  ip: z.string(),
  auto: z.string().min(1).max(100),
  auto_modelo: z.string().min(1).max(100),
  auto_tipo: z.string().min(1).max(100),
  auto_color: z.string().min(1).max(100),
  cantidad_compras_realizadas: z.number().int().nonnegative(),
  avatar: z.string().url(),
});

export type ProviderUsuario = z.infer<typeof providerUsuarioSchema>;

export const providerResponseSchema = z.array(providerUsuarioSchema);
