import { afterEach } from "vitest";

// Testing Library only auto-cleans when Vitest globals are on; they're off here, so unmount explicitly.
afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
