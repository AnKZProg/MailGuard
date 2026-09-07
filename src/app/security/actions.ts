"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function acknowledgeFinding(findingId: string): Promise<void> {
  await db.securityFinding.update({ where: { id: findingId }, data: { acknowledgedAt: new Date() } });
  revalidatePath("/security");
}
