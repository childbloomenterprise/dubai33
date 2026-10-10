import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { expect, it, vi } from "vitest";
it("service worker never intercepts authenticated API or third-party requests", async () => {
  const listeners = new Map<string, Function>();
  const source = await readFile(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );
  const cache = vi.fn();
  vm.runInNewContext(source, {
    self: {
      location: { origin: "https://linc.test" },
      addEventListener: (name: string, fn: Function) => listeners.set(name, fn),
      skipWaiting: () => {},
      clients: { claim: () => {} },
    },
    URL,
    caches: { open: cache, match: cache, keys: cache },
    fetch: cache,
  });
  for (const request of [
    new Request("https://linc.test/api/chat"),
    new Request("https://linc.test/assets/private", {
      headers: { Authorization: "Bearer private" },
    }),
    new Request("https://project.supabase.co/rest/v1/journey_events"),
  ]) {
    const respondWith = vi.fn();
    listeners.get("fetch")!({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  }
  expect(cache).not.toHaveBeenCalled();
});
