import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMangaDexContinueReading,
  MANGADEX_READING_PROGRESS_CHANGE_EVENT,
  type MangaDexContinueReadingItem,
} from "@/lib/mangaDexReadingProgress";

export function useMangaDexContinueReading() {
  const [items, setItems] = useState<MangaDexContinueReadingItem[]>(getMangaDexContinueReading);
  const sync = useCallback(() => setItems(getMangaDexContinueReading()), []);

  useEffect(() => {
    window.addEventListener("storage", sync);
    window.addEventListener(MANGADEX_READING_PROGRESS_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(MANGADEX_READING_PROGRESS_CHANGE_EVENT, sync);
    };
  }, [sync]);

  return useMemo(() => ({ items, count: items.length }), [items]);
}
