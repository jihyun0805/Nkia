import { redirect } from "next/navigation"

export default async function FindingNewRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const { tab } = (await searchParams) ?? {}
  if (tab === "customers") redirect("/finding/new/customers")
  if (tab === "partners") redirect("/finding/new/partners")
  redirect("/finding/new/opportunities")
}
