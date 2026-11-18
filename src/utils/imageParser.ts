/**
 * Parses base64 encoded data (with or without data URL prefix) into a Buffer and MIME type.
 */
export function parseBase64Image(dataString: string): { buffer: Buffer; mime: string } {
  const match = dataString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return {
      mime: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }
  return {
    mime: 'image/jpeg',
    buffer: Buffer.from(dataString, 'base64'),
  };
}

/**
 * Checks if a string looks like base64 or a data URL
 */
export function isBase64Image(str: string): boolean {
  if (!str) return false;
  return str.startsWith('data:image/') || str.length > 500;
}
