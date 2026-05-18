"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EntityAutocomplete } from "@/components/erp/entity-autocomplete"
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete"
import { currentUser } from "@/lib/current-user"
import { type QuotationRecord } from "@/lib/activity-data"
import { adminApi, type ProductModuleResponse } from "@/lib/api/admin-api"
import { getCustomerByCode, getCustomerByName, normalizeCustomerKeyword, type CustomerRecord } from "@/lib/finding-data"
import {
  loadBackendFindingData,
  loadBackendProjectOpportunitiesByCustomer,
  type ProjectOpportunitySummaryResponse,
} from "@/lib/finding-backend"
import type { EntitySuggestion } from "@/lib/entity-suggestions-api"

export type QuotationFormState = Omit<QuotationRecord, "id">

type QuotationSheetProps = {
  mode: "create" | "edit" | "detail"
  form: QuotationFormState
  referenceId?: string
  onChange?: (updater: (prev: QuotationFormState) => QuotationFormState) => void
}

function parseCurrency(value: string) {
  return Number.parseInt(value.replace(/[^\d]/g, "") || "0", 10)
}

function parseQuantity(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, "") || "1")
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function formatCurrency(value: string) {
  const amount = parseCurrency(value)
  return amount ? amount.toLocaleString("ko-KR") : ""
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0"
  return String(Math.round(value))
}

function formatDiscountValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0"
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}

function calculateDiscountRate(consumerUnitPrice: number, supplyUnitPrice: number) {
  if (consumerUnitPrice <= 0 || supplyUnitPrice <= 0 || supplyUnitPrice >= consumerUnitPrice) return 0
  return ((consumerUnitPrice - supplyUnitPrice) / consumerUnitPrice) * 100
}

function formatDiscountRate(value: string | number | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""))
  return Number.isFinite(numericValue) && numericValue > 0 ? `${formatDiscountValue(numericValue)}%` : "-"
}

function formatMaybeDash(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return digits ? Number.parseInt(digits, 10).toLocaleString("ko-KR") : value || "-"
}

function sumBy<T>(rows: T[], selector: (row: T) => string | undefined) {
  return rows.reduce((acc, row) => acc + parseCurrency(selector(row) ?? ""), 0)
}

function addDays(dateString: string, days: number) {
  if (!dateString) return ""
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function chunkRows<T>(rows: T[], size: number) {
  if (rows.length === 0) return [[] as T[]]
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}

function estimateWrappedLineCount(value: string | undefined, charsPerLine: number) {
  const normalized = (value ?? "").trim()
  if (!normalized) return 1

  return normalized
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
}

function sumHeights<T>(rows: T[], estimate: (row: T) => number) {
  return rows.reduce((total, row) => total + estimate(row), 0)
}

function paginateRowsByHeight<T>(
  rows: T[],
  pageHeights: number[],
  estimateRowHeight: (row: T) => number,
  finalReservedHeight = 0,
) {
  if (rows.length === 0) return [[] as T[]]

  const getPageHeight = (pageIndex: number) => pageHeights[Math.min(pageIndex, pageHeights.length - 1)]
  const chunks: { rows: T[]; usedHeight: number }[] = []
  let currentRows: T[] = []
  let currentHeight = 0
  let pageIndex = 0

  for (const row of rows) {
    const rowHeight = estimateRowHeight(row)
    const pageHeight = getPageHeight(pageIndex)

    if (currentRows.length > 0 && currentHeight + rowHeight > pageHeight) {
      chunks.push({ rows: currentRows, usedHeight: currentHeight })
      currentRows = [row]
      currentHeight = rowHeight
      pageIndex += 1
      continue
    }

    currentRows.push(row)
    currentHeight += rowHeight
  }

  chunks.push({ rows: currentRows, usedHeight: currentHeight })

  while (chunks.length > 0) {
    const lastIndex = chunks.length - 1
    const lastChunk = chunks[lastIndex]
    const lastPageHeight = getPageHeight(lastIndex)

    if (lastChunk.usedHeight + finalReservedHeight <= lastPageHeight || lastChunk.rows.length <= 1) {
      break
    }

    const overflowRows: T[] = []
    let overflowHeight = 0

    while (lastChunk.rows.length > 1 && lastChunk.usedHeight + finalReservedHeight > lastPageHeight) {
      const movedRow = lastChunk.rows.pop()
      if (!movedRow) break
      const movedHeight = estimateRowHeight(movedRow)
      overflowRows.unshift(movedRow)
      overflowHeight += movedHeight
      lastChunk.usedHeight -= movedHeight
    }

    if (overflowRows.length === 0) {
      break
    }

    chunks.push({ rows: overflowRows, usedHeight: overflowHeight })
  }

  return chunks.map((chunk) => chunk.rows)
}

function estimateSolutionRowHeight(
  row: {
    category?: string
    module?: string
    note?: string
    consumerUnitPrice?: string
    consumerTotal?: string
    supplyUnitPrice?: string
    supplyTotal?: string
  },
  compact: boolean,
) {
  const maxLines = Math.max(
    estimateWrappedLineCount(row.category, compact ? 10 : 12),
    estimateWrappedLineCount(row.module, compact ? 28 : 34),
    estimateWrappedLineCount(row.note, compact ? 8 : 10),
    estimateWrappedLineCount(row.consumerUnitPrice, 10),
    estimateWrappedLineCount(row.consumerTotal, 10),
    estimateWrappedLineCount(row.supplyUnitPrice, 10),
    estimateWrappedLineCount(row.supplyTotal, 10),
  )

  return (compact ? 34 : 38) + (maxLines - 1) * (compact ? 16 : 18)
}

function estimateCustomizingRowHeight(
  row: { item?: string; laborRate?: string; manMonth?: string; supplyAmount?: string },
  compact: boolean,
) {
  const maxLines = Math.max(
    estimateWrappedLineCount(row.item, compact ? 34 : 42),
    estimateWrappedLineCount(row.laborRate, 12),
    estimateWrappedLineCount(row.manMonth, 12),
    estimateWrappedLineCount(row.supplyAmount, 12),
  )

  return (compact ? 32 : 36) + (maxLines - 1) * (compact ? 16 : 18)
}

function baseSolutionRows() {
  return [
    { id: "", rowNo: "1", category: "", module: "", quantity: "", consumerUnitPrice: "", consumerTotal: "", supplyUnitPrice: "", supplyTotal: "", discountRate: "", note: "" },
  ]
}

function baseCustomizingRows() {
  return Array.from({ length: 6 }, (_, index) => ({
    id: `CUSTOM-${index + 1}`,
    rowNo: String(index + 1),
    item: getFixedCustomizingItem(index),
    laborRate: "",
    manMonth: "",
    supplyAmount: "",
  }))
}

const fixedExecutiveName = "이선우"
const fixedContactName = "진원경"

const customizingItemLabels = [
  "인건비 (특급)",
  "인건비 (고급)",
  "인건비 (중급)",
  "인건비 (초급)",
  "제 경 비",
  "기 술 료",
] as const

function getFixedCustomizingItem(index: number) {
  return customizingItemLabels[index] ?? ""
}

function isManualCustomizingRow(index: number) {
  return index >= 4
}

function normalizeCustomizingRows(rows: QuotationFormState["customizingRows"] | undefined) {
  return Array.from({ length: 6 }, (_, index) => {
    const row = rows?.[index]
    const laborRate = parseCurrency(row?.laborRate ?? "")
    const manMonth = parseQuantity(row?.manMonth ?? "")
    const manualSupplyAmount = row?.supplyAmount?.trim() ?? ""
    return {
      id: row?.id ?? `CUSTOM-${index + 1}`,
      rowNo: String(index + 1),
      item: row?.item?.trim() || getFixedCustomizingItem(index),
      laborRate: row?.laborRate ?? "",
      manMonth: row?.manMonth ?? "",
      supplyAmount: isManualCustomizingRow(index)
        ? manualSupplyAmount
        : laborRate > 0 && manMonth > 0
          ? formatNumber(laborRate * manMonth)
          : manualSupplyAmount,
    }
  })
}

function defaultTemplateText() {
  return {
    headerBrand: "NKIA",
    headerCompanyName: "주식회사 엔키아",
    documentTitle: "見 積 書",
    refLabel: "Ref No :",
    recipientSuffix: "귀중",
    introText: "아래와 같이 견적합니다(견적일로부터 30일간 유효)",
    quoteDateLabel: "견적일자:",
    paymentTermsLabel: "대금결제조건:",
    businessNameLabel: "사업명:",
    totalAmountLabel: "합계금액:",
    totalAmountSuffix: "",
    unitNote: "(단위 : 원 , VAT별도)",
    remarksTitle: "특기사항",
    evidenceTitle: "금액산출근거표",
    supplierName: "(주)엔키아",
    addressLine1: "경기도 성남시 분당구 대왕판교로",
    addressLine2: "660 유스페이스1 B동 10층",
    ceoLabel: "대표이사 :",
    ceoName: "",
    telLabel: "TEL :",
    tel: "02-2057-8724",
    faxLabel: "FAX :",
    fax: "02-2057-8725",
    contactLabel: "담당자:",
  }
}

function getProductGroupChoices(products: ProductModuleResponse[]) {
  const seen = new Set<string>()
  return products
    .map((product) => {
      const productGroup = product.productGroup?.trim() ?? ""
      if (!productGroup || seen.has(productGroup)) return null
      seen.add(productGroup)
      const productClasses = products
        .filter((item) => (item.productGroup?.trim() ?? "") === productGroup)
        .map((item) => item.productClass?.toString().trim() ?? "")
        .filter((value, index, array) => value && array.indexOf(value) === index)

      return {
        value: productGroup,
        label: productGroup,
        subtitle: productClasses.join(" · ") || null,
      }
    })
    .filter((item): item is { value: string; label: string; subtitle: string | null } => item !== null)
}

function getProductNameChoices(products: ProductModuleResponse[], group: string) {
  const normalizedGroup = group.trim()
  return products
    .filter((product) => (product.productGroup?.trim() ?? "") === normalizedGroup)
    .map((product) => ({
      value: product.productName?.trim() ?? "",
      label: product.productName?.trim() ?? "",
      subtitle: [product.productGroup?.trim(), product.productClass?.toString().trim()].filter(Boolean).join(" · ") || null,
    }))
    .filter((item): item is { value: string; label: string; subtitle: string | null } => Boolean(item.value))
}

function resolveProductModulePrice(products: ProductModuleResponse[], category?: string, module?: string) {
  const normalizedCategory = category?.trim() ?? ""
  const normalizedModule = module?.trim() ?? ""
  if (!normalizedCategory || !normalizedModule) return null

  return (
    products.find((product) => {
      const productGroup = product.productGroup?.trim() ?? ""
      const productName = product.productName?.trim() ?? ""
      return productGroup === normalizedCategory && productName === normalizedModule
    }) ?? null
  )
}

function syncSolutionRowValues(
  row: NonNullable<QuotationFormState["solutionRows"]>[number],
  products: ProductModuleResponse[],
) {
  const matchedProduct = resolveProductModulePrice(products, row.category, row.module)
  const quantity = parseQuantity(row.quantity)
  const consumerUnitPrice = parseCurrency(
    matchedProduct?.unitPrice != null ? String(matchedProduct.unitPrice) : row.consumerUnitPrice,
  )
  const rawSupplyUnitPrice = row.supplyUnitPrice.trim()
  const supplyUnitPrice = rawSupplyUnitPrice === "" ? null : parseCurrency(rawSupplyUnitPrice)
  const effectiveSupplyUnitPrice =
    supplyUnitPrice === null
      ? null
      : consumerUnitPrice > 0 && supplyUnitPrice >= consumerUnitPrice
        ? Math.max(0, consumerUnitPrice - 1)
        : supplyUnitPrice
  const consumerTotal = consumerUnitPrice * quantity
  const supplyTotal = (effectiveSupplyUnitPrice ?? 0) * quantity
  const discountRate = effectiveSupplyUnitPrice === null ? 0 : calculateDiscountRate(consumerUnitPrice, effectiveSupplyUnitPrice)

  return {
    ...row,
    category: row.category.trim(),
    module: row.module.trim(),
    quantity: row.quantity.replace(/[^\d.]/g, ""),
    consumerUnitPrice: formatNumber(consumerUnitPrice),
    consumerTotal: formatNumber(consumerTotal),
    supplyUnitPrice: effectiveSupplyUnitPrice === null ? "" : formatNumber(effectiveSupplyUnitPrice),
    supplyTotal: formatNumber(supplyTotal),
    discountRate: formatDiscountValue(discountRate),
    note: row.note.trim(),
  }
}

export function createEmptyQuotationForm(): QuotationFormState {
  const today = new Date().toISOString().slice(0, 10)

  return {
    refNumber: "",
    date: today,
    customerCode: "",
    opportunityCode: "",
    customer: "",
    opportunity: "",
    proposalType: "자체 제안",
    productGroup: "EMS",
    salesRep: currentUser.name,
    paymentTerms: "현금",
    contactName: "",
    items: [
      { id: "", name: "1) Solution Package", amount: "" },
      { id: "", name: "2) 인건비-커스터마이징", amount: "" },
    ],
    solutionSectionTitle: "1) Solution Package",
    solutionRows: baseSolutionRows(),
    customizingSectionTitle: "2) 인건비-커스터마이징",
    customizingRows: baseCustomizingRows(),
    templateText: defaultTemplateText(),
    approvalFlow: {
      drafter: currentUser.name,
      firstApprover: "팀장",
      secondApprover: "본부장",
      secondApproverOptional: true,
      distributor: "없음",
      sharedWith: "권한 보유자",
    },
    approvalProcess: {
      overallStatus: "진행중",
      currentStepIndex: 0,
      steps: [
        { label: "상신자", assignee: currentUser.name, status: "pending" },
        { label: "팀장", assignee: "팀장", status: "pending" },
        { label: "본부장", assignee: "본부장", status: "pending" },
        { label: "사업본부장", assignee: "사업본부장", status: "pending" },
        { label: "경영지원팀장", assignee: "경영지원팀장", status: "pending" },
        { label: "대표이사", assignee: "대표이사", status: "pending" },
      ],
    },
    changeHistory: [],
    remarks: "",
    amount: "0",
    validity: "",
    status: "검토중",
  }
}

export function normalizeQuotationForm(form: QuotationFormState): QuotationFormState {
  const normalizedCustomer = form.customer.trim()
  const matchedCustomer = getCustomerByName(normalizedCustomer)

  const solutionRows = (form.solutionRows ?? [])
    .map((row) => {
      const quantity = parseQuantity(row.quantity)
      const consumerUnitPrice = parseCurrency(row.consumerUnitPrice)
      const rawSupplyUnitPrice = parseCurrency(row.supplyUnitPrice)
      const fallbackSupplyUnitPrice = Math.round(parseCurrency(row.supplyTotal) / quantity)
      const requestedSupplyUnitPrice = rawSupplyUnitPrice || fallbackSupplyUnitPrice
      const supplyUnitPrice =
        consumerUnitPrice > 0 && requestedSupplyUnitPrice >= consumerUnitPrice
          ? Math.max(0, consumerUnitPrice - 1)
          : requestedSupplyUnitPrice
      const consumerTotal = consumerUnitPrice * quantity
      const supplyTotal = supplyUnitPrice * quantity
      const discountRate = calculateDiscountRate(consumerUnitPrice, supplyUnitPrice)

      return {
        ...row,
        rowNo: row.rowNo.trim(),
        category: row.category.trim(),
        module: row.module.trim(),
        quantity: row.quantity.replace(/[^\d.]/g, ""),
        consumerUnitPrice: formatNumber(consumerUnitPrice),
        consumerTotal: formatNumber(consumerTotal),
        supplyUnitPrice: formatNumber(supplyUnitPrice),
        supplyTotal: formatNumber(supplyTotal),
        discountRate: formatDiscountValue(discountRate),
        note: row.note.trim(),
      }
    })
    .filter((row) => Object.values(row).some((value) => value && value !== row.id))

  const normalizedCustomizingRows = normalizeCustomizingRows(form.customizingRows).map((row) => ({
    ...row,
    item: row.item.trim(),
    laborRate: row.laborRate.replace(/[^\d]/g, ""),
    manMonth: row.manMonth.replace(/[^\d.]/g, ""),
    supplyAmount: row.supplyAmount === "-" ? "-" : row.supplyAmount.replace(/[^\d]/g, ""),
  }))
  const normalizedSolutionRows = solutionRows.length > 0 ? solutionRows : baseSolutionRows()
  const solutionAmount = sumBy(normalizedSolutionRows, (row) => row.supplyTotal)
  const customizingAmount = sumBy(
    normalizedCustomizingRows.filter((row) => row.supplyAmount !== "-"),
    (row) => row.supplyAmount,
  )

  const items = (form.items ?? [])
    .map((item, index) => ({
      ...item,
      id: item.id || `TEMP-ITEM-${index + 1}`,
      name: item.name.trim(),
      amount: item.amount.replace(/[^\d]/g, ""),
    }))
    .filter((item) => item.name || item.amount)

  const normalizedItems = [
    {
      id: items[0]?.id ?? "TEMP-ITEM-1",
      name: form.solutionSectionTitle?.trim() || items[0]?.name || "1) Solution Package",
      amount: String(solutionAmount),
    },
    {
      id: items[1]?.id ?? "TEMP-ITEM-2",
      name: form.customizingSectionTitle?.trim() || items[1]?.name || "2) 인건비-커스터마이징",
      amount: String(customizingAmount),
    },
    ...items.slice(2),
  ]

  const totalAmount = sumBy(normalizedItems, (item) => item.amount)

  return {
    ...form,
    customer: normalizedCustomer,
    customerCode: matchedCustomer?.id ?? form.customerCode?.trim() ?? "",
    opportunity: form.opportunity.trim(),
    opportunityCode: form.opportunityCode?.trim() || "",
    salesRep: form.salesRep.trim(),
    paymentTerms: form.paymentTerms?.trim() ?? "",
    contactName: form.contactName?.trim() ?? "",
    solutionSectionTitle: form.solutionSectionTitle?.trim() || normalizedItems[0]?.name || "1) Solution Package",
    solutionRows: normalizedSolutionRows,
    customizingSectionTitle: form.customizingSectionTitle?.trim() || normalizedItems[1]?.name || "2) 인건비-커스터마이징",
    customizingRows: normalizedCustomizingRows,
    items: normalizedItems,
    templateText: {
      ...defaultTemplateText(),
      ...(form.templateText ?? {}),
    },
    approvalFlow: form.approvalFlow ?? {
      drafter: form.salesRep.trim() || currentUser.name,
      firstApprover: "팀장",
      secondApprover: "본부장",
      secondApproverOptional: true,
      distributor: "없음",
      sharedWith: "권한 보유자",
    },
    approvalProcess:
      form.approvalProcess ?? {
        overallStatus: "진행중",
        currentStepIndex: 0,
        steps: [
          { label: "상신자", assignee: form.salesRep.trim() || currentUser.name, status: "pending" },
          { label: "팀장", assignee: "팀장", status: "pending" },
          { label: "본부장", assignee: "본부장", status: "pending" },
          { label: "사업본부장", assignee: "사업본부장", status: "pending" },
          { label: "경영지원팀장", assignee: "경영지원팀장", status: "pending" },
          { label: "대표이사", assignee: "대표이사", status: "pending" },
        ],
      },
    changeHistory: form.changeHistory ?? [],
    remarks: form.remarks ?? "",
    amount: String(totalAmount),
    validity: form.validity || addDays(form.date, 30),
  }
}

export function QuotationSheet({ mode, form, referenceId, onChange }: QuotationSheetProps) {
  const readOnly = mode === "detail"
  const EVIDENCE_SINGLE_PAGE_HEIGHT = 1580
  const SINGLE_PAGE_STATIC_HEIGHT = 410
  const SINGLE_PAGE_ACTION_HEIGHT = readOnly ? 0 : 72
  const COMPACT_SOLUTION_FIRST_PAGE_HEIGHT = 1330
  const COMPACT_SOLUTION_NEXT_PAGE_HEIGHT = 1410
  const COMPACT_CUSTOM_PAGE_HEIGHT = 1410
  const COMPACT_SOLUTION_SUMMARY_HEIGHT = 48 + (readOnly ? 0 : 72)
  const COMPACT_CUSTOM_SUMMARY_HEIGHT = 48 + (readOnly ? 0 : 72)
  const items = form.items ?? []
  const solutionRows = form.solutionRows ?? []
  const customizingRows = normalizeCustomizingRows(form.customizingRows)
  const templateText = { ...defaultTemplateText(), ...(form.templateText ?? {}) }
  const totalAmountSuffix = templateText.totalAmountSuffix === "원정 (부가세별도)" ? "" : templateText.totalAmountSuffix
  const itemsTotal = sumBy(items, (item) => item.amount)
  const solutionTotal = sumBy(solutionRows, (row) => row.supplyTotal)
  const solutionConsumerTotal = sumBy(solutionRows, (row) => row.consumerTotal)
  const solutionDiscountRate = calculateDiscountRate(solutionConsumerTotal, solutionTotal)
  const customizingTotal = sumBy(customizingRows.filter((row) => row.supplyAmount !== "-"), (row) => row.supplyAmount)
  const inputClass = "h-8 appearance-none rounded-none border-0 bg-transparent px-1 text-inherit shadow-none focus-visible:ring-0"
  const wrappingTextClass = "min-h-0 appearance-none resize-none overflow-hidden rounded-none border-0 bg-transparent px-0 py-0 text-inherit shadow-none focus-visible:ring-0 [field-sizing:content] whitespace-pre-wrap break-words [scrollbar-width:none] [-ms-overflow-style:none]"
  const tableCellTextareaClass = "min-h-[24px] appearance-none resize-none overflow-hidden rounded-none border-0 bg-transparent px-0 py-0 text-inherit shadow-none focus-visible:ring-0 whitespace-pre-wrap break-words [field-sizing:content] [scrollbar-width:none] [-ms-overflow-style:none]"
  const readOnlyTableCellClass = "min-h-6 whitespace-pre-wrap break-words leading-snug"
  const inlineLineInputClass = "h-auto min-h-0 appearance-none rounded-none border-0 bg-transparent px-0 py-0 align-baseline shadow-none focus-visible:ring-0"
  const lineRowTextClass = "text-[18px] font-bold leading-none"
  const refRowTextClass = "text-[17px] font-normal leading-none"
  const supplierLineTextClass = "text-[14px] font-normal leading-7"
  const [backendCustomers, setBackendCustomers] = useState<CustomerRecord[]>([])
  const [backendProducts, setBackendProducts] = useState<ProductModuleResponse[]>([])
  useEffect(() => {
    let cancelled = false

    void loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setBackendCustomers(data.customers)
      })
      .catch(() => {
        if (cancelled) return
        setBackendCustomers([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void adminApi
      .getProducts()
      .then((response) => {
        if (cancelled) return
        setBackendProducts(Array.isArray(response?.data) ? response.data : [])
      })
      .catch(() => {
        if (cancelled) return
        setBackendProducts([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedCustomer = useMemo(() => {
    const normalizedCustomerName = normalizeCustomerKeyword(form.customer)
    const normalizedCustomerCode = form.customerCode?.trim().toLowerCase() ?? ""

    const localCustomer =
      getCustomerByName(form.customer) ?? (form.customerCode ? getCustomerByCode(form.customerCode) : null)
    if (localCustomer?.backendId) return localCustomer

    const backendCustomer =
      backendCustomers.find((customer) => {
        const customerName = normalizeCustomerKeyword(customer.name)
        const customerCode = customer.id.trim().toLowerCase()
        const aliases = customer.aliases ?? []

        if (normalizedCustomerCode && customerCode === normalizedCustomerCode) return true
        if (normalizedCustomerName && customerName === normalizedCustomerName) return true
        return aliases.some((alias) => normalizeCustomerKeyword(alias) === normalizedCustomerName)
      }) ?? null

    return backendCustomer ?? localCustomer ?? null
  }, [backendCustomers, form.customer, form.customerCode])
  const selectedCustomerBackendId = selectedCustomer?.backendId
  const [customerOpportunityOptions, setCustomerOpportunityOptions] = useState<ProjectOpportunitySummaryResponse[]>([])
  const [customerOpportunityLoading, setCustomerOpportunityLoading] = useState(false)
  const productGroupChoices = useMemo(() => getProductGroupChoices(backendProducts), [backendProducts])
  const productNameChoicesByGroup = useMemo(() => {
    return backendProducts.reduce<Record<string, { value: string; label: string; subtitle: string | null }[]>>((acc, product) => {
      const group = product.productGroup?.trim() ?? ""
      if (!group) return acc
      if (!acc[group]) acc[group] = []
      const nextName = product.productName?.trim() ?? ""
      if (!nextName || acc[group].some((item) => item.value === nextName)) return acc
      acc[group].push({
        value: nextName,
        label: nextName,
        subtitle: [product.productGroup?.trim(), product.productClass?.toString().trim()].filter(Boolean).join(" · ") || null,
      })
      return acc
    }, {})
  }, [backendProducts])

  useEffect(() => {
    let cancelled = false

    if (readOnly || !selectedCustomerBackendId) {
      setCustomerOpportunityOptions([])
      setCustomerOpportunityLoading(false)
      return () => {
        cancelled = true
      }
    }

    setCustomerOpportunityLoading(true)
    void loadBackendProjectOpportunitiesByCustomer(selectedCustomerBackendId)
      .then((options) => {
        if (cancelled) return
        setCustomerOpportunityOptions(options)
      })
      .catch(() => {
        if (cancelled) return
        setCustomerOpportunityOptions([])
      })
      .finally(() => {
        if (cancelled) return
        setCustomerOpportunityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [readOnly, selectedCustomerBackendId])

  useEffect(() => {
    if (backendProducts.length === 0) return

    updateForm((prev) => ({
      ...prev,
      solutionRows: (prev.solutionRows ?? []).map((row) => syncSolutionRowValues(row, backendProducts)),
    }))
    // backendProducts가 늦게 도착해도 소비자가/합계가 화면에 바로 보이도록 한 번만 동기화한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendProducts])

  const customerOpportunitySuggestions = useMemo<EntitySuggestion[]>(() => {
    return customerOpportunityOptions
      .map((opportunity) => {
        const code = String(opportunity.opportunityCode ?? opportunity.id ?? "").trim()
        const label = String(opportunity.opportunityName ?? opportunity.opportunityCode ?? "").trim()
        const customerName = String(opportunity.customerCompanyName ?? selectedCustomer?.name ?? "").trim()

        if (!label) return null

        return {
          type: "PROJECT_OPPORTUNITY",
          id: String(opportunity.id ?? code ?? label),
          code: code || null,
          label,
          subtitle: [code, customerName, opportunity.stage].filter(Boolean).join(" | "),
          score: 100,
          matchedBy: "prefix",
          metadata: {
            backendId: opportunity.id,
            opportunityCode: code,
            opportunityName: label,
            customerCompanyId: opportunity.customerCompanyId,
            customerCompanyName: customerName,
          },
        } satisfies EntitySuggestion
      })
      .filter((item): item is EntitySuggestion => item !== null)
  }, [customerOpportunityOptions, selectedCustomer?.name])
  const singlePageEstimatedHeight =
    SINGLE_PAGE_STATIC_HEIGHT +
    SINGLE_PAGE_ACTION_HEIGHT +
    sumHeights(solutionRows, (row) => estimateSolutionRowHeight(row, false)) +
    sumHeights(customizingRows, (row) => estimateCustomizingRowHeight(row, false))
  const evidenceFitsSinglePage = singlePageEstimatedHeight <= EVIDENCE_SINGLE_PAGE_HEIGHT
  const solutionChunks = evidenceFitsSinglePage
    ? [solutionRows]
    : paginateRowsByHeight(
        solutionRows,
        [COMPACT_SOLUTION_FIRST_PAGE_HEIGHT, COMPACT_SOLUTION_NEXT_PAGE_HEIGHT],
        (row) => estimateSolutionRowHeight(row, true),
        COMPACT_SOLUTION_SUMMARY_HEIGHT,
      )
  const customizingChunks = evidenceFitsSinglePage
    ? [customizingRows]
    : paginateRowsByHeight(
        customizingRows,
        [COMPACT_CUSTOM_PAGE_HEIGHT],
        (row) => estimateCustomizingRowHeight(row, true),
        COMPACT_CUSTOM_SUMMARY_HEIGHT,
      )

  const updateForm = (updater: (prev: QuotationFormState) => QuotationFormState) => {
    if (!onChange || readOnly) return
    onChange((prev) => normalizeQuotationForm(updater(prev)))
  }

  const handleCustomerChange = (value: string) => {
    const customer = getCustomerByName(value)

    updateForm((prev) => ({
      ...prev,
      customer: value,
      customerCode: customer?.id ?? prev.customerCode,
      opportunity: customer && prev.customer !== value ? "" : prev.opportunity,
      opportunityCode: customer && prev.customer !== value ? "" : prev.opportunityCode,
    }))
  }

  const handleOpportunityChange = (value: string) => {
    updateForm((prev) => ({
      ...prev,
      opportunity: value,
      opportunityCode: "",
    }))
  }

  const handleOpportunitySelect = (suggestion: EntitySuggestion | null) => {
    updateForm((prev) => ({
      ...prev,
      opportunity: suggestion?.label ?? "",
      opportunityCode:
        String(
          suggestion?.metadata?.opportunityCode ??
            suggestion?.code ??
            suggestion?.metadata?.backendId ??
            suggestion?.id ??
            "",
        ).trim(),
    }))
  }

  const updateSolutionRow = (rowIndex: number, updater: (row: NonNullable<QuotationFormState["solutionRows"]>[number]) => NonNullable<QuotationFormState["solutionRows"]>[number]) => {
    updateForm((prev) => ({
      ...prev,
      solutionRows: (prev.solutionRows ?? []).map((entry, entryIndex) => {
        if (entryIndex !== rowIndex) return entry
        return syncSolutionRowValues(updater(entry), backendProducts)
      }),
    }))
  }

  const handleSolutionGroupChange = (rowIndex: number, value: string) => {
    updateSolutionRow(rowIndex, (row) => ({
      ...row,
      category: value,
      module: row.category === value ? row.module : "",
      consumerUnitPrice: "",
      consumerTotal: "",
      supplyTotal: "",
      discountRate: "",
    }))
  }

  const handleSolutionModuleChange = (rowIndex: number, value: string) => {
    updateSolutionRow(rowIndex, (row) => ({
      ...row,
      module: value,
    }))
  }

  const renderSolutionField = (
    row: NonNullable<QuotationFormState["solutionRows"]>[number],
    rowIndex: number,
    fieldKey:
      | "rowNo"
      | "category"
      | "module"
      | "quantity"
      | "consumerUnitPrice"
      | "consumerTotal"
      | "supplyUnitPrice"
      | "supplyTotal"
      | "discountRate"
      | "note",
    align: string,
    compactTextClass: string,
  ) => {
    const isComputed = fieldKey === "consumerUnitPrice" || fieldKey === "consumerTotal" || fieldKey === "supplyTotal" || fieldKey === "discountRate"

    if (readOnly || isComputed) {
      return (
        <div className={`${align} ${readOnlyTableCellClass}`}>
          {["consumerUnitPrice", "consumerTotal", "supplyUnitPrice", "supplyTotal"].includes(fieldKey)
            ? formatMaybeDash(row[fieldKey] as string)
            : fieldKey === "discountRate"
              ? formatDiscountRate(row.discountRate)
              : (row[fieldKey] as string) || "-"}
        </div>
      )
    }

    if (fieldKey === "category") {
      return (
        <Select value={row.category || ""} onValueChange={(value) => handleSolutionGroupChange(rowIndex, value)}>
          <SelectTrigger className={`${compactTextClass} ${align} h-7 w-full rounded-none border-0 bg-transparent px-0 shadow-none focus:ring-0`}>
            <SelectValue placeholder="구분 선택" />
          </SelectTrigger>
          <SelectContent>
            {productGroupChoices.length > 0 ? (
              productGroupChoices.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex min-w-0 flex-col">
                    <span>{option.label}</span>
                    {option.subtitle ? <span className="text-xs text-muted-foreground">{option.subtitle}</span> : null}
                  </div>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__empty_group__" disabled>
                등록된 제품군이 없습니다.
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )
    }

    if (fieldKey === "module") {
      const moduleOptions = productNameChoicesByGroup[row.category.trim()] ?? []
      return (
        <Select
          value={row.module || ""}
          onValueChange={(value) => handleSolutionModuleChange(rowIndex, value)}
          disabled={!row.category.trim()}
        >
          <SelectTrigger className={`${compactTextClass} ${align} h-7 w-full rounded-none border-0 bg-transparent px-0 shadow-none focus:ring-0`}>
            <SelectValue placeholder={row.category.trim() ? "납품 모듈 선택" : "구분을 먼저 선택하세요"} />
          </SelectTrigger>
          <SelectContent>
            {row.category.trim() ? (
              moduleOptions.length > 0 ? (
                moduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex min-w-0 flex-col">
                      <span>{option.label}</span>
                      {option.subtitle ? <span className="text-xs text-muted-foreground">{option.subtitle}</span> : null}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty_module__" disabled>
                  등록된 납품 모듈이 없습니다.
                </SelectItem>
              )
            ) : (
              <SelectItem value="__select_group_first__" disabled>
                구분을 먼저 선택하세요.
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Textarea
        value={(row[fieldKey] as string) ?? ""}
        onChange={(event) =>
          updateForm((prev) => ({
            ...prev,
            solutionRows: (prev.solutionRows ?? []).map((entry, entryIndex) =>
              entryIndex === rowIndex
                ? {
                    ...entry,
                    [fieldKey]:
                      fieldKey === "quantity"
                        ? event.target.value.replace(/[^\d.]/g, "")
                        : fieldKey === "discountRate"
                          ? event.target.value.replace(/[^\d.]/g, "")
                          : event.target.value,
                  }
                : entry,
            ),
          }))
        }
        className={`${tableCellTextareaClass} ${align} text-[12px]`}
        rows={1}
      />
    )
  }

  return (
    <div className="w-full space-y-8 bg-white text-black">
      <div className="mx-auto w-full max-w-[1320px] min-h-[1580px] border border-slate-300 bg-white px-14 py-12 shadow-sm print:shadow-none print:break-after-page">
        <div className="pt-6">
          <div className="text-center">
            {readOnly ? (
              <div className="font-serif leading-[0.9] tracking-[0.2em]" style={{ fontSize: "72px" }}>{templateText.documentTitle}</div>
            ) : (
              <div className="mx-auto w-full max-w-[1280px] text-center">
                <div className="font-serif leading-[0.9] tracking-[0.2em]" style={{ fontSize: "72px" }}>
                  {templateText.documentTitle}
                </div>
              </div>
            )}
            <div className="mt-4 text-[17px]">
              {readOnly ? (
                <div className="whitespace-pre-wrap break-words text-center">{`${templateText.refLabel} ${form.refNumber || referenceId || ""}`}</div>
              ) : (
                <div className="mx-auto flex w-fit max-w-full items-start gap-0">
                  <span className="shrink-0 py-1 text-[17px]">{templateText.refLabel}</span>
                  <Input
                    value={form.refNumber || ""}
                    onChange={(event) => updateForm((prev) => ({ ...prev, refNumber: event.target.value }))}
                    className={`${inlineLineInputClass} ${refRowTextClass} ml-1 min-w-[240px] text-left`}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-14 grid grid-cols-[minmax(0,1fr)_320px] gap-14">
            <div>
              <div className="text-[22px] font-bold">
                <div className="inline-flex w-[440px] max-w-full items-end gap-x-3 border-b border-black pb-1">
                  {readOnly ? (
                    <span className="min-w-[160px] break-words">{form.customer || ""}</span>
                  ) : (
                    <CustomerAutocomplete
                      value={form.customer}
                      onSelect={(customer) =>
                        updateForm((prev) => ({
                          ...prev,
                          customer: customer?.name ?? "",
                          customerCode: customer?.id ?? "",
                          opportunity: customer && prev.customer !== customer.name ? "" : prev.opportunity,
                          opportunityCode: customer && prev.customer !== customer.name ? "" : prev.opportunityCode,
                        }))
                      }
                      onValueChange={handleCustomerChange}
                      placeholder="고객사를 선택하세요"
                      inputClassName={`${inlineLineInputClass} min-w-[160px] flex-1 text-[22px] font-bold`}
                    />
                  )}
                  {readOnly ? (
                    <span className="shrink-0">{templateText.recipientSuffix}</span>
                  ) : (
                    <Input value={templateText.recipientSuffix} readOnly className={`${inputClass} w-[90px] shrink-0 text-[22px] font-bold`} />
                  )}
                </div>
              </div>

              {readOnly ? (
              <div className="mt-10 whitespace-pre-wrap break-words text-[16px] leading-7">{templateText.introText}</div>
              ) : (
                <Textarea value={templateText.introText} readOnly className={`${wrappingTextClass} mt-10 w-full text-[16px] leading-7`} rows={1} />
              )}

              <div className="mt-10 space-y-2 text-[16px]">
                <div className="flex items-center gap-2">
                  {readOnly ? (
                    <span className="shrink-0">{templateText.quoteDateLabel}</span>
                  ) : (
                    <Input value={templateText.quoteDateLabel} readOnly className={`${inputClass} w-[90px] text-[16px]`} />
                  )}
                  {readOnly ? (
                    <span className="min-w-0 break-words">{form.date || "-"}</span>
                  ) : (
                    <Input type="date" value={form.date} onChange={(event) => updateForm((prev) => ({ ...prev, date: event.target.value }))} className={`${inputClass} w-[180px] text-[16px]`} />
                  )}
                </div>
                <div className="flex items-start gap-2">
                  {readOnly ? (
                    <span className="shrink-0">{templateText.paymentTermsLabel}</span>
                  ) : (
                    <Input value={templateText.paymentTermsLabel} readOnly className={`${inputClass} w-[120px] text-[16px]`} />
                  )}
                  {readOnly ? (
                    <span className="min-w-0 break-words leading-7">{form.paymentTerms || "-"}</span>
                  ) : (
                    <Input value={form.paymentTerms ?? ""} onChange={(event) => updateForm((prev) => ({ ...prev, paymentTerms: event.target.value }))} className={`${inputClass} w-[120px] text-[16px]`} />
                  )}
                </div>
              </div>
            </div>

            <div>
              {readOnly ? (
                <div className="text-[18px] font-bold">{templateText.supplierName}</div>
              ) : (
                <Input value={templateText.supplierName} readOnly className={`${inputClass} w-[180px] text-[18px] font-bold`} />
              )}
              <div className="mt-2 space-y-1 text-[16px] leading-8">
                {readOnly ? <div>{templateText.addressLine1}</div> : <Input value={templateText.addressLine1} readOnly className={`${inputClass} text-[16px]`} />}
                {readOnly ? <div>{templateText.addressLine2}</div> : <Input value={templateText.addressLine2} readOnly className={`${inputClass} text-[16px]`} />}
                <div className="flex items-center gap-2">
                  {readOnly ? <span className={supplierLineTextClass}>{templateText.ceoLabel}</span> : <Input value={templateText.ceoLabel} readOnly className={`${inputClass} w-[90px] text-[16px]`} />}
                  <span className={supplierLineTextClass}>{fixedExecutiveName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {readOnly ? <span className={supplierLineTextClass}>{templateText.telLabel}</span> : <Input value={templateText.telLabel} readOnly className={`${inputClass} w-[60px] text-[16px]`} />}
                  {readOnly ? <span className={supplierLineTextClass}>{templateText.tel}</span> : <Input value={templateText.tel} readOnly className={`${inputClass} w-[140px] text-[16px]`} />}
                </div>
                <div className="flex items-center gap-2">
                  {readOnly ? <span className={supplierLineTextClass}>{templateText.faxLabel}</span> : <Input value={templateText.faxLabel} readOnly className={`${inputClass} w-[60px] text-[16px]`} />}
                  {readOnly ? <span className={supplierLineTextClass}>{templateText.fax}</span> : <Input value={templateText.fax} readOnly className={`${inputClass} w-[140px] text-[16px]`} />}
                </div>
                <div className="flex items-center gap-2">
                  {readOnly ? <span className={supplierLineTextClass}>{templateText.contactLabel}</span> : <Input value={templateText.contactLabel} readOnly className={`${inputClass} w-[80px] text-[16px]`} />}
                  <span className={supplierLineTextClass}>{fixedContactName}</span>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <div className="h-24 w-24" />
              </div>
            </div>
          </div>

          <div className={`mt-14 flex items-baseline gap-0 border-b border-black pb-1 ${lineRowTextClass}`}>
            <span className={lineRowTextClass}>{templateText.businessNameLabel}</span>
            {readOnly ? (
              <span className={`ml-1 break-words ${lineRowTextClass}`}>{form.opportunity || "-"}</span>
            ) : (
              <EntityAutocomplete
                value={form.opportunity}
                target="opportunities"
                onValueChange={handleOpportunityChange}
                onSelect={handleOpportunitySelect}
                placeholder={
                  selectedCustomerBackendId
                    ? customerOpportunityLoading
                      ? "사업기회를 불러오는 중입니다"
                      : "사업기회를 선택하세요"
                    : "고객사를 먼저 선택하세요"
                }
                disabled={!selectedCustomerBackendId || customerOpportunityLoading}
                allowCustomValue={false}
                emptyMessage={
                  selectedCustomerBackendId
                    ? "등록된 사업기회가 없습니다."
                    : "고객사를 먼저 선택하세요"
                }
                localCandidates={customerOpportunitySuggestions}
                inputClassName={`${inlineLineInputClass} ml-1 min-w-[240px] flex-1 ${lineRowTextClass}`}
                filterSuggestion={(suggestion) => {
                  const metadataCompanyId = Number(suggestion.metadata.customerCompanyId ?? 0)
                  const metadataCompanyName = String(suggestion.metadata.customerCompanyName ?? "")
                  return (
                    metadataCompanyId === selectedCustomerBackendId ||
                    (metadataCompanyName && metadataCompanyName === selectedCustomer?.name)
                  )
                }}
              />
            )}
          </div>

          <div className={`mt-10 flex items-baseline gap-0 border-b border-black pb-1 ${lineRowTextClass}`}>
            <span className={lineRowTextClass}>{templateText.totalAmountLabel}</span>
            <span className={`ml-1 ${lineRowTextClass}`}>{formatCurrency(String(readOnly ? form.amount : itemsTotal)) || "-"}</span>
            {readOnly ? (
              <span className={lineRowTextClass}>{totalAmountSuffix}</span>
            ) : null}
          </div>
          {!readOnly && (
            <div className="mt-2 text-[13px] text-muted-foreground">
              합계금액은 아래 표의 항목 금액을 합산해 자동 반영됩니다. 직접 입력하지 말고 표에 작성해 주세요.
            </div>
          )}

          <div className="mt-6 flex justify-end">
            {readOnly ? (
              <div className="text-right text-[14px]">{templateText.unitNote}</div>
            ) : (
              <Input value={templateText.unitNote} readOnly className={`${inputClass} w-[220px] text-right text-[14px]`} />
            )}
          </div>

          <div className="mt-2 border-[3px] border-black">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[60%]" />
                <col className="w-[40%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-200">
                  <th className="border-b-[3px] border-r-[3px] border-black py-3 text-[18px] font-bold">구분</th>
                  <th className="border-b-[3px] border-black py-3 text-[18px] font-bold">합계</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || `summary-${index}`}>
                    <td className="border-b-[2px] border-r-[2px] border-black px-3 py-2">
                      {readOnly ? (
                        <div className="whitespace-pre-wrap break-words text-[16px] leading-relaxed">{item.name || "-"}</div>
                      ) : (
                        <Textarea value={item.name} readOnly className={`${tableCellTextareaClass} text-[16px]`} rows={1} />
                      )}
                    </td>
                    <td className="border-b-[2px] border-black px-3 py-2">
                      {readOnly ? (
                        <div className="text-right text-[16px]">{formatCurrency(item.amount) || "-"}</div>
                      ) : (
                        <Textarea value={item.amount} readOnly className={`${tableCellTextareaClass} text-right text-[16px]`} rows={1} />
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-200">
                  <td className="border-r-[2px] border-black py-3 text-center text-[18px] font-bold">합계</td>
                  <td className="px-3 py-3 text-right text-[18px] font-bold">{formatCurrency(form.amount) || "0"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-16">
            {readOnly ? (
              <div className="text-[24px] font-bold">{templateText.remarksTitle}</div>
            ) : (
              <Input value={templateText.remarksTitle} readOnly className={`${inputClass} w-[160px] text-[24px] font-bold`} />
            )}
            <div className="mt-2 border border-black px-4 py-3">
              {readOnly ? (
                <div className="min-h-[110px] whitespace-pre-wrap break-words text-[16px] leading-9">{form.remarks || "-"}</div>
              ) : (
                <textarea
                  rows={6}
                  value={form.remarks ?? ""}
                  onChange={(event) => updateForm((prev) => ({ ...prev, remarks: event.target.value }))}
                  className="min-h-[160px] w-full resize-y rounded-none border-0 bg-transparent px-0 py-0 text-[16px] leading-9 shadow-none outline-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {evidenceFitsSinglePage ? (
        <div className="mx-auto w-full max-w-[1320px] min-h-[1580px] border border-slate-300 bg-white px-8 py-8 shadow-sm print:shadow-none">
          <div className="flex justify-center">
            <div className="text-center font-bold" style={{ fontSize: "34px", lineHeight: "1.1" }}>{templateText.evidenceTitle}</div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div className="text-[22px] font-bold">{form.solutionSectionTitle || "1) Solution Package"}</div>
            <div className="text-right text-[14px]">{templateText.unitNote}</div>
          </div>

          <div className="mt-1 border-[2px] border-black">
            <table className="w-full table-fixed border-collapse text-[16px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[10%]" />
                <col className="w-[31%]" />
                <col className="w-[5%]" />
                <col className="w-[9.5%]" />
                <col className="w-[9.5%]" />
                <col className="w-[9.5%]" />
                <col className="w-[9.5%]" />
                <col className="w-[5.5%]" />
                <col className="w-[6.5%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-200 text-center font-bold">
                  <th className="border-b border-r border-black py-2">순번</th>
                  <th className="border-b border-r border-black py-2">구분</th>
                  <th className="border-b border-r border-black py-2">납품 모듈</th>
                  <th className="border-b border-r border-black py-2">수량</th>
                  <th className="border-b border-r border-black py-2">소비자가</th>
                  <th className="border-b border-r border-black py-2">소비자가 합계</th>
                  <th className="border-b border-r border-black py-2">공급단가</th>
                  <th className="border-b border-r border-black py-2">공급가 합계</th>
                  <th className="border-b border-r border-black py-2">할인율</th>
                  <th className="border-b border-black py-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {solutionRows.map((row, index) => (
                  <Fragment key={row.id || `solution-${index}`}>
                    <tr>
                      {(
                        [
                          { key: "rowNo", align: "text-center" },
                          { key: "category", align: "" },
                          { key: "module", align: "" },
                          { key: "quantity", align: "text-center" },
                          { key: "consumerUnitPrice", align: "text-right" },
                          { key: "consumerTotal", align: "text-right" },
                          { key: "supplyUnitPrice", align: "text-right" },
                          { key: "supplyTotal", align: "text-right" },
                          { key: "discountRate", align: "text-center" },
                          { key: "note", align: "text-center" },
                        ] as const
                      ).map((field, fieldIndex) => (
                        <td key={field.key} className={`border-r border-b border-black ${fieldIndex === 9 ? "border-r-0" : ""} px-1 py-1`}>
                          {renderSolutionField(row, index, field.key, field.align, "text-[12px]")}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
                <tr className="bg-slate-200 font-bold">
                  <td colSpan={4} className="border-t border-black py-2 text-center">
                    1. Solution Package 비용 합계
                  </td>
                  <td className="border-r border-t border-black py-2" />
                  <td className="border-r border-t border-black py-2 text-right">{formatCurrency(String(sumBy(solutionRows, (row) => row.consumerTotal))) || "0"}</td>
                  <td className="border-r border-t border-black py-2" />
                  <td className="border-r border-t border-black py-2 text-right">{formatCurrency(String(solutionTotal)) || "0"}</td>
                  <td className="border-r border-t border-black py-2 text-center">{formatDiscountRate(solutionDiscountRate)}</td>
                  <td className="border-t border-black py-2 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateForm((prev) => ({
                    ...prev,
                    solutionRows: [
                      ...(prev.solutionRows ?? []),
                      {
                        id: "",
                        rowNo: String((prev.solutionRows ?? []).length + 1),
                        category: "",
                        module: "",
                        quantity: "",
                        consumerUnitPrice: "",
                        consumerTotal: "",
                        supplyUnitPrice: "",
                        supplyTotal: "",
                        discountRate: "",
                        note: "",
                      },
                    ],
                  }))
                }
                className="rounded-none border-black"
              >
                <Plus className="mr-2 h-4 w-4" />
                Solution 행 추가
              </Button>
            </div>
          )}

          <div className="mt-10 flex items-end justify-between">
            <div className="text-[22px] font-bold">{form.customizingSectionTitle || "2) 인건비-커스터마이징"}</div>
            <div className="text-right text-[14px]">{templateText.unitNote}</div>
          </div>

          <div className="mt-1 border-[2px] border-black">
            <table className="w-full table-fixed border-collapse text-[16px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[39%]" />
                <col className="w-[15%]" />
                <col className="w-[19.5%]" />
                <col className="w-[22.5%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-200 text-center font-bold">
                  <th className="border-b border-r border-black py-2">순번</th>
                  <th className="border-b border-r border-black py-2">세 부 항 목</th>
                  <th className="border-b border-r border-black py-2">노임단가(원)</th>
                  <th className="border-b border-r border-black py-2">Man / Month</th>
                  <th className="border-b border-black py-2">공급 금액</th>
                </tr>
              </thead>
              <tbody>
                {customizingRows.map((row, index) => {
                  const manualRow = isManualCustomizingRow(index)
                  return (
                  <tr key={row.id || `custom-${index}`}>
                    <td className="border-b border-r border-black px-1 py-1">
                      <div className={`text-center ${readOnlyTableCellClass}`}>{row.rowNo || String(index + 1)}</div>
                    </td>
                    <td className="border-b border-r border-black px-1 py-1">
                      {readOnly ? (
                        <div className={`${readOnlyTableCellClass}`}>{row.item || "-"}</div>
                      ) : (
                        <div className="px-1 py-1 text-[12px]">{row.item || getFixedCustomizingItem(index) || "-"}</div>
                        )}
                    </td>
                    <td className="border-b border-r border-black px-1 py-1">
                      {readOnly || manualRow ? (
                        <div className={`text-right ${readOnlyTableCellClass}`}>{formatMaybeDash(row.laborRate)}</div>
                      ) : (
                        <Textarea
                          value={row.laborRate === "-" ? "" : row.laborRate}
                          onChange={(event) =>
                            updateForm((prev) => ({
                              ...prev,
                              customizingRows: normalizeCustomizingRows(prev.customizingRows).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, laborRate: event.target.value.replace(/[^\d.]/g, "") } : entry,
                              ),
                            }))
                          }
                          className={`${tableCellTextareaClass} text-right text-[12px]`}
                          rows={1}
                        />
                      )}
                    </td>
                    <td className="border-b border-r border-black px-1 py-1">
                      {readOnly || manualRow ? (
                        <div className={`text-center ${readOnlyTableCellClass}`}>{row.manMonth || "-"}</div>
                      ) : (
                        <Textarea
                          value={row.manMonth}
                          onChange={(event) =>
                            updateForm((prev) => ({
                              ...prev,
                              customizingRows: normalizeCustomizingRows(prev.customizingRows).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, manMonth: event.target.value.replace(/[^\d.]/g, "") } : entry,
                              ),
                            }))
                          }
                          className={`${tableCellTextareaClass} text-center text-[12px]`}
                          rows={1}
                        />
                      )}
                    </td>
                    <td className="border-b border-black px-1 py-1">
                      {readOnly ? (
                        <div className={`text-right ${readOnlyTableCellClass}`}>{formatMaybeDash(row.supplyAmount)}</div>
                      ) : manualRow ? (
                        <Input
                          value={row.supplyAmount === "-" ? "" : row.supplyAmount}
                          onChange={(event) =>
                            updateForm((prev) => ({
                              ...prev,
                              customizingRows: normalizeCustomizingRows(prev.customizingRows).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, supplyAmount: event.target.value.replace(/[^\d]/g, "") } : entry,
                              ),
                            }))
                          }
                          className="h-7 rounded-none border-0 bg-transparent px-0 text-right text-[12px] shadow-none focus-visible:ring-0"
                        />
                      ) : (
                        <div className={`text-right ${readOnlyTableCellClass}`}>{formatMaybeDash(row.supplyAmount)}</div>
                      )}
                    </td>
                  </tr>
                  )
                })}
                <tr className="bg-slate-200 font-bold">
                  <td colSpan={4} className="border-r border-t border-black py-2 text-center">
                    2. 인건비-커스터마이징 합계
                  </td>
                  <td className="border-t border-black py-2 text-right">{formatCurrency(String(customizingTotal)) || "0"}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        <>
      {solutionChunks.map((chunk, chunkIndex) => (
          <div key={`solution-page-${chunkIndex}`} className="mx-auto w-full max-w-[1240px] min-h-[1580px] border border-slate-300 bg-white px-8 py-8 shadow-sm print:shadow-none print:break-after-page">
          {chunkIndex === 0 &&
            <div className="flex justify-center">
              <div className="text-center text-[18px] font-bold">{templateText.evidenceTitle}</div>
            </div>}

          <div className={`${chunkIndex === 0 ? "mt-4" : "mt-0"} flex items-end justify-between`}>
            <div className="text-[18px] font-bold">{form.solutionSectionTitle || "1) Solution Package"}</div>
            <div className="text-right text-[14px]">{templateText.unitNote}</div>
          </div>

          <div className="mt-1 border-[2px] border-black">
            <table className="w-full table-fixed border-collapse text-[12px]">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[10%]" />
              <col className="w-[31%]" />
              <col className="w-[5%]" />
              <col className="w-[9.5%]" />
              <col className="w-[9.5%]" />
              <col className="w-[9.5%]" />
              <col className="w-[9.5%]" />
              <col className="w-[5.5%]" />
              <col className="w-[6.5%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-200 text-center font-bold">
                <th className="border-b border-r border-black py-2">순번</th>
                <th className="border-b border-r border-black py-2">구분</th>
                <th className="border-b border-r border-black py-2">납품 모듈</th>
                <th className="border-b border-r border-black py-2">수량</th>
                <th className="border-b border-r border-black py-2">소비자가</th>
                <th className="border-b border-r border-black py-2">소비자가 합계</th>
                <th className="border-b border-r border-black py-2">공급단가</th>
                <th className="border-b border-r border-black py-2">공급가 합계</th>
                <th className="border-b border-r border-black py-2">할인율</th>
                <th className="border-b border-black py-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {chunk.map((row) => {
                const index = solutionRows.findIndex((entry) => entry.id === row.id)
                return (
                <Fragment key={row.id || `solution-${index}`}>
                  <tr>
                    {(
                      [
                        { key: "rowNo", align: "text-center" },
                        { key: "category", align: "" },
                        { key: "module", align: "" },
                        { key: "quantity", align: "text-center" },
                        { key: "consumerUnitPrice", align: "text-right" },
                        { key: "consumerTotal", align: "text-right" },
                        { key: "supplyUnitPrice", align: "text-right" },
                        { key: "supplyTotal", align: "text-right" },
                        { key: "discountRate", align: "text-center" },
                        { key: "note", align: "text-center" },
                      ] as const
                    ).map((field, fieldIndex) => (
                      <td key={field.key} className={`border-r border-b border-black ${fieldIndex === 9 ? "border-r-0" : ""} px-1 py-1`}>
                        {renderSolutionField(row, index, field.key, field.align, "text-[12px]")}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              )})}
              {chunkIndex === solutionChunks.length - 1 && (
              <tr className="bg-slate-200 font-bold">
                <td colSpan={4} className="border-t border-black py-2 text-center">
                  1. Solution Package 비용 합계
                </td>
                <td className="border-r border-t border-black py-2" />
                <td className="border-r border-t border-black py-2 text-right">{formatCurrency(String(sumBy(solutionRows, (row) => row.consumerTotal))) || "0"}</td>
                <td className="border-r border-t border-black py-2" />
                <td className="border-r border-t border-black py-2 text-right">{formatCurrency(String(solutionTotal)) || "0"}</td>
                <td className="border-r border-t border-black py-2 text-center">{formatDiscountRate(solutionDiscountRate)}</td>
                <td className="border-t border-black py-2 text-center">-</td>
              </tr>
              )}
            </tbody>
            </table>
          </div>

          {!readOnly && chunkIndex === solutionChunks.length - 1 && (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateForm((prev) => ({
                    ...prev,
                    solutionRows: [
                      ...(prev.solutionRows ?? []),
                      {
                        id: "",
                        rowNo: String((prev.solutionRows ?? []).length + 1),
                        category: "",
                        module: "",
                        quantity: "",
                        consumerUnitPrice: "",
                        consumerTotal: "",
                        supplyUnitPrice: "",
                        supplyTotal: "",
                        discountRate: "",
                        note: "",
                      },
                    ],
                  }))
                }
                className="rounded-none border-black"
              >
                <Plus className="mr-2 h-4 w-4" />
                Solution 행 추가
              </Button>
            </div>
          )}
        </div>
      ))}

      {customizingChunks.map((chunk, chunkIndex) => (
        <div key={`custom-page-${chunkIndex}`} className="mx-auto w-full max-w-[1240px] min-h-[1580px] border border-slate-300 bg-white px-8 py-8 shadow-sm print:shadow-none print:break-after-page">
          <div className="mt-0 flex items-end justify-between">
            <div className="text-[18px] font-bold">{form.customizingSectionTitle || "2) 인건비-커스터마이징"}</div>
            <div className="text-right text-[14px]">{templateText.unitNote}</div>
          </div>

          <div className="mt-1 border-[2px] border-black">
            <table className="w-full table-fixed border-collapse text-[12px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[39%]" />
                <col className="w-[15%]" />
                <col className="w-[19.5%]" />
                <col className="w-[22.5%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-200 text-center font-bold">
                  <th className="border-b border-r border-black py-2">순번</th>
                  <th className="border-b border-r border-black py-2">세 부 항 목</th>
                  <th className="border-b border-r border-black py-2">노임단가(원)</th>
                  <th className="border-b border-r border-black py-2">Man / Month</th>
                  <th className="border-b border-black py-2">공급 금액</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((row) => {
                  const index = customizingRows.findIndex((entry) => entry.id === row.id)
                  const mergeMiddleCells = index === 4
                  const skipMiddleCells = index === 5
                  const manualRow = isManualCustomizingRow(index)
                  return (
                <tr key={row.id || `custom-${index}`}>
                  <td className="border-b border-r border-black px-1 py-1">
                    <div className={`text-center ${readOnlyTableCellClass}`}>{row.rowNo || String(index + 1)}</div>
                  </td>
                  <td className="border-b border-r border-black px-1 py-1">
                    {readOnly ? (
                      <div className={readOnlyTableCellClass}>{row.item || "-"}</div>
                    ) : (
                      <div className="px-1 py-1 text-[12px]">{row.item || getFixedCustomizingItem(index) || "-"}</div>
                    )}
                  </td>
                  {skipMiddleCells ? null : (
                    <td
                      className="border-b border-r border-black px-1 py-1 align-middle"
                      rowSpan={mergeMiddleCells ? 2 : 1}
                    >
                      {readOnly ? (
                        <div className={`text-right ${readOnlyTableCellClass}`}>{formatMaybeDash(row.laborRate)}</div>
                      ) : manualRow ? (
                        <div className={`text-right ${readOnlyTableCellClass}`}>-</div>
                      ) : (
                        <Textarea
                          value={row.laborRate === "-" ? "" : row.laborRate}
                          onChange={(event) =>
                            updateForm((prev) => ({
                              ...prev,
                              customizingRows: normalizeCustomizingRows(prev.customizingRows).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, laborRate: event.target.value.replace(/[^\d.]/g, "") } : entry,
                              ),
                            }))
                          }
                          className={`${tableCellTextareaClass} text-right text-[12px]`}
                          rows={1}
                        />
                      )}
                    </td>
                  )}
                  {skipMiddleCells ? null : (
                    <td
                      className="border-b border-r border-black px-1 py-1 align-middle"
                      rowSpan={mergeMiddleCells ? 2 : 1}
                    >
                      {readOnly ? (
                        <div className={`text-center ${readOnlyTableCellClass}`}>{row.manMonth || "-"}</div>
                      ) : manualRow ? (
                        <div className={`text-center ${readOnlyTableCellClass}`}>-</div>
                      ) : (
                        <Textarea
                          value={row.manMonth}
                          onChange={(event) =>
                            updateForm((prev) => ({
                              ...prev,
                              customizingRows: normalizeCustomizingRows(prev.customizingRows).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, manMonth: event.target.value.replace(/[^\d.]/g, "") } : entry,
                              ),
                            }))
                          }
                          className={`${tableCellTextareaClass} text-center text-[12px]`}
                          rows={1}
                        />
                      )}
                    </td>
                  )}
                  <td className="border-b border-black px-1 py-1">
                    {readOnly ? (
                      <div className={`text-right ${readOnlyTableCellClass}`}>{formatMaybeDash(row.supplyAmount)}</div>
                    ) : manualRow ? (
                      <Input
                        value={row.supplyAmount === "-" ? "" : row.supplyAmount}
                        onChange={(event) =>
                          updateForm((prev) => ({
                            ...prev,
                            customizingRows: normalizeCustomizingRows(prev.customizingRows).map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, supplyAmount: event.target.value.replace(/[^\d]/g, "") } : entry,
                            ),
                          }))
                        }
                        className="h-7 rounded-none border-0 bg-transparent px-0 text-right text-[12px] shadow-none focus-visible:ring-0"
                      />
                    ) : (
                      <div className={`text-right ${readOnlyTableCellClass}`}>{formatMaybeDash(row.supplyAmount)}</div>
                    )}
                  </td>
                </tr>
                  )
                })}
                {chunkIndex === customizingChunks.length - 1 && (
                <tr className="bg-slate-200 font-bold">
                  <td colSpan={4} className="border-r border-t border-black py-2 text-center">
                    2. 인건비-커스터마이징 합계
                  </td>
                  <td className="border-t border-black py-2 text-right">{formatCurrency(String(customizingTotal)) || "0"}</td>
                </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      ))}
      </>
      )}
    </div>
  )
}
