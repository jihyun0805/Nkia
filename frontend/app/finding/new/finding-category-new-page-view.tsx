"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
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
import { findingFormSections, getCustomerByName, getFindingCategoryLabel, registerCustomer, type FindingFormField } from "@/lib/finding-data"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash2, X } from "lucide-react"

const customerGroupOptions = ["공공", "민간", "해외"]
const partnerTypeOptions = ["SI", "파트너", "기타"]

const partnerFormSections = [
  {
    title: "등록정보",
    fields: [
      { label: "협력사명", required: true },
      { label: "유형", required: true, type: "select", options: partnerTypeOptions },
      { label: "담당자" },
      { label: "연락처" },
      { label: "주요 협업 분야", type: "textarea" },
    ] as FindingFormField[],
  },
  {
    title: "첨부파일",
    fields: [{ label: "첨부파일", type: "file" }] as FindingFormField[],
  },
]

type ContactDraft = {
  name: string
  position: string
  department: string
  email: string
  mobilePhone: string
  landlinePhone: string
  duty: string
  memo: string
}

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

function hasContactValue(contact: ContactDraft) {
  return [contact.name, contact.position, contact.department, contact.email, contact.mobilePhone, contact.landlinePhone, contact.duty, contact.memo].some(
    (value) => value.trim(),
  )
}

function FindingFormControl({ field }: { field: FindingFormField }) {
  if (field.type === "file") return <Input type="file" multiple />
  if (field.type === "textarea") return <Textarea rows={4} placeholder={`${field.label}을 입력하세요`} />
  if (field.type === "select") {
    return (
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return <Input placeholder={`${field.label}을 입력하세요`} />
}

export function FindingCategoryNewPageView({
  category,
}: {
  category: "opportunities" | "customers" | "partners"
}) {
  const router = useRouter()
  const label = getFindingCategoryLabel(category)
  const [customerName, setCustomerName] = useState("")
  const [customerGroup, setCustomerGroup] = useState("민간")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [contacts, setContacts] = useState<ContactDraft[]>([createEmptyContactDraft()])
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const handleSubmit = () => {
    const normalizedName = customerName.trim()
    const filledContacts = contacts.filter(hasContactValue)
    const primaryContact = filledContacts[0]

    if (!normalizedName || !primaryContact?.name.trim() || !primaryContact?.mobilePhone.trim()) {
      toast({
        title: "고객사 등록 확인",
        description: "고객사명, 담당자 1의 성명, 무선전화번호를 모두 입력해주십시오.",
      })
      return
    }

    const duplicate = getCustomerByName(normalizedName)
    if (duplicate) {
      setDuplicateOpen(true)
      return
    }

    const result = registerCustomer({
      name: normalizedName,
      category: customerGroup,
      contacts: filledContacts,
      address,
      memo,
      aliases: [],
    })

    if (result.status === "duplicate") {
      setDuplicateOpen(true)
      return
    }

    toast({
      title: "고객사 등록 완료",
      description: `${result.customer.name} 고객사가 등록되었습니다.`,
    })
    router.push("/finding?tab=customers")
  }

  if (category !== "customers") {
    const pageSections = category === "partners" ? partnerFormSections : findingFormSections
    const backHref = `/finding?tab=${category}`
    const pageDescription =
      category === "partners"
        ? "협력사 기본정보를 등록합니다"
        : "신규 사업기회 등록정보를 입력합니다"

    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${label} 등록`} description={pageDescription} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={backHref}>발굴</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{label} 등록</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Card>
                <CardHeader>
                  <CardTitle>{label} 등록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {pageSections.map((section) => (
                    <section key={section.title} className="space-y-4">
                      <h2 className="text-base font-semibold">{section.title}</h2>
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.fields.map((field) => (
                          <div key={field.label} className={field.type === "textarea" || field.type === "file" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                            <Label>
                              {field.label}
                              {field.required ? " *" : ""}
                            </Label>
                            <FindingFormControl field={field} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                  <div className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" asChild>
                      <Link href={backHref}>취소</Link>
                    </Button>
                    <Button asChild>
                      <Link href={backHref}>등록</Link>
                    </Button>
                  </div>
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
        <Header title={`${label} 등록`} description="고객사명 자동완성으로 기존 고객을 먼저 찾고, 신규 고객을 등록합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding?tab=customers">발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label} 등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{label} 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>고객사명 *</Label>
                      <CustomerAutocomplete
                        value={customerName}
                        onSelect={(customer) => setCustomerName(customer?.name ?? "")}
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
                              value={contact.position}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, position: event.target.value } : item)))
                              }
                              placeholder="직급/직책을 입력하세요."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>소속부서</Label>
                            <Input
                              value={contact.department}
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
                              value={contact.email}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, email: event.target.value } : item)))
                              }
                              placeholder="0000@000.co.kr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>무선전화번호</Label>
                            <Input
                              value={contact.mobilePhone}
                              onChange={(event) =>
                                setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, mobilePhone: event.target.value } : item)))
                              }
                              placeholder="000-000-0000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>유선전화번호</Label>
                            <Input
                              value={contact.landlinePhone}
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
                            value={contact.duty}
                            onChange={(event) =>
                              setContacts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, duty: event.target.value } : item)))
                            }
                            placeholder="담당 직무를 입력하세요."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>비고</Label>
                          <Textarea
                            value={contact.memo}
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

                <section className="space-y-2">
                  <Label>첨부파일</Label>
                  <Input type="file" multiple />
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/finding">취소</Link>
                  </Button>
                  <Button onClick={handleSubmit}>등록</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <AlertDialogContent>
          <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </AlertDialogCancel>
          <AlertDialogHeader>
            <AlertDialogTitle>고객사 중복 등록</AlertDialogTitle>
            <AlertDialogDescription>이미 등록된 동일한 이름의 고객사가 있습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateOpen(false)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
