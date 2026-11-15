import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** Subset of fields node-postgres attaches to driver errors. */
interface PsqlError extends Error {
  code?: string; // SQLSTATE
  constraint?: string;
}

/**
 * SQLSTATE -> client-facing response. Messages are generic on purpose:
 * table/constraint names from the driver must not leak to the client.
 */
const sqlstateResponses: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: 'Value already exists' }, // unique_violation
  '23503': { status: 409, message: 'Related record does not exist' }, // foreign_key_violation
  '23502': { status: 400, message: 'Required field is missing' }, // not_null_violation
  '23514': { status: 400, message: 'Value rejected by data constraints' }, // check_violation
  '22P02': { status: 400, message: 'Invalid input format' }, // invalid_text_representation
};

const isPsqlError = (err: Error): err is PsqlError => typeof (err as PsqlError).code === 'string';

/**
 * Terminal Express 5 error handler: turns validate()/controller throws
 * (ZodError), driver errors (SQLSTATE) and http-level failures into the
 * shared { message } response shape. Must be registered AFTER all routes.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars -- required by Express to recognise the 4-arg signature
): void => {
  // validate() rejections and input schema issues thrown anywhere upstream
  if (err instanceof ZodError) {
    const [issue] = err.issues;
    const path = issue.path.join('.');
    const message = path ? `${path}: ${issue.message}` : issue.message;
    res.status(400).json({ message });
    return;
  }

  // http-level errors that opt into client exposure (e.g. body-parser bad JSON)
  const httpError = err as Error & { status?: number; statusCode?: number; expose?: boolean };
  const httpStatus = httpError.status ?? httpError.statusCode;
  if (typeof httpStatus === 'number' && httpStatus < 500 && httpError.expose !== false) {
    res.status(httpStatus).json({ message: httpError.message || 'Bad request' });
    return;
  }

  if (isPsqlError(err) && sqlstateResponses[err.code ?? '']) {
    const mapped = sqlstateResponses[err.code ?? ''];
    res.status(mapped.status).json({ message: mapped.message });
    return;
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: 'Internal server error' });
};
