export const STUB_MARKER =
  "# Stealth remote file — open or save to load from GitHub.\n";

export function isStubContent(buffer: Uint8Array | Buffer): boolean {
  const text = Buffer.from(buffer).toString("utf-8");
  return text === STUB_MARKER || text.startsWith(STUB_MARKER.trim());
}

export function documentTextIsStub(text: string): boolean {
  const marker = STUB_MARKER.trim();
  return (
    text === STUB_MARKER ||
    text === `${marker}\n` ||
    text.startsWith(marker)
  );
}
