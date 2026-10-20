import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import type { Request, Response } from 'express';

const mockRes = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res;
};

const run = (err: Error) => {
  const res = mockRes();
  const req = { method: 'POST', originalUrl: '/api/test' } as Request;
  errorHandler(err, req, res as unknown as Response, () => undefined);
  return res;
};

describe('errorHandler', () => {
  it('mapuje 23505 unique_violation na 409 bez wycieku nazwy ograniczenia', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      constraint: 'users_email_key',
    });

    const res = run(err);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ message: 'Value already exists' });
  });

  it('mapuje 22P02 invalid_text_representation na 400', () => {
    const err = Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' });

    const res = run(err);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid input format' });
  });

  it('mapuje błąd walidacji Zod na 400 ze ścieżką pola', () => {
    const parsed = z.object({ email: z.email() }).safeParse({ email: 'not-an-email' });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('unreachable');

    const res = run(parsed.error);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: expect.stringContaining('email') });
  });

  it('błędy HTTP z expose (body-parser) przekazuje z ich statusem', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
      expose: true,
    });

    const res = run(err);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Unexpected token' });
  });

  it('nieznanego błędu nie ujawnia (500 + log)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = Object.assign(new Error('boom'), { code: '42601' });

    const res = run(err);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
