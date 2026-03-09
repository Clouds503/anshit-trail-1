type SupportedBlockType = "heading" | "subheading" | "paragraph" | "list" | "image";

export type SeoContentBlock = {
  type: SupportedBlockType;
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  style?: Record<string, unknown>;
};

type NormalizeOptions = {
  heroTitle?: string;
  pageTitle?: string;
  excludedHeadings?: string[];
};

type MinimumWordOptions = {
  minWords?: number;
  pageLabel?: string;
  focusTopic?: string;
};

const DEFAULT_EXCLUDED_HEADINGS = [
  "common questions",
  "latest insights",
  "trending programs",
  "contact us",
  "our location & contact",
  "ready to start your tech career",
];

function normalizeText(value: unknown, maxLength = 1200): string {
  return `${value || ""}`.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeTextKey(value: unknown): string {
  return normalizeText(value, 400)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeListItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const output: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const value = normalizeText(item, 260);
    const key = normalizeTextKey(value);
    if (!value || !key || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

export function estimateUsefulWordCount(blocks: SeoContentBlock[]): number {
  const joined = blocks
    .map((block) => {
      if (block.type === "list") return (block.items || []).join(" ");
      if (block.type === "image") return "";
      return block.text || "";
    })
    .join(" ");

  const words = joined
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return words.length;
}

export function normalizeSeoContentBlocks(
  input: SeoContentBlock[] | unknown,
  options: NormalizeOptions = {},
): SeoContentBlock[] {
  const blocks = Array.isArray(input) ? (input as SeoContentBlock[]) : [];
  const output: SeoContentBlock[] = [];
  const seenHeadingKeys = new Set<string>();
  const seenImageKeys = new Set<string>();

  const blockedHeadingKeys = new Set<string>();
  for (const heading of DEFAULT_EXCLUDED_HEADINGS) blockedHeadingKeys.add(normalizeTextKey(heading));
  if (options.heroTitle) blockedHeadingKeys.add(normalizeTextKey(options.heroTitle));
  if (options.pageTitle) blockedHeadingKeys.add(normalizeTextKey(options.pageTitle));
  for (const heading of options.excludedHeadings || []) blockedHeadingKeys.add(normalizeTextKey(heading));

  let previousParagraphKey = "";
  for (const block of blocks) {
    const type = `${block?.type || ""}`.toLowerCase() as SupportedBlockType;
    if (!type) continue;

    if (type === "heading" || type === "subheading") {
      const text = normalizeText(block?.text, 220);
      const key = normalizeTextKey(text);
      if (!text || !key || blockedHeadingKeys.has(key) || seenHeadingKeys.has(key)) continue;
      seenHeadingKeys.add(key);
      output.push({ ...block, type, text });
      previousParagraphKey = "";
      continue;
    }

    if (type === "paragraph") {
      const text = normalizeText(block?.text, 2200);
      const key = normalizeTextKey(text);
      if (!text || !key) continue;
      if (previousParagraphKey && key === previousParagraphKey) continue;
      output.push({ ...block, type, text });
      previousParagraphKey = key;
      continue;
    }

    if (type === "list") {
      const items = dedupeListItems(block?.items);
      if (!items.length) continue;
      output.push({ ...block, type, items });
      previousParagraphKey = "";
      continue;
    }

    if (type === "image") {
      const url = normalizeText(block?.url, 1500);
      if (!url) continue;
      const alt = normalizeText(block?.alt, 180);
      const imageKey = `${url.toLowerCase()}|${normalizeTextKey(alt)}`;
      if (seenImageKeys.has(imageKey)) continue;
      seenImageKeys.add(imageKey);
      output.push({ ...block, type, url, alt });
      previousParagraphKey = "";
    }
  }

  return output;
}

export function ensureMinimumUsefulWords(
  input: SeoContentBlock[],
  options: MinimumWordOptions = {},
): SeoContentBlock[] {
  const minWords = Math.max(1, Number(options.minWords || 0) || 0);
  if (!minWords) return input;

  const pageLabel = normalizeText(options.pageLabel || "this page", 120);
  const focusTopic = normalizeText(options.focusTopic || "", 180);
  const normalizeOptions = {
    pageTitle: pageLabel,
    heroTitle: pageLabel,
  };
  let output = normalizeSeoContentBlocks(input, normalizeOptions);
  let currentWords = estimateUsefulWordCount(output);
  if (currentWords >= minWords) return output;

  const fillerBlocks: SeoContentBlock[] = [
    {
      type: "heading",
      text: `Practical roadmap for ${pageLabel}`,
    },
    {
      type: "paragraph",
      text:
        `This section gives a practical roadmap for ${pageLabel}. It explains what to learn first, what to practice regularly, and how to convert theory into measurable outcomes. ` +
        `Instead of generic advice, focus on building repeatable skills, documenting progress, and improving speed with quality. ` +
        `Use short learning cycles with revision, apply concepts in realistic tasks, and review outcomes every week so your performance improves consistently.`,
    },
    {
      type: "paragraph",
      text:
        `Plan your growth in milestones: fundamentals, guided practice, independent execution, and interview-ready communication. ` +
        `At each milestone, create work samples, improve problem solving, and strengthen decision making. ` +
        `Track quality, not only completion. If a concept looks easy, test it in a slightly harder context to build confidence and reduce future rework.`,
    },
    {
      type: "list",
      items: [
        `Define weekly outcomes for ${pageLabel} with clear completion criteria`,
        "Practice with real-world scenarios, not only short examples",
        "Capture mistakes and convert them into reusable checklists",
        "Review progress using metrics like speed, clarity, and consistency",
        "Build portfolio-grade outputs that demonstrate practical capability",
      ],
    },
  ];

  if (focusTopic) {
    fillerBlocks.push({
      type: "paragraph",
      text:
        `Keep your learning aligned to ${focusTopic}. Prioritize high-impact tasks, validate outcomes with feedback, and update your approach based on results. ` +
        `This keeps your progress relevant to real requirements while maintaining long-term depth.`,
    });
  }

  output = normalizeSeoContentBlocks([...output, ...fillerBlocks], normalizeOptions);
  currentWords = estimateUsefulWordCount(output);
  if (currentWords >= minWords) return output;

  for (let i = 1; i <= 6; i += 1) {
    const expansion: SeoContentBlock[] = [
      {
        type: "subheading",
        text: `Execution checklist for ${pageLabel} phase ${i}`,
      },
      {
        type: "paragraph",
        text:
          `Phase ${i} should focus on practical execution for ${pageLabel}. Break work into small milestones, validate each milestone with measurable outcomes, and capture decisions in concise implementation notes. ` +
          `This makes your progress easier to review, communicate, and improve in the next iteration.`,
      },
      {
        type: "paragraph",
        text:
          `Use a weekly review cycle to identify bottlenecks, improve quality, and increase consistency. ` +
          `Prioritize reusable patterns, clear naming, and defensible trade-off decisions so your work stays maintainable and interview-ready.`,
      },
      {
        type: "list",
        items: [
          `Define one high-impact goal for ${pageLabel} in phase ${i}`,
          "Apply concepts in a realistic task, not only in isolated examples",
          "Record blockers, mitigation steps, and final outcomes",
          "Refine implementation quality with targeted feedback",
        ],
      },
    ];

    output = normalizeSeoContentBlocks([...output, ...expansion], normalizeOptions);
    const nextWords = estimateUsefulWordCount(output);
    if (nextWords <= currentWords) break;
    currentWords = nextWords;
    if (currentWords >= minWords) break;
  }

  return output;
}
