import { NextFunction, Request, Response } from 'express';
import { getSessionUserId } from '../functions/setUserSession.js';

function getCurrentUserId(req: Request) {
  if (req.user?.userId) return req.user.userId;

  const sessionUserId = getSessionUserId(req);
  if (sessionUserId) return sessionUserId;

  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.sendStatus(401);
  }

  return next();
}

export function requireSameUserParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = getCurrentUserId(req);

    if (!userId) {
      return res.sendStatus(401);
    }

    if (req.params[paramName] !== userId) {
      return res.sendStatus(403);
    }

    return next();
  };
}
