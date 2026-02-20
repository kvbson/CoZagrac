import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { userService } from '../services/user.service.js';
import { domain } from '../index.js';

/* ========================
   Serialize / Deserialize
======================== */

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (id: string, done) => {
  const user = await userService.getById(id);
  done(null, user ?? null);
});

/* ========================
   Steam Strategy
======================== */

passport.use(
  new SteamStrategy(
    {
      returnURL: `${domain}/auth/steam/callback`,
      realm: `${domain}/`,
      apiKey: process.env.STEAM_API_KEY!,
    },
    async (_identifier, profile, done) => {
      try {
        const steamId = profile.id;

        const provider = await userService.getBySteamId(steamId);

        if (provider) {
          const user = await userService.getById(provider.userId);
          return done(null, user);
        }

        const user = await userService.create({
          email: null,
          passwordHash: null,
        });

        await userService.createProvider({
          userId: user.id,
          provider: 'steam',
          providerUserId: steamId,
        });

        return done(null, { userId: user.id });
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);
