export type CurrentUser = {
  id: string
  name: string
  email: string
  department: string
  role: string
}

export const currentUser: CurrentUser = {
  id: "USR-001",
  name: "김영업",
  email: "kim.sales@Nkia.com",
  department: "영업본부",
  role: "영업대표",
}
