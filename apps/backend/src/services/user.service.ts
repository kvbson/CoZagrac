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
    const [user] = await db.insert(users).values(data).returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    });

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
    const [{ id: userId }] = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
    return { userId };
  },

  async getByEmail(email: string) {
    const [{ id: userId, passwordHash }] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email));
    return { userId, passwordHash };
  },

  async getBySteamId(steamId: string) {
    const [{ id: userId }] = await db
      .select({ id: userProviders.userId })
      .from(userProviders)
      .where(and(eq(userProviders.providerUserId, steamId), eq(userProviders.provider, 'steam')));
    return { userId };
  },

  async getUserEmbeddings(userId: string) {
    const [{ embedding }] = await db
      .select({ embedding: userEmbeddings.embedding })
      .from(userEmbeddings)
      .where(eq(userEmbeddings.userId, userId))
      .orderBy(desc(userEmbeddings.createdAt));
    return { embedding };
  },
};
