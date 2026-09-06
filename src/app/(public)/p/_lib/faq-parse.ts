import type { FaqItem } from "@/components/site/FaqAccordion";

/**
 * Best-effort parser that turns FAQ markdown sections into accordion items.
 *
 * The seeded faq page stores each Q&A as ONE markdown section whose first line
 * is `## Question` followed by a paragraph answer:
 *
 *   ## How do I book a Hajj or Umrah package?
 *   Reach us by phone, WhatsApp or the contact form and tell us …
 *
 * FaqAccordion renders the answer as PLAIN TEXT (it is a client island and we
 * deliberately don't ship react-markdown to the client bundle), so this parser
 * only claims a section when the answer is genuinely plain: exactly one
 * `## heading` + body, no multi-paragraph breaks and no markdown constructs
 * (headings, lists, links/images, emphasis, code). If ANY section fails that
 * bar the whole page falls back to prose rendering (see /p/[slug]/page.tsx) —
 * a conservative choice that never lets markdown characters leak into an
 * accordion as literal `**stars**`.
 *
 * Returns `null` when the page is not a clean Q&A set.
 */

const RICH_SIGNALS: RegExp[] = [
  /^#{1,6}\s/m, // atx heading
  /^\s*[-*+]\s/m, // bullet list
  /^\s*\d+\.\s/m, // numbered list
  /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m, // thematic break
  /[*_]/, // emphasis / bold
  /`/, // inline code or code block
  /\[|\]/, // link / image / reference
];

function isPlainAnswer(answer: string): boolean {
  if (/\n\s*\n/.test(answer)) return false; // paragraph break -> needs prose rhythm
  return !RICH_SIGNALS.some((pattern) => pattern.test(answer));
}

export function tryParseFaqSections(
  sections: readonly { content: string }[],
): FaqItem[] | null {
  const items: FaqItem[] = [];
  for (const section of sections) {
    const match = section.content.match(/^##\s+(.+?)[\r\n]+([\s\S]*)$/);
    if (!match) return null;
    const question = match[1].trim();
    const answer = match[2].trim();
    if (!question || !answer || !isPlainAnswer(answer)) return null;
    items.push({ question, answer });
  }
  return items.length > 0 ? items : null;
}
