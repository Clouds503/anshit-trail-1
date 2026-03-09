export type BlogContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "list"; items: string[] };

const imagePattern = /^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/;
const headingPattern = /^(#{1,6})\s+(.+)$/;
const listPattern = /^[-*]\s+(.+)$/;

function isSpecialLine(line: string) {
  return imagePattern.test(line) || headingPattern.test(line) || listPattern.test(line);
}

export function parseMarkdownToBlocks(markdown: string): BlogContentBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlogContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const imageMatch = line.match(imagePattern);
    if (imageMatch) {
      blocks.push({ type: "image", alt: imageMatch[1] || "", src: imageMatch[2] });
      i++;
      continue;
    }

    const headingMatch = line.match(headingPattern);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    const listMatch = line.match(listPattern);
    if (listMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        const currentMatch = current.match(listPattern);
        if (!currentMatch) break;
        items.push(currentMatch[1]);
        i++;
      }
      if (items.length) blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || isSpecialLine(next)) break;
      paragraph.push(next);
      i++;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}
