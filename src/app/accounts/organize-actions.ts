"use server";

import { revalidatePath } from "next/cache";
import { organizeAccountBySender, organizeAllAccountsBySender, type OrganizeBySenderSummary } from "@/lib/organize/organize-by-sender";
import { fileAllAccountsIntoExistingFolders, type FileIntoExistingSummary } from "@/lib/organize/file-into-existing-folders";

export async function organizeBySender(accountId: string): Promise<OrganizeBySenderSummary> {
  const summary = await organizeAccountBySender(accountId);
  revalidatePath("/");
  revalidatePath("/accounts");
  return summary;
}

export async function organizeBySenderAll(): Promise<OrganizeBySenderSummary> {
  const summary = await organizeAllAccountsBySender();
  revalidatePath("/");
  revalidatePath("/accounts");
  return summary;
}

export async function fileNewMailAll(): Promise<FileIntoExistingSummary> {
  const summary = await fileAllAccountsIntoExistingFolders();
  revalidatePath("/");
  revalidatePath("/accounts");
  return summary;
}
