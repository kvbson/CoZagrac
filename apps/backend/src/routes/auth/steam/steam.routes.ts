import { Router } from 'express';
import passport from 'passport';
import { frontendUrl } from '../../../config/runtime.js';

const router = Router();

router.get('/steam', passport.authenticate('steam'));

router.get(
  '/steam/callback',
  passport.authenticate('steam', {
    failureRedirect: `${frontendUrl}/auth`,
  }),
  (_req, res) => {
    res.redirect(`${frontendUrl}/`);
  },
);

export default router;
