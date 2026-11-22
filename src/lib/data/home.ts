import "server-only";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function getHomeData(userId: string, today: string) {
  const [[{ toCheck }], week] = await Promise.all([
    db
      .select({ toCheck: count() })
      .from(schema.items)
      .where(and(eq(schema.items.userId, userId), eq(schema.items.status, "needs_check"))),
    db
      .select({ id: schema.plannedMeals.id, day: schema.plannedMeals.day, title: schema.plannedMeals.title })
      .from(schema.plannedMeals)
      .where(
        and(
          eq(schema.plannedMeals.userId, userId),
          eq(schema.plannedMeals.status, "planned"),
          gte(schema.plannedMeals.day, today),
        ),
      )
      .orderBy(asc(schema.plannedMeals.day))
      .limit(3),
  ]);
  return { toCheck, week };
}
