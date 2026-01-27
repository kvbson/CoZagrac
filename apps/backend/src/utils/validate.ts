import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';

export const validate = (schema: ZodObject) => (req: Request, _: Response, next: NextFunction) => {
  schema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  next();
};
