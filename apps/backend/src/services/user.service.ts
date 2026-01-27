import { eq } from 'drizzle-orm';
import { db } from '../db/init.js';
import { users } from '../drizzle/schema.js';
import { CreateUserInput, publicUserSchema, UpdateUserBody } from '../schemas/user.zod.js';

export const userService = {
  async create(data: CreateUserInput) {
    const [user] = await db.insert(users).values(data).returning({
      id: users.id,
      steamId: users.steamId,
      email: users.email,
      createdAt: users.createdAt,
    });

    return publicUserSchema.parse(user);
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
    const [{ id: userId }] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    return { userId };
  },

  async getBySteamId(steamId: string) {
    const [{ id: userId }] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.steamId, steamId));
    return { userId };
  },
};
