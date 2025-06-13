export function normalizeNumber(input: string): string {
  return input.replace(/\s+/g, "").replace(/\D/g, "").replace(/^0+/, "");
}
