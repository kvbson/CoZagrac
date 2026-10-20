import { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

// Uwaga: sygnatura musi być szeroka (ZodType, nie ZodObject) — przekazywanie
// schematów po .refine()/.optional() do parametru typu ZodObject wywołuje
// wybuch inferencji wariancji typów w zod v4 (tsc OOM >4 GB RAM).
export const validate = (schema: ZodType) => (req: Request, _: Response, next: NextFunction) => {
  schema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  next();
};
