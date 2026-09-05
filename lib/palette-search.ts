export interface PaletteItem {
  href: string;
  /** Extra searchable words the label does not contain. */
  keywords?: string;
  label: string;
}

export interface PaletteMatch {
  href: string;
  label: string;
  score: number;
}

const SCORE_EXACT_PREFIX = 100;
const SCORE_WORD_PREFIX = 80;
const SCORE_SUBSTRING = 60;
const SCORE_KEYWORD = 40;

const scoreFor = (query: string, item: PaletteItem): number | null => {
  const label = item.label.toLowerCase();
  if (label.startsWith(query)) {
    return SCORE_EXACT_PREFIX;
  }
  if (label.split(/\s+/).some((word) => word.startsWith(query))) {
    return SCORE_WORD_PREFIX;
  }
  if (label.includes(query)) {
    return SCORE_SUBSTRING;
  }
  if ((item.keywords ?? "").toLowerCase().includes(query)) {
    return SCORE_KEYWORD;
  }
  return null;
};

/**
 * Ranks palette items for a query: label prefixes beat word starts, which
 * beat substrings, which beat keyword matches; ties keep the input order.
 * An empty query lists everything unranked.
 */
export const searchPalette = (
  query: string,
  items: PaletteItem[]
): PaletteMatch[] => {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === "") {
    return items.map((item) => ({
      href: item.href,
      label: item.label,
      score: 0,
    }));
  }
  return items
    .map((item) => {
      const score = scoreFor(trimmed, item);
      return score === null
        ? undefined
        : { href: item.href, label: item.label, score };
    })
    .filter((match): match is PaletteMatch => match !== undefined)
    .toSorted((a, b) => b.score - a.score || a.label.localeCompare(b.label));
};
