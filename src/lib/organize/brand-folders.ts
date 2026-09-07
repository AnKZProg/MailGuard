import { listCustomLabels } from "@/lib/providers/google/gmail-client";
import {
  ensureFolder,
  ensureChildFolder,
  findFolderIdByName,
  listTopLevelFolders,
  listChildFolders,
} from "@/lib/providers/microsoft/graph-client";

// One parent folder per account instead of dozens of top-level entries — the
// whole point being the user can collapse a single "MailGuard" (and its
// "Marques" child) instead of scrolling past 100+ brand folders in their
// mail client's sidebar.
export const GRAPH_ROOT_FOLDER_NAME = "MailGuard";
export const BRANDS_FOLDER_NAME = "Marques";
export const GMAIL_BRANDS_PREFIX = "MailGuard/Marques/";

/** lowercased brand name -> label/folder id */
export type BrandFolderMap = Map<string, string>;

function leafName(fullName: string): string {
  const parts = fullName.split("/");
  return parts[parts.length - 1];
}

/** Every existing brand label, whether still at the top level (pre-dating the
 * nested layout) or already under MailGuard/Marques/ — keyed by its leaf name
 * so either shape matches a computed brand the same way. */
export async function buildGmailBrandMap(accessToken: string): Promise<BrandFolderMap> {
  const labels = await listCustomLabels(accessToken);
  return new Map(labels.map((l) => [leafName(l.name).toLowerCase(), l.id]));
}

/** Read-only: finds the MailGuard/Marques folder id without creating it —
 * callers that only need to reuse existing folders (never create new ones)
 * should never provision an empty parent on an account that was never
 * organized. */
export async function findGraphBrandsParent(accessToken: string): Promise<string | null> {
  const rootId = await findFolderIdByName(accessToken, GRAPH_ROOT_FOLDER_NAME);
  if (!rootId) return null;
  const children = await listChildFolders(accessToken, rootId);
  return children.find((c) => c.displayName === BRANDS_FOLDER_NAME)?.id ?? null;
}

/** Creates MailGuard/Marques if it doesn't exist yet, otherwise returns the
 * existing one — for callers that DO need to create new brand folders. */
export async function ensureGraphBrandsParent(accessToken: string): Promise<string> {
  const rootId = await ensureFolder(accessToken, GRAPH_ROOT_FOLDER_NAME);
  return ensureChildFolder(accessToken, rootId, BRANDS_FOLDER_NAME);
}

/** Every existing brand folder reachable for reuse: still-top-level ones
 * (pre-dating the nested layout) plus whatever is already nested under
 * MailGuard/Marques, if that parent exists yet. */
export async function buildGraphBrandMap(accessToken: string, brandsParentId: string | null): Promise<BrandFolderMap> {
  const topLevel = await listTopLevelFolders(accessToken);
  const map: BrandFolderMap = new Map(topLevel.map((f) => [f.displayName.toLowerCase(), f.id]));
  if (brandsParentId) {
    const children = await listChildFolders(accessToken, brandsParentId);
    for (const child of children) map.set(child.displayName.toLowerCase(), child.id);
  }
  return map;
}
