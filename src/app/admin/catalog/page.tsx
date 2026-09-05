import { redirect } from "next/navigation";

/**
 * /admin/catalog is the section root — land editors on the listing manager.
 */
export default function CatalogIndexPage() {
  redirect("/admin/catalog/listings");
}
