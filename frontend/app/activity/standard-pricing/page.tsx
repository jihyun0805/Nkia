"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  standardPriceNotes,
  type StandardPriceRecord,
} from "@/lib/activity-data"
import { Plus, Trash2 } from "lucide-react"

const STANDARD_PRICE_STORAGE_KEY = "orbis.activity.standardPrices"
const STANDARD_PRICE_SEED_MIGRATION_KEY = `${STANDARD_PRICE_STORAGE_KEY}.seed-cleared.v1`
const LEGACY_STANDARD_PRICE_IDS = new Set(["SPR-001", "SPR-002", "SPR-003"])

const standardPriceHeaders = [
  "제품분류\nProduct Class",
  "제품군\nProduct Group",
  "제품명\nProduct Name",
  "라이센스 기준",
  "라이센스\n단위 Unit",
  "단가\nUnit Price",
  "할인율\nDC(%)",
  "제안가\nProposal Price",
  "관리",
]

const createEmptyStandardPriceRow = (): StandardPriceRecord => ({
  id: `SPR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productClass: "",
  productGroup: "",
  productNumber: "",
  productName: "",
  licenseBase: "",
  licenseUnit: "",
  unitPrice: "",
  discountRate: "",
  proposalPrice: "",
})

function formatWon(value: string) {
  if (!value.trim()) return "₩ 0"
  const numeric = Number(value.replaceAll(",", ""))
  if (Number.isNaN(numeric)) return `₩ ${value}`
  return `₩ ${numeric.toLocaleString("ko-KR")}`
}

function calculateProposalPrice(unitPrice: string, discountRate: string) {
  const unit = Number(unitPrice.replaceAll(",", ""))
  const discount = Number(discountRate.replaceAll(",", ""))

  if (Number.isNaN(unit) || Number.isNaN(discount)) return ""
  const proposal = Math.round(unit * (100 - discount)) / 100
  return String(proposal)
}

function normalizeRecord(item: Partial<StandardPriceRecord>): StandardPriceRecord {
  return {
    id: item.id ?? `SPR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productClass: item.productClass ?? "",
    productGroup: item.productGroup ?? "",
    productNumber: item.productNumber ?? "",
    productName: item.productName ?? "",
    licenseBase: item.licenseBase ?? "",
    licenseUnit: item.licenseUnit ?? "",
    unitPrice: item.unitPrice ?? "",
    discountRate: item.discountRate ?? "",
    proposalPrice: item.proposalPrice ?? "",
  }
}

export default function StandardPricingPage() {
  const [isPreferenceReady, setIsPreferenceReady] = useState(false)
  const [standardPrices, setStandardPrices] = useState<StandardPriceRecord[]>([])
  const [draftRow, setDraftRow] = useState<StandardPriceRecord | null>(null)

  useEffect(() => {
    if (!window.localStorage.getItem(STANDARD_PRICE_SEED_MIGRATION_KEY)) {
      const savedStandardPrices = window.localStorage.getItem(STANDARD_PRICE_STORAGE_KEY)
      if (savedStandardPrices) {
        try {
          const parsed = JSON.parse(savedStandardPrices)
          if (Array.isArray(parsed) && parsed.some((item) => item && LEGACY_STANDARD_PRICE_IDS.has(item.id))) {
            window.localStorage.removeItem(STANDARD_PRICE_STORAGE_KEY)
          }
        } catch {
          window.localStorage.removeItem(STANDARD_PRICE_STORAGE_KEY)
        }
      }
      window.localStorage.setItem(STANDARD_PRICE_SEED_MIGRATION_KEY, "true")
    }

    const savedStandardPrices = window.localStorage.getItem(STANDARD_PRICE_STORAGE_KEY)
    if (savedStandardPrices) {
      try {
        const parsed = JSON.parse(savedStandardPrices)
        if (Array.isArray(parsed)) {
          setStandardPrices(parsed.map((item) => normalizeRecord(item)))
        }
      } catch {
        setStandardPrices([])
      }
    }

    setIsPreferenceReady(true)
  }, [])

  useEffect(() => {
    if (!isPreferenceReady) return
    window.localStorage.setItem(STANDARD_PRICE_STORAGE_KEY, JSON.stringify(standardPrices))
  }, [isPreferenceReady, standardPrices])

  const filteredStandardPrices = useMemo(() => standardPrices, [standardPrices])

  const handleStandardPriceChange = (id: string, field: keyof StandardPriceRecord, value: string) => {
    setStandardPrices((current) =>
      current.map((item) => {
        if (item.id !== id) return item

        const nextItem = { ...item, [field]: value }
        if (field === "unitPrice" || field === "discountRate") {
          nextItem.proposalPrice = calculateProposalPrice(nextItem.unitPrice, nextItem.discountRate)
        }
        return nextItem
      }),
    )
  }

  const handleStandardPriceDelete = (id: string) => {
    setStandardPrices((current) => current.filter((item) => item.id !== id))
  }

  const handleStandardPriceAddRow = () => {
    setDraftRow(createEmptyStandardPriceRow())
  }

  const handleDraftRowChange = (field: keyof StandardPriceRecord, value: string) => {
    setDraftRow((current) => (current ? { ...current, [field]: value } : current))
  }

  const handleDraftRowSave = () => {
    if (!draftRow) return

    setStandardPrices((current) => [
      ...current,
      {
        ...draftRow,
        proposalPrice: calculateProposalPrice(draftRow.unitPrice, draftRow.discountRate),
      },
    ])
    setDraftRow(null)
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="표준가격표 등록" />
        <main className="flex-1 overflow-auto bg-white p-6">
          <div className="space-y-3 bg-white">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">활동</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>표준가격표 등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card className="border-0 bg-white shadow-none">
              <CardContent className="space-y-2 bg-white p-0">
                <div className="overflow-hidden rounded-lg border bg-white">
                  <div className="flex items-center justify-between bg-white px-3 py-3 text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{filteredStandardPrices.length}건</Badge>
                      <span>Price Unit : 1,000원</span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 border-black px-3 text-sm"
                        onClick={handleStandardPriceAddRow}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        행 추가
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-hidden border-t bg-white">
                    <Table
                      className="table-fixed"
                      containerClassName="max-h-[60vh] overflow-y-auto overflow-x-hidden"
                    >
                      <colgroup>
                        <col className="w-[10%]" />
                        <col className="w-[18%]" />
                        <col className="w-[24%]" />
                        <col className="w-[14%]" />
                        <col className="w-[6%]" />
                        <col className="w-[7%]" />
                        <col className="w-[6%]" />
                        <col className="w-[8%]" />
                        <col className="w-[7%]" />
                      </colgroup>
                      <TableHeader>
                        <TableRow className="bg-[#3c8ca3] hover:bg-[#3c8ca3]">
                          {standardPriceHeaders.map((header, index) => (
                            <TableHead
                              key={header}
                              className={`sticky top-0 z-20 whitespace-pre-line px-1 py-3 text-center text-[13px] font-bold text-white bg-[#3c8ca3] ${
                                index < standardPriceHeaders.length - 1 ? "border-r border-white/70" : ""
                              }`}
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftRow && (
                          <TableRow className="bg-white">
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Textarea
                                value={draftRow.productClass}
                                onChange={(e) => handleDraftRowChange("productClass", e.target.value)}
                                className="min-h-[54px] resize-none rounded-none border-0 bg-transparent break-words px-0 py-0 text-sm whitespace-pre-wrap shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Textarea
                                value={draftRow.productGroup}
                                onChange={(e) => handleDraftRowChange("productGroup", e.target.value)}
                                className="min-h-[54px] resize-none rounded-none border-0 bg-transparent break-words px-0 py-0 text-sm whitespace-pre-wrap shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Textarea
                                value={draftRow.productName}
                                onChange={(e) => handleDraftRowChange("productName", e.target.value)}
                                className="min-h-[54px] resize-none rounded-none border-0 bg-transparent break-words px-0 py-0 text-sm whitespace-pre-wrap shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Textarea
                                value={draftRow.licenseBase}
                                onChange={(e) => handleDraftRowChange("licenseBase", e.target.value)}
                                className="min-h-[54px] resize-none rounded-none border-0 bg-transparent break-words px-0 py-0 text-sm whitespace-pre-wrap shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Input
                                value={draftRow.licenseUnit}
                                onChange={(e) => handleDraftRowChange("licenseUnit", e.target.value)}
                                className="h-9 rounded-none border-0 bg-transparent px-0 text-sm shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Input
                                value={draftRow.unitPrice}
                                onChange={(e) => handleDraftRowChange("unitPrice", e.target.value)}
                                className="h-9 rounded-none border-0 bg-transparent px-0 text-right text-sm shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-top">
                              <Input
                                value={draftRow.discountRate}
                                onChange={(e) => handleDraftRowChange("discountRate", e.target.value)}
                                className="h-9 rounded-none border-0 bg-transparent px-0 text-right text-sm shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-middle">
                              <div className="pr-1 text-right text-xs font-medium whitespace-nowrap">
                                {formatWon(calculateProposalPrice(draftRow.unitPrice, draftRow.discountRate))}
                              </div>
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 align-middle">
                              <div className="flex items-center justify-end gap-1">
                                <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={handleDraftRowSave}>
                                  저장
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setDraftRow(null)}>
                                  취소
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredStandardPrices.map((row) => (
                          <TableRow key={row.id} className="bg-white">
                            <TableCell className="whitespace-pre-line break-words bg-white px-2 py-2 text-sm align-top">
                              <Textarea
                                value={row.productClass}
                                onChange={(e) => handleStandardPriceChange(row.id, "productClass", e.target.value)}
                                className="min-h-[44px] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-sm whitespace-pre-line shadow-none"
                              />
                            </TableCell>
                            <TableCell className="whitespace-pre-line break-words bg-white px-2 py-2 text-center text-sm align-top">
                              <Textarea
                                value={row.productGroup}
                                onChange={(e) => handleStandardPriceChange(row.id, "productGroup", e.target.value)}
                                className="min-h-[44px] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-center text-sm whitespace-pre-line shadow-none"
                              />
                            </TableCell>
                            <TableCell className="whitespace-normal break-words bg-white px-2 py-2 text-sm font-medium leading-5 align-top">
                              <Textarea
                                value={row.productName}
                                onChange={(e) => handleStandardPriceChange(row.id, "productName", e.target.value)}
                                className="min-h-[44px] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-sm leading-5 whitespace-pre-wrap shadow-none"
                              />
                            </TableCell>
                            <TableCell className="whitespace-pre-line break-words bg-white px-2 py-2 text-sm align-top">
                              <Textarea
                                value={row.licenseBase}
                                onChange={(e) => handleStandardPriceChange(row.id, "licenseBase", e.target.value)}
                                className="min-h-[44px] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-sm whitespace-pre-line shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 text-center text-sm align-top">
                              <Textarea
                                value={row.licenseUnit}
                                onChange={(e) => handleStandardPriceChange(row.id, "licenseUnit", e.target.value)}
                                className="min-h-[44px] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-center text-sm shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 text-right text-sm align-top">
                              <Input
                                value={row.unitPrice}
                                onChange={(e) =>
                                  handleStandardPriceChange(row.id, "unitPrice", e.target.value)
                                }
                                className="h-8 rounded-none border-0 bg-transparent px-0 text-right text-sm shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 text-right text-sm align-top">
                              <Input
                                value={row.discountRate}
                                onChange={(e) =>
                                  handleStandardPriceChange(row.id, "discountRate", e.target.value)
                                }
                                className="h-8 rounded-none border-0 bg-transparent px-0 text-right text-sm shadow-none"
                              />
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 text-right text-sm font-medium align-top">
                              <p>
                                {formatWon(calculateProposalPrice(row.unitPrice, row.discountRate))}
                              </p>
                            </TableCell>
                            <TableCell className="bg-white px-2 py-2 text-right align-top">
                              <div className="flex justify-end">
                                <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-red-600" onClick={() => handleStandardPriceDelete(row.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredStandardPrices.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={standardPriceHeaders.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                              검색 조건에 맞는 표준가격표가 없습니다.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-1 bg-white pt-4 text-[15px] leading-7 text-slate-700">
                  {standardPriceNotes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
