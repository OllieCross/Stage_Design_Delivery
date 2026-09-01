import { readFileSync } from "fs";
import path from "path";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export const metadata = {
  title: "Changelog - White Production",
};

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), "CHANGELOG.md");
  const markdown = readFileSync(filePath, "utf-8");
  const rawHtml = marked(markdown) as string;
  // Inject a "Latest" badge into the first <h2> (most recent version header)
  const htmlWithBadge = rawHtml.replace(
    /(<h2[^>]*>)(.*?)(<\/h2>)/,
    '$1$2 <span style="font-size:11px;font-weight:600;background:color-mix(in srgb, var(--foreground) 12%, transparent);color:var(--foreground);padding:2px 8px;border-radius:9999px;vertical-align:middle;margin-left:8px;letter-spacing:0.04em">Latest</span>$3',
  );
  const html = DOMPurify.sanitize(htmlWithBadge);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article className="prose-changelog" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
