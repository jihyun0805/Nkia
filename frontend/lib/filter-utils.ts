export type FilterValues = {
  status: string
  owner: string
  dateFrom: string
  dateTo: string
  fields: Record<string, string>
}

export const defaultFilterValues: FilterValues = {
  status: "",
  owner: "",
  dateFrom: "",
  dateTo: "",
  fields: {},
}

type FilterAccessors<T> = {
  status?: (item: T) => string | undefined
  owner?: (item: T) => string | undefined
  date?: (item: T) => string | undefined
  fields?: Record<string, (item: T) => string | number | undefined | null>
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function uniqueOptions<T>(
  items: T[],
  accessor: (item: T) => string | number | undefined | null,
) {
  return Array.from(
    new Set(
      items
        .map((item) => accessor(item))
        .filter((value): value is string | number => value !== undefined && value !== null)
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  )
}

export function filterRecords<T>(
  items: T[],
  filters: FilterValues,
  accessors: FilterAccessors<T>,
) {
  const ownerQuery = filters.owner.trim().toLowerCase()
  const fieldEntries = Object.entries(filters.fields ?? {}).filter(([, value]) => value)

  return items.filter((item) => {
    if (filters.status && accessors.status) {
      const status = accessors.status(item)?.trim()
      if (status !== filters.status) return false
    }

    if (ownerQuery && accessors.owner) {
      const owner = accessors.owner(item)?.toLowerCase() ?? ""
      if (!owner.includes(ownerQuery)) return false
    }

    if ((filters.dateFrom || filters.dateTo) && accessors.date) {
      const date = accessors.date(item)
      if (date && DATE_PATTERN.test(date)) {
        if (filters.dateFrom && date < filters.dateFrom) return false
        if (filters.dateTo && date > filters.dateTo) return false
      }
    }

    for (const [key, expectedValue] of fieldEntries) {
      const accessor = accessors.fields?.[key]
      if (!accessor) continue

      const actualValue = accessor(item)
      if (actualValue === undefined || actualValue === null) return false
      if (String(actualValue).trim() !== expectedValue) return false
    }

    return true
  })
}
