"use client"

import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DetailFormCard } from "@/components/erp/detail-form-card"
import { adminApi } from "@/lib/api/admin-api"
import { getAdminItem } from "@/lib/admin-data"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { permissionDomains, permissionActions } from "@/lib/user-utils";

export default function AdminDetailPage() {
  const params = useParams()
  const router = useRouter()
  const category = params.category as string
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        let res: any = null

        if (category === "users") {
          res = await adminApi.getUser(id).catch(() => null)
        } else if (category === "permissions") {
          res = await adminApi.getRole(id).catch(() => null)
        } else if (category === "workflow") {
          res = await adminApi.getWorkflow(id).catch(() => null)
        } else if (category === "products") {
          res = await adminApi.getProduct(id).catch(() => null)
        } else if (category === "departments") {
          res = await adminApi.getDepartment(id).catch(() => null)
        }

        const d = res?.data?.data ?? res?.data

        if (d) {
          if (category === "permissions") {
            setData({
              ...d,
              permissions: (d.permissions || []).map((p: any) => {
                const domain = permissionDomains.find(
                  (item) => item.label === p.domain || item.value === p.domain
                )
                const action = permissionActions.find(
                  (item) => item.label === p.action || item.value === p.action
                )

                return {
                  ...p,
                  domain: domain?.label ?? p.domain,
                  action: action?.label ?? p.action,
                  domainValue: domain?.value ?? p.domain,
                  actionValue: action?.value ?? p.action,
                }
              }),
            })
          } else {
            setData(d)
          }
        }
      } catch (e) {
        console.error("Failed to load details", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [category, id])

  const getLabel = () => {
    if (category === "users") return "계정"
    if (category === "permissions") return "권한 그룹"
    if (category === "workflow") return "워크플로우 템플릿"
    if (category === "products") return "제품"
    if (category === "departments") return "부서"
    return "항목"
  }
  const label = getLabel()

  const getFields = () => {
    if (!data) return []
    if (category === "users") {
      return [
        { label: "사번", value: data.employeeNumber },
        { label: "이름", value: data.name },
        { label: "직급", value: data.position },
        { label: "이메일", value: data.email },
        { label: "전화번호", value: data.phone || "-" },
        { label: "부서", value: data.departmentName },
        { label: "상태", value: data.status },
        { label: "권한", value: data.roles?.join(", ") || "-" },
        { label: "생성일", value: data.createdAt ? format(new Date(data.createdAt), "yyyy-MM-dd HH:mm") : "-" },
      ]
    }
    if (category === "workflow") {
      const stepsText =
        data.steps?.length > 0
          ? [...data.steps]
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map(
                (step) =>
                  `${step.stepOrder}단계 | ${step.stepName} | ${step.approverPosition} | ${
                    step.required ? "필수" : "선택"
                  } | ${step.active ? "활성" : "비활성"}`
              )
              .join("\n")
          : "등록된 단계 없음"
      return [
        { label: "워크플로우 ID", value: data.id.toString() },
        { label: "템플릿명", value: data.name },
        { label: "도메인(단계)", value: data.workflowDomain },
        { label: "상태", value: data.active ? "활성" : "비활성" },
        { label: "결재 단계", value: stepsText },
      ]
    }
    if (category === "products") {
      return [
        { label: "제품 ID", value: data.id.toString() },
        { label: "제품 클래스", value: data.productClass },
        { label: "제품 그룹", value: data.productGroup },
        { label: "제품명", value: data.productName },
        { label: "라이선스 기준", value: data.licenseStandard },
        { label: "단위", value: data.licenseUnit },
        { label: "단가 (원)", value: data.unitPrice?.toLocaleString() },
      ]
    }
    if (category === "departments") {
      return [
        { label: "부서 ID", value: data.id.toString() },
        { label: "본부명", value: data.headquarters },
        { label: "팀명", value: data.team },
      ]
    }
    return []
  }

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      if (category === "products") {
        await adminApi.deleteProduct(id)
        alert("삭제되었습니다.")
        router.push("/admin")
      } else if (category === "departments") {
        await adminApi.deleteDepartment(id)
        alert("삭제되었습니다.")
        router.push("/admin")
      } else {
        alert("이 항목은 삭제할 수 없습니다.")
      }
    } catch (e) {
      console.error(e)
      alert("삭제 실패")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={`${label} 정보를 페이지에서 조회합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/admin">시스템관리</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{data ? (data.name || data.productName || id) : id} {label} 상세</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : !data ? (
              <div className="text-center p-8 text-muted-foreground">데이터를 찾을 수 없습니다.</div>
            ) : category === "workflow" ? (
              <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
                <h2 className="text-xl font-bold">워크플로우 템플릿 상세</h2>

                <div className="grid gap-4 md:grid-cols-2">

                  <div>
                    <div className="mb-2 font-semibold">템플릿명</div>
                    <div className="rounded-md border p-3">{data.name}</div>
                  </div>

                  <div>
                    <div className="mb-2 font-semibold">도메인(단계)</div>
                    <div className="rounded-md border p-3">{data.workflowDomain}</div>
                  </div>

                  <div>
                    <div className="mb-2 font-semibold">상태</div>
                    <div className="rounded-md border p-3">
                      {data.active ? "활성" : "비활성"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-3">
                    <div className="font-semibold">결재 단계</div>

                    {data.steps?.map((step, index) => (
                      <div
                        key={step.id ?? index}
                        className="rounded-lg border p-4 space-y-2"
                      >
                        <div className="font-bold">
                          {step.stepOrder}단계 - {step.stepName}
                        </div>

                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <div>결재 직급: {step.approverPosition}</div>
                          <div>필수 여부: {step.required ? "필수" : "선택"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t pt-6">
                  <Link href="/admin">
                    <button className="rounded-md border px-5 py-2">목록</button>
                  </Link>

                  <Link href={`/admin/${category}/${id}/edit`}>
                    <button className="rounded-md bg-red-600 px-5 py-2 text-white">
                      수정
                    </button>
                  </Link>
                </div>
              </div>

              ) : category === "permissions" ? (
                <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
                  <h2 className="text-xl font-bold">권한 그룹 상세</h2>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="font-semibold">권한명</div>
                      <div className="rounded-md border p-3">
                        {data.roleName}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="font-semibold">권한 목록</div>

                      <div className="space-y-4">
                        {permissionDomains.map((domain) => (
                          <div key={domain.value} className="rounded-lg border p-4">
                            <div className="mb-3 font-bold">{domain.label}</div>

                            <div className="flex flex-wrap gap-4">
                              {permissionActions.map((action) => {
                              const checked = data.permissions?.some((p: any) => {
                                return p.domainValue === domain.value && p.actionValue === action.value
                              })

                                return (
                                  <label
                                    key={`${domain.value}-${action.value}`}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input type="checkbox" checked={!!checked} readOnly />
                                    {action.label}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-6">
                    <Link href="/admin">
                      <button className="rounded-md border px-5 py-2">목록</button>
                    </Link>

                    <Link href={`/admin/${category}/${id}/edit`}>
                      <button className="rounded-md bg-red-600 px-5 py-2 text-white">
                        수정
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <DetailFormCard 
                  title={`${label} 상세`} 
                  fields={getFields()} 
                  listHref="/admin" 
                  editHref={`/admin/${category}/${id}/edit`} 
                />
              )}

            {(category === "products" || category === "departments") && !loading && data && (
              <div className="flex justify-end pt-4">
                <button onClick={handleDelete} className="text-red-500 hover:underline text-sm font-medium">
                  이 항목 삭제
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
