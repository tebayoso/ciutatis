const DEFAULT_CAPTURE_LIMIT_BYTES = 1024 * 1024;
const DEFAULT_JSON_LIMIT_BYTES = 2 * 1024 * 1024;

export function createCapturedOutputBuffer(limitBytes = DEFAULT_CAPTURE_LIMIT_BYTES) {
  const chunks = [];
  let capturedBytes = 0;
  let truncated = false;

  return {
    append(chunk) {
      if (truncated) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      const remaining = limitBytes - capturedBytes;
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      if (buffer.byteLength > remaining) {
        chunks.push(buffer.subarray(0, remaining));
        capturedBytes += remaining;
        truncated = true;
        return;
      }
      chunks.push(buffer);
      capturedBytes += buffer.byteLength;
    },
    finish() {
      const text = Buffer.concat(chunks).toString("utf8");
      return {
        text: truncated ? `${text}\n[output truncated at ${limitBytes} bytes]` : text,
        truncated,
      };
    },
  };
}

export async function parseJsonResponseWithLimit(response, limitBytes = DEFAULT_JSON_LIMIT_BYTES) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > limitBytes) {
    throw new Error(`JSON response exceeded the configured size limit of ${limitBytes} bytes`);
  }
  return JSON.parse(text);
}
