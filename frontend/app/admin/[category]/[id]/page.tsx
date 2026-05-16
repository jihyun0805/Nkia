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

        if (res && res.data) {
          setData(res.data)
        } else {
          // fallback to mock data
          const mockData = getAdminItem(category as any, id)
          if (mockData) {
            setData(mockData)
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
        { label: "역할", value: data.roles?.join(", ") || "-" },
        { label: "생성일", value: data.createdAt ? format(new Date(data.createdAt), "yyyy-MM-dd HH:mm") : "-" },
      ]
    }
    if (category === "permissions") {
      return [
        { label: "권한 ID", value: data.id.toString() },
        { label: "권한명", value: data.name },
        { label: "권한 목록", value: data.permissions?.join(", ") || "없음" },
      ]
    }
    if (category === "workflow") {
      return [
        { label: "워크플로우 ID", value: data.id.toString() },
        { label: "템플릿명", value: data.name },
        { label: "도메인(단계)", value: data.workflowDomain },
        { label: "상태", value: data.active ? "활성" : "비활성" },
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
