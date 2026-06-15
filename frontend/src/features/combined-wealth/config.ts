import type { CombinedWealthDepotKey } from "./model";

export const COMBINED_DEPOTS: Array<{ key: CombinedWealthDepotKey; label: string }> = [
  { key: "standard", label: "Depot" },
  { key: "retirement", label: "Altersvorsorgedepot" },
  { key: "child", label: "Kinderdepot" }
];
