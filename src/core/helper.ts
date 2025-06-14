export function normalizeNumber(input: string): string {
  try {
    return input.replace(/\s+/g, "").replace(/\D/g, "").replace(/^0+/, "");
  } catch (error) {
    console.error("Error normalizing number:", error);
    return input; // Return the original input in case of an error
  }
}
