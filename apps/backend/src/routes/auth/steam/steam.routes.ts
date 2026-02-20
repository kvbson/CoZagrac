import { Router } from 'express';
import passport from 'passport';

const router = Router();

router.get('/steam', passport.authenticate('steam'));

router.get(
  '/steam/callback',
  passport.authenticate('steam', {
    failureRedirect: '/',
  }),
  (req, res) => {
    res.redirect('/');
  },
);

export default router;
