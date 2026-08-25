export async function copyToClipboard(
  value: string
) {
  await navigator.clipboard.writeText(value);
}

export function includesSearch(
  value: string,
  search: string
) {
  return value
    .toLowerCase()
    .includes(search.toLowerCase());
}