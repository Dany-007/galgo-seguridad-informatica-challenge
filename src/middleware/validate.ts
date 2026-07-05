import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type Target = "body" | "query" | "params";

/** Valida y sanea la seccion indicada de la request contra un esquema zod antes de llegar al handler. */
export function validate(target: Target, schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return res.status(400).json({
        error: "Datos de entrada invalidos",
        details: result.error.flatten(),
      });
    }
    (req as unknown as Record<Target, unknown>)[target] = result.data;
    return next();
  };
}
