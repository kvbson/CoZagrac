import { Request } from 'express';

export const setSessionUser = <T>(req: Request<object, object, T>, userId: string) => {
  (req.session as any).userId = userId;
};
