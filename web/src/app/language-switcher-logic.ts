export function localeSwitchHref(
  pathname: string,
  search: string,
  hash: string,
) {
  const query = search
    ? search.startsWith("?")
      ? search
      : `?${search}`
    : "";
  const fragment = hash
    ? hash.startsWith("#")
      ? hash
      : `#${hash}`
    : "";
  return `${pathname}${query}${fragment}`;
}

export function languageMenuTargetIndex(
  key: string,
  currentIndex: number,
  optionCount: number,
) {
  if (optionCount <= 0) return null;
  switch (key) {
    case "ArrowDown":
      return (currentIndex + 1) % optionCount;
    case "ArrowUp":
      return (currentIndex - 1 + optionCount) % optionCount;
    case "Home":
      return 0;
    case "End":
      return optionCount - 1;
    default:
      return null;
  }
}
