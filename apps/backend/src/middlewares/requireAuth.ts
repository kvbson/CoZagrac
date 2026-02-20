import { NextFunction, Request, Response } from 'express';

function getCurrentUserId(req: Request) {
  if (req.user?.userId) return req.user.userId;

  const sessionUserId = (req.session as { userId?: string } | undefined)?.userId;
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
