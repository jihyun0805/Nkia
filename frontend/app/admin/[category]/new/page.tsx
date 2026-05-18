"use client"

import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { adminApi } from "@/lib/api/admin-api"
import { toast } from "sonner"

import {
  POSITION_LABELS,
  WORKFLOW_DOMAIN_LABELS,
} from "@/lib/user-utils"

export default function AdminNewPage() {
  const router = useRouter()
  const params = useParams()
  const category = params.category as string

  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const getLabel = () => {
    if (category === "users") return "계정"
    if (category === "permissions") return "권한"
    if (category === "workflow") return "워크플로우 템플릿"
    if (category === "products") return "제품"
    if (category === "departments") return "부서"
    return "항목"
  }
  const label = getLabel()

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      if (category === "users") {
        await adminApi.createUser({
          email: formData.email,
          password: formData.password || "Password123!",
          employeeNumber: formData.employeeNumber,
          position: formData.position || "사원",
          name: formData.name,
          phone: formData.phone || "",
          departmentId: parseInt(formData.departmentId || "1"),
          roleIds: formData.roleIds ? formData.roleIds.split(",").map((id: string) => parseInt(id.trim())) : [],
        })
      } else if (category === "permissions") {
        await adminApi.createRole({
          name: formData.name,
          permissions: formData.permissions ? formData.permissions.split(",").map((p: string) => p.trim()) : [],
        })
      } else if (category === "workflow") {
        await adminApi.createWorkflow({
          name: formData.name,
          workflowDomain: formData.workflowDomain,
          steps: formData.steps || [],
        })
      } else if (category === "products") {
        await adminApi.createProduct({
          productClass: formData.productClass,
          productGroup: formData.productGroup,
          productName: formData.productName,
          licenseStandard: formData.licenseStandard,
          licenseUnit: formData.licenseUnit,
          unitPrice: parseInt(formData.unitPrice || "0"),
        })
      } else if (category === "departments") {
        await adminApi.createDepartment({
          headquarters: formData.headquarters,
          team: formData.team,
        })
      }
      toast.success(`${label} 등록이 완료되었습니다.`)
      router.push("/admin")
    } catch (e: any) {
      console.error(e)
      toast.error(`${label} 등록에 실패했습니다.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 등록`} description={`새로운 ${label} 정보를 등록합니다`} />
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
                  <BreadcrumbPage>{label} 등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <Card>
              <CardHeader>
                <CardTitle>신규 {label} 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {category === "users" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>이름 *</Label><Input onChange={(e) => handleInputChange("name", e.target.value)} /></div>
                      <div className="space-y-2"><Label>사번 *</Label><Input onChange={(e) => handleInputChange("employeeNumber", e.target.value)} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>이메일 *</Label><Input type="email" onChange={(e) => handleInputChange("email", e.target.value)} /></div>
                      <div className="space-y-2"><Label>비밀번호</Label><Input type="password" onChange={(e) => handleInputChange("password", e.target.value)} placeholder="기본값: Password123!" /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>직급 *</Label><Input onChange={(e) => handleInputChange("position", e.target.value)} placeholder="예: 대리, 과장" /></div>
                      <div className="space-y-2"><Label>전화번호</Label><Input onChange={(e) => handleInputChange("phone", e.target.value)} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>부서 ID *</Label><Input type="number" onChange={(e) => handleInputChange("departmentId", e.target.value)} placeholder="부서 고유 ID 숫자" /></div>
                      <div className="space-y-2"><Label>역할 ID 목록</Label><Input onChange={(e) => handleInputChange("roleIds", e.target.value)} placeholder="쉼표(,)로 구분" /></div>
                    </div>
                  </>
                )}

                {category === "permissions" && (
                  <>
                    <div className="space-y-2"><Label>권한명 *</Label><Input onChange={(e) => handleInputChange("name", e.target.value)} /></div>
                    <div className="space-y-2"><Label>권한 목록 (도메인_액션 형식)</Label><Input onChange={(e) => handleInputChange("permissions", e.target.value)} placeholder="쉼표(,)로 구분 (예: USER_READ, WORKFLOW_CREATE)" /></div>
                  </>
                )}

                {category === "workflow" && (
                  <>
                    <div className="space-y-2">
                      <Label>템플릿명 *</Label>
                      <Input onChange={(e) => handleInputChange("name", e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>워크플로우 도메인 *</Label>
                      <Select onValueChange={(value) => handleInputChange("workflowDomain", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="도메인 선택" />
                        </SelectTrigger>

                        <SelectContent>
                          {Object.entries(WORKFLOW_DOMAIN_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>결재 단계</Label>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentSteps = formData.steps || []

                            handleInputChange("steps", [
                              ...currentSteps,
                              {
                                stepOrder: currentSteps.length + 1,
                                stepName: "",
                                approverPosition: "TEAM_MEMBER",
                                required: true,
                                active: true,
                              },
                            ])
                          }}
                        >
                          단계 추가
                        </Button>
                      </div>

                      {(formData.steps || []).map((step: any, index: number) => (
                        <div
                          key={index}
                          className="rounded-lg border p-4 space-y-3"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>단계명</Label>

                              <Input
                                value={step.stepName}
                                onChange={(e) => {
                                  const updated = [...formData.steps]
                                  updated[index].stepName = e.target.value

                                  handleInputChange("steps", updated)
                                }}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>결재자 직급</Label>

                              <Select
                                value={step.approverPosition}
                                onValueChange={(value) => {
                                  const updated = [...formData.steps]
                                  updated[index].approverPosition = value

                                  handleInputChange("steps", updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
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

                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {category === "products" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>제품분류 *</Label>
                        <Select onValueChange={(v) => handleInputChange("productClass", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="분류 선택" />
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
                      <div className="space-y-2"><Label>제품군 *</Label><Input onChange={(e) => handleInputChange("productGroup", e.target.value)} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>제품명 *</Label><Input onChange={(e) => handleInputChange("productName", e.target.value)} /></div>
                      <div className="space-y-2"><Label>단가(천 원) *</Label><Input type="number" onChange={(e) => handleInputChange("unitPrice", e.target.value)} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>라이선스 기준</Label><Input onChange={(e) => handleInputChange("licenseStandard", e.target.value)} /></div>
                      <div className="space-y-2"><Label>단위</Label><Input onChange={(e) => handleInputChange("licenseUnit", e.target.value)} placeholder="예: Core, User, Node" /></div>
                    </div>
                  </>
                )}

                {category === "departments" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>본부명 (Headquarters) *</Label><Input onChange={(e) => handleInputChange("headquarters", e.target.value)} placeholder="예: 영업본부" /></div>
                      <div className="space-y-2"><Label>팀명 (Team) *</Label><Input onChange={(e) => handleInputChange("team", e.target.value)} placeholder="예: 영업1팀" /></div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/admin">취소</Link>
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "등록 중..." : "등록"}
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
