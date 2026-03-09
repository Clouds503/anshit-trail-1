/**
 * Robustly parse JSON from AI responses.
 * 1. Strip markdown fences
 * 2. Extract JSON object/array
 * 3. Try parsing as-is first (preserving structural whitespace)
 * 4. If that fails, sanitize control chars inside string values only
 */
export function parseAIJson(raw: string): any {
  let cleaned = raw.trim();

  // Remove markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, "").replace(/\n?```\s*$/gm, "").trim();

  // Extract outermost JSON structure
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);

  // Prefer array if it starts with [, otherwise object
  if (cleaned.trimStart().startsWith("[") && arrayMatch) {
    cleaned = arrayMatch[0];
  } else if (objectMatch) {
    cleaned = objectMatch[0];
  } else if (arrayMatch) {
    cleaned = arrayMatch[0];
  }

  // Attempt 1: parse as-is (works for well-formed JSON with structural newlines)
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    // continue to sanitization
  }

  // Attempt 2: sanitize control characters INSIDE string values only
  // Walk through the string tracking whether we're inside a JSON string
  const chars: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escaped) {
      chars.push(ch);
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      chars.push(ch);
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      chars.push(ch);
      continue;
    }

    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20 || code === 0x7f) {
        // Replace control chars inside strings with escaped versions
        if (ch === '\n') { chars.push('\\n'); }
        else if (ch === '\r') { chars.push('\\r'); }
        else if (ch === '\t') { chars.push('\\t'); }
        // else skip the char
        continue;
      }
    }

    chars.push(ch);
  }

  const sanitized = chars.join('');

  try {
    return JSON.parse(sanitized);
  } catch (e) {
    console.error("parseAIJson final failure. First 500 chars:", sanitized.substring(0, 500));
    throw e;
  }
}
