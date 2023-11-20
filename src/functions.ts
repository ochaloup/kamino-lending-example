export function say(word: string): string {
  return word
}

export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
