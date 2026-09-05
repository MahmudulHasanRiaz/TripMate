import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type ProseMarkdownProps = {
  /** Markdown source (e.g. a listing description or a post body). */
  children: string;
  className?: string;
};

/**
 * Sanitized markdown body used by public long-form content (package
 * descriptions today, blog/pages in Task 12). react-markdown renders safely by
 * default (raw HTML is not passed through); rehype-sanitize strips any
 * remaining markup as a second belt-and-suspenders layer — the global
 * "markdown via react-markdown + rehype-sanitize ONLY" constraint, no
 * dangerouslySetInnerHTML anywhere.
 *
 * The wrapper carries `.prose-tripmate` (globals.css) which supplies the
 * token-based typography rhythm for rendered markdown.
 */
export function ProseMarkdown({ children, className }: ProseMarkdownProps) {
  return (
    <div className={className ?? "prose-tripmate"}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{children}</ReactMarkdown>
    </div>
  );
}
