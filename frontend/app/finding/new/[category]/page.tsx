import { redirect } from "next/navigation"
import { FindingCategoryNewPageView } from "../finding-category-new-page-view"

export default async function FindingCategoryNewPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  if (category !== "opportunities" && category !== "customers" && category !== "partners") {
    redirect("/finding/new/opportunities")
  }

  return <FindingCategoryNewPageView category={category} />
}
