"use client"

import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminApi } from "@/lib/api/admin-api"
import { getAdminItem } from "@/lib/admin-data"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  POSITION_LABELS,
  WORKFLOW_DOMAIN_LABELS,
} from "@/lib/user-utils"

export default function AdminEditPage() {
  const router = useRouter()
  const params = useParams()
  const category = params.category as string
  const id = params.id as string

  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const getLabel = () => {
    if (category === "users") return "계정"
    if (category === "permissions") return "권한"
    if (category === "workflow") return "워크플로우 템플릿"
    if (category === "products") return "제품"
    if (category === "departments") return "부서"
    return "항목"
  }
  const label = getLabel()

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

        let d = res?.data?.data ?? res?.data
        if (!d) {
          d = getAdminItem(category as any, id)
        }

        if (d) {
          if (category === "users") {
            setFormData({
              employeeNumber: d.employeeNumber || "",
              position: d.position || d.role || "",
              name: d.name || "",
              phone: d.phone || "",
              status: d.status || "",
              departmentId: d.departmentId?.toString() || "",
              roleIds: d.roles?.join(", ") || "", 
            })
          } else if (category === "permissions") {
            setFormData({
              name: d.name || "",
              permissions: d.permissions?.join(", ") || "",
            })
          } else if (category === "workflow") {
            setFormData({
              name: d.name || "",
              workflowDomain: d.workflowDomain || "",
              active: d.active !== undefined ? d.active.toString() : "true",
              steps: d.steps || [],
            })
          } else if (category === "products") {
            setFormData({
              productClass: d.productClass || "",
              productGroup: d.productGroup || "",
              productName: d.productName || "",
              licenseStandard: d.licenseStandard || "",
              licenseUnit: d.licenseUnit || "",
              unitPrice: d.unitPrice?.toString() || "0",
            })
          } else if (category === "departments") {
            setFormData({
              headquarters: d.headquarters || "",
              team: d.team || "",
            })
          }
        }
      } catch (e) {
        console.error("Failed to load details", e)
        toast.error("데이터를 불러오는데 실패했습니다.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [category, id])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      if (category === "users") {
        await adminApi.updateUser(id, {
          employeeNumber: formData.employeeNumber,
          position: formData.position,
          name: formData.name,
          phone: formData.phone,
          status: formData.status,
          departmentId: parseInt(formData.departmentId || "1"),
          roleIds: formData.roleIds ? formData.roleIds.split(",").map((i: string) => parseInt(i.trim())) : [],
        })
      } else if (category === "permissions") {
        await adminApi.updateRole(id, {
          permissions: formData.permissions ? formData.permissions.split(",").map((p: string) => p.trim()) : [],
        })
      } else if (category === "workflow") {
        await adminApi.updateWorkflow(id, {
          name: formData.name,
          workflowDomain: formData.workflowDomain,
          active: formData.active === "true",
        })
      } else if (category === "products") {
        await adminApi.updateProduct(id, {
          productClass: formData.productClass,
          productGroup: formData.productGroup,
          productName: formData.productName,
          licenseStandard: formData.licenseStandard,
          licenseUnit: formData.licenseUnit,
          unitPrice: parseInt(formData.unitPrice || "0"),
        })
      } else if (category === "departments") {
        await adminApi.updateDepartment(id, {
          headquarters: formData.headquarters,
          team: formData.team,
        })
      }
      toast.success(`${label} 수정이 완료되었습니다.`)
      router.push(category === "departments" ? "/admin" : `/admin/${category}/${id}`)
    } catch (e: any) {
      console.error(e)
      toast.error(`${label} 수정에 실패했습니다.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 수정`} description={`${label} 정보를 페이지에서 수정합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/admin">시스템관리</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {category === "departments" ? (
                    <span className="text-muted-foreground">{id}</span>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={`/admin/${category}/${id}`}>{id}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>수정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <Card>
              <CardHeader>
                <CardTitle>{label} 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {category === "users" && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><Label>이름 *</Label><Input value={formData.name || ""} onChange={(e) => handleInputChange("name", e.target.value)} /></div>
                          <div className="space-y-2"><Label>사번 *</Label><Input value={formData.employeeNumber || ""} onChange={(e) => handleInputChange("employeeNumber", e.target.value)} /></div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><Label>직급 *</Label><Input value={formData.position || ""} onChange={(e) => handleInputChange("position", e.target.value)} /></div>
                          <div className="space-y-2"><Label>전화번호</Label><Input value={formData.phone || ""} onChange={(e) => handleInputChange("phone", e.target.value)} /></div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><Label>부서 ID *</Label><Input type="number" value={formData.departmentId || ""} onChange={(e) => handleInputChange("departmentId", e.target.value)} /></div>
                          <div className="space-y-2"><Label>역할 ID 목록</Label><Input value={formData.roleIds || ""} onChange={(e) => handleInputChange("roleIds", e.target.value)} placeholder="쉼표(,)로 구분" /></div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>상태 *</Label>
                            <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                              <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVE">활성</SelectItem>
                                <SelectItem value="INACTIVE">비활성</SelectItem>
                                <SelectItem value="LOCKED">잠김</SelectItem>
                                <SelectItem value="DELETED">삭제됨</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}

                    {category === "permissions" && (
                      <>
                        <div className="space-y-2"><Label>권한명 (읽기전용)</Label><Input value={formData.name || ""} readOnly disabled /></div>
                        <div className="space-y-2"><Label>권한 목록 (도메인_액션 형식)</Label><Input value={formData.permissions || ""} onChange={(e) => handleInputChange("permissions", e.target.value)} placeholder="쉼표(,)로 구분" /></div>
                      </>
                    )}

                    {category === "workflow" && (
                      <>
                        <div className="space-y-2"><Label>템플릿명 *</Label><Input value={formData.name || ""} onChange={(e) => handleInputChange("name", e.target.value)} /></div>
                        <div className="space-y-2">
                          <Label>워크플로우 도메인 *</Label>
                          <Select
                            value={formData.workflowDomain || ""}
                            onValueChange={(value) =>
                              handleInputChange("workflowDomain", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="도메인 선택" />
                            </SelectTrigger>

                            <SelectContent>
                              {Object.entries(WORKFLOW_DOMAIN_LABELS).map(
                                ([key, label]) => (
                                  <SelectItem key={key} value={key}>
                                    {label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>활성 상태 *</Label>
                          <Select value={formData.active} onValueChange={(v) => handleInputChange("active", v)}>
                            <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">활성</SelectItem>
                              <SelectItem value="false">비활성</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label>결재 단계</Label>

                          {formData.steps?.length > 0 ? (
                            <div className="space-y-3">
                              {[...formData.steps]
                                .sort((a, b) => a.stepOrder - b.stepOrder)
                                .map((step, index) => (
                                  <div
                                    key={step.id ?? index}
                                    className="rounded-lg border bg-muted/30 p-4 space-y-3"
                                  >
                                    <div className="font-semibold">
                                      {step.stepOrder}단계
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label>단계명</Label>
                                        <Input
                                          value={step.stepName}
                                          onChange={(e) => {
                                            const updated = [...formData.steps]
                                            updated[index] = {
                                              ...updated[index],
                                              stepName: e.target.value,
                                            }
                                            setFormData({ ...formData, steps: updated })
                                          }}
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <Label>결재자 직급</Label>
                                        <Select
                                          value={step.approverPosition}
                                          onValueChange={(value) => {
                                            const updated = [...formData.steps]

                                            updated[index] = {
                                              ...updated[index],
                                              approverPosition: value,
                                            }

                                            setFormData({
                                              ...formData,
                                              steps: updated,
                                            })
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="결재자 직급 선택" />
                                          </SelectTrigger>

                                          <SelectContent>
                                            {Object.entries(POSITION_LABELS).map(([key, label]) => (
                                              <SelectItem key={key} value={key}>
                                                {label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>필수 여부</Label>
                                        <Select
                                          value={step.required ? "true" : "false"}
                                          onValueChange={(value) => {
                                            const updated = [...formData.steps]
                                            updated[index] = {
                                              ...updated[index],
                                              required: value === "true",
                                            }
                                            setFormData({ ...formData, steps: updated })
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="true">필수</SelectItem>
                                            <SelectItem value="false">선택</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                ))
                                
                                }
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                              등록된 단계가 없습니다.
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {category === "products" && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>제품분류 *</Label>
                            <Select value={formData.productClass} onValueChange={(v) => handleInputChange("productClass", v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="제품분류 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EMS">EMS</SelectItem>
                                <SelectItem value="DASHBOARD">DASHBOARD</SelectItem>
                                <SelectItem value="DATACENTER">상면관리</SelectItem>
                                <SelectItem value="RCA">RCA</SelectItem>
                                <SelectItem value="DCA">DCA</SelectItem>
                                <SelectItem value="ITSM">ITSM</SelectItem>
                                <SelectItem value="ITAM">ITAM</SelectItem>
                                <SelectItem value="SUPPORTING_TOOLS">SUPPORTING TOOLS</SelectItem>
                                <SelectItem value="CLOUD">CLOUD</SelectItem>
                                <SelectItem value="BSM">BSM</SelectItem>
                                <SelectItem value="E2E">E2E</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2"><Label>제품군 *</Label><Input value={formData.productGroup || ""} onChange={(e) => handleInputChange("productGroup", e.target.value)} /></div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><Label>제품명 *</Label><Input value={formData.productName || ""} onChange={(e) => handleInputChange("productName", e.target.value)} /></div>
                          <div className="space-y-2"><Label>단가(천 원) *</Label><Input type="number" value={formData.unitPrice || ""} onChange={(e) => handleInputChange("unitPrice", e.target.value)} /></div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><Label>라이선스 기준</Label><Input value={formData.licenseStandard || ""} onChange={(e) => handleInputChange("licenseStandard", e.target.value)} /></div>
                          <div className="space-y-2"><Label>단위</Label><Input value={formData.licenseUnit || ""} onChange={(e) => handleInputChange("licenseUnit", e.target.value)} /></div>
                        </div>
                      </>
                    )}

                    {category === "departments" && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2"><Label>본부명 (Headquarters) *</Label><Input value={formData.headquarters || ""} onChange={(e) => handleInputChange("headquarters", e.target.value)} /></div>
                          <div className="space-y-2"><Label>팀명 (Team) *</Label><Input value={formData.team || ""} onChange={(e) => handleInputChange("team", e.target.value)} /></div>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2 border-t pt-6">
                      <Button variant="outline" asChild>
                        <Link href={category === "departments" ? "/admin" : `/admin/${category}/${id}`}>취소</Link>
                      </Button>
                      <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "수정 중..." : "수정"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
