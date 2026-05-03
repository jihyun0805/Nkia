"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getCustomerByName, getCustomers, updateCustomer, type CustomerContact, type CustomerRecord } from "@/lib/finding-data"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash2, X } from "lucide-react"

const customerGroupOptions = ["공공", "민간", "해외"]

type ContactDraft = CustomerContact

function createEmptyContactDraft(): ContactDraft {
  return {
    name: "",
    position: "",
    department: "",
    email: "",
    mobilePhone: "",
    landlinePhone: "",
    duty: "",
    memo: "",
  }
}

function normalizeContacts(customer: CustomerRecord | null) {
  if (!customer) return [createEmptyContactDraft()]
  if (Array.isArray(customer.contacts) && customer.contacts.length > 0) {
    return customer.contacts.map((contact) => ({ ...createEmptyContactDraft(), ...contact }))
  }

  return [
    {
      name: customer.contact ?? "",
      position: customer.position ?? "",
      department: customer.department ?? "",
      email: customer.email ?? "",
      mobilePhone: customer.mobilePhone ?? customer.phone ?? "",
      landlinePhone: customer.landlinePhone ?? "",
      duty: customer.duty ?? "",
      memo: customer.memo ?? "",
    },
  ]
}

function hasContactValue(contact: ContactDraft) {
  return [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone, contact.duty, contact.memo].some(
    (value) => String(value ?? "").trim(),
  )
}

function CustomerEditPageContent() {
  const params = useParams<{ id?: string | string[] }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerGroup, setCustomerGroup] = useState("민간")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [contacts, setContacts] = useState<ContactDraft[]>([createEmptyContactDraft()])
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  useEffect(() => {
    const sync = () => {
      const current = getCustomers().find((item) => item.id === id) ?? null
      setCustomer(current)
      if (current) {
        setCustomerName(current.name)
        setCustomerGroup(current.category)
        setAddress(current.address ?? "")
        setMemo(current.memo ?? "")
        setContacts(normalizeContacts(current))
      }
    }

    sync()
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [id])

  const backHref = `/finding/customers/${id}?tab=${searchParams.get("tab") ?? "customers"}`
  const selectedCustomer = useMemo(() => getCustomerByName(customerName), [customerName])

  const handleSave = () => {
    const normalizedName = customerName.trim()
    const filledContacts = contacts.filter(hasContactValue)
    const primaryContact = filledContacts[0]

    if (!normalizedName || !primaryContact?.name?.trim() || !primaryContact?.mobilePhone?.trim()) {
      toast({
        title: "고객사 수정 확인",
        description: "고객사명, 담당자 1의 성명, 무선전화번호를 모두 입력해주십시오.",
      })
      return
    }

    const duplicate = selectedCustomer && selectedCustomer.id !== id ? selectedCustomer : null
    if (duplicate) {
      toast({
        title: "고객사 중복 등록",
        description: "이미 등록된 동일한 이름의 고객사가 있습니다.",
      })
      return
    }

    const result = updateCustomer(id, {
      name: normalizedName,
      category: customerGroup,
      contacts: filledContacts,
      address,
      memo,
      aliases: customer?.aliases ?? [],
    })

    if (result.status === "not_found") {
      toast({
        title: "고객사 수정 실패",
        description: "수정할 고객사를 찾지 못했습니다.",
      })
      return
    }

    toast({
      title: "고객사 수정 완료",
      description: `${result.customer.name} 고객사 정보가 수정되었습니다.`,
    })
    router.push(`/finding/customers/${result.customer.id}?tab=${searchParams.get("tab") ?? "customers"}`)
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="고객사 수정" description="고객사 정보를 조회합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  고객사 정보를 찾을 수 없습니다.
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="고객사 수정" description="고객사 담당자 정보를 수정합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/finding?tab=${searchParams.get("tab") ?? "customers"}`}>발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={backHref}>고객사 상세</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>수정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>고객사 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객사명 *</Label>
                      <CustomerAutocomplete
                        value={customerName}
                        onSelect={(nextCustomer) => setCustomerName(nextCustomer?.name ?? "")}
                        onValueChange={setCustomerName}
                        allowCustomValue
                        placeholder="고객사명을 입력하세요"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>고객군 *</Label>
                      <Select value={customerGroup} onValueChange={setCustomerGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerGroupOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>주소</Label>
                      <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="주소를 입력하세요" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>메모</Label>
                      <Textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="메모를 입력하세요" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">고객사 담당자 정보</h2>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setContacts((prev) => [...prev, createEmptyContactDraft()])}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      담당자 추가
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {contacts.map((contact, index) => (
                      <section key={index} className="space-y-4 border border-border p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{`담당자 ${index + 1}`}</h3>
                          <Button type="button" variant="outline" size="sm" onClick={() => setDeleteIndex(index)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            담당자 삭제
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>담당자명</Label>
                            <Input
                              value={contact.name}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
                              }
                              placeholder="담당자 이름을 입력하세요."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>직급/직책</Label>
                            <Input
                              value={contact.position ?? ""}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, position: event.target.value } : item)))
                              }
                              placeholder="직급/직책을 입력하세요."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>소속부서</Label>
                            <Input
                              value={contact.department ?? ""}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, department: event.target.value } : item)))
                              }
                              placeholder="소속부서명을 입력하세요."
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>이메일</Label>
                            <Input
                              value={contact.email ?? ""}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, email: event.target.value } : item)))
                              }
                              placeholder="0000@000.co.kr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>무선전화번호</Label>
                            <Input
                              value={contact.mobilePhone ?? ""}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, mobilePhone: event.target.value } : item)))
                              }
                              placeholder="000-000-0000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>유선전화번호</Label>
                            <Input
                              value={contact.landlinePhone ?? ""}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, landlinePhone: event.target.value } : item)))
                              }
                              placeholder="02-0000-0000"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>담당 직무</Label>
                          <Input
                            value={contact.duty ?? ""}
                            onChange={(event) =>
                              setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, duty: event.target.value } : item)))
                            }
                            placeholder="담당 직무를 입력하세요."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>비고</Label>
                          <Textarea
                            value={contact.memo ?? ""}
                            onChange={(event) =>
                              setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, memo: event.target.value } : item)))
                            }
                            rows={3}
                            placeholder="담당자 관련 특기사항을 입력하세요."
                          />
                        </div>
                      </section>
                    ))}
                  </div>
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={backHref}>취소</Link>
                  </Button>
                  <Button onClick={handleSave}>저장</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </AlertDialogCancel>
          <AlertDialogHeader>
            <AlertDialogTitle>담당자 삭제</AlertDialogTitle>
            <AlertDialogDescription>담당자 정보 전체를 삭제합니다. 진행하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteIndex === null) return
                setContacts((prev) => prev.filter((_, index) => index !== deleteIndex))
                setDeleteIndex(null)
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function CustomerEditPage() {
  return (
    <Suspense fallback={null}>
      <CustomerEditPageContent />
    </Suspense>
  )
}
