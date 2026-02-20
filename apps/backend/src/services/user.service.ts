import { desc, eq, and } from 'drizzle-orm';
import { db } from '../db/init.js';
import { userEmbeddings, userProviders, users } from '../drizzle/schema.js';
import {
  CreateProviderInput,
  CreateUserInput,
  publicUserSchema,
  UpdateUserBody,
} from '../schemas/user.zod.js';

export const userService = {
  async create(data: CreateUserInput) {
    const [user] = await db.insert(users).values(data).returning();

    return publicUserSchema.parse(user);
  },

  async createProvider(data: CreateProviderInput) {
    const [provider] = await db.insert(userProviders).values(data).returning({
      id: userProviders.id,
      userId: userProviders.userId,
      provider: userProviders.provider,
      providerUserId: userProviders.providerUserId,
    });

    return provider;
  },

  async update(id: string, data: UpdateUserBody) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    if (!user) return null;
    return { userId: user.id };
  },

  async delete(id: string) {
    const [row] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ deletedUserId: users.id });
    return Boolean(row);
  },

  async getById(id: string) {
    const [row] = await db
      .select({
        userId: users.id,
        steamId: userProviders.providerUserId,
      })
      .from(users)
      .leftJoin(
        userProviders,
        and(eq(userProviders.userId, users.id), eq(userProviders.provider, 'steam')),
      )
      .where(eq(users.id, id))
      .limit(1);

    if (!row) return null;

    return {
      userId: row.userId,
      steamId: row.steamId ?? null,
    };
  },

  async getByEmail(email: string) {
    const [row] = await db
      .select({ userId: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!row) return null;

    return row;
  },

  async getAuthByEmail(email: string) {
    const [row] = await db
      .select({ userId: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!row) return null;

    return row;
  },

  async getBySteamId(steamId: string) {
    const [row] = await db
      .select({ userId: userProviders.userId })
      .from(userProviders)
      .where(and(eq(userProviders.providerUserId, steamId), eq(userProviders.provider, 'steam')))
      .limit(1);

    if (!row) return null;

    return row;
  },

  async getUserEmbeddings(userId: string) {
    const [row] = await db
      .select({ embedding: userEmbeddings.embedding })
      .from(userEmbeddings)
      .where(eq(userEmbeddings.userId, userId))
      .orderBy(desc(userEmbeddings.createdAt))
      .limit(1);

    if (!row) return null;

    return row;
  },
};
