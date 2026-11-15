import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { userService } from '../services/user.service.js';
import { domain } from '../config/runtime.js';
import { env } from '../env.js';

/* ========================
   Serialize / Deserialize
======================== */

passport.serializeUser((user, done) => {
  done(null, { userId: user.userId });
});

passport.deserializeUser(async ({ userId }: { userId: string }, done) => {
  const user = await userService.getById(userId);
  done(null, user && { userId: user.userId });
});

/* ========================
   Steam Strategy
======================== */

passport.use(
  new SteamStrategy(
    {
      returnURL: `${domain}/api/auth/steam/callback`,
      realm: `${domain}/`,
      apiKey: env.STEAM_API_KEY,
    },
    async (_identifier, profile, done) => {
      try {
        const steamId = profile.id;

        const provider = await userService.getBySteamId(steamId);

        if (provider) {
          return done(null, { userId: provider.userId });
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
