import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLocalStorageAssetPath } from "./storageProxy";

describe("resolveLocalStorageAssetPath", () => {
  it("resolves an asset key within the configured local asset directory", () => {
    expect(resolveLocalStorageAssetPath("/tmp/anima-assets", "anima-brand-mark.png")).toBe(
      path.resolve("/tmp/anima-assets/anima-brand-mark.png"),
    );
  });

  it("rejects missing directories, blank keys, and paths that leave the configured directory", () => {
    expect(resolveLocalStorageAssetPath(undefined, "anima-brand-mark.png")).toBeNull();
    expect(resolveLocalStorageAssetPath("/tmp/anima-assets", "")).toBeNull();
    expect(resolveLocalStorageAssetPath("/tmp/anima-assets", "../outside.png")).toBeNull();
  });
});
