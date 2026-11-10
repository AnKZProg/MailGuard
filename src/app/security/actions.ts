"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertId } from "@/lib/http/action-input";

export async function acknowledgeFinding(findingId: string): Promise<void> {
  assertId(findingId);
  await db.securityFinding.update({ where: { id: findingId }, data: { acknowledgedAt: new Date() } });
  revalidatePath("/security");
}
