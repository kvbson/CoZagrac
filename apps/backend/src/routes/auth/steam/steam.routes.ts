import { Router } from 'express';
import passport from 'passport';

const router = Router();

router.get('/steam', passport.authenticate('steam'));

router.get(
  '/steam/callback',
  passport.authenticate('steam', {
    failureRedirect: 'http://localhost:5137/auth',
  }),
  (req, res) => {
    res.redirect('http://localhost:5137/');
  },
);

export default router;
