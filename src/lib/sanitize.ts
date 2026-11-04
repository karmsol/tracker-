/** Task text is untrusted. Store it as plain markdown, never as HTML. */
export function sanitizeText(input: string, max = 20_000) {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

export function untrustedBlock(label: string, text: string) {
  const clean = sanitizeText(text, 4_000).replace(/<\/?user_data>/gi, "");
  return `<user_data label="${label}">\n${clean}\n</user_data>`;
}
