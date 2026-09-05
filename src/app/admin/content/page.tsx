import { redirect } from "next/navigation";

/**
 * /admin/content is the section root — land editors on the posts manager.
 */
export default function ContentIndexPage() {
  redirect("/admin/content/posts");
}
