"use client"

import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  FileSpreadsheet,
  Filter,
  Edit2,
} from "lucide-react"

// 통합 검색 결과 데이터
const searchResults = [
  {
    id: "OPP-2026-001",
    type: "사업기회",
    name: "삼성전자 EMS 구축",
    customer: "삼성전자",
    date: "2026-03-10",
    status: "진행중",
    amount: "5억",
  },
  {
    id: "CON-2026-001",
    type: "계약",
    name: "농협은행 통합 모니터링 시스템",
    customer: "농협은행",
    date: "2026-03-10",
    status: "진행중",
    amount: "3억",
  },
  {
    id: "PRJ-2026-001",
    type: "사업",
    name: "농협은행 통합 모니터링 시스템",
    customer: "농협은행",
    date: "2026-03-15",
    status: "진행중",
    amount: "3억",
  },
  {
    id: "ACT-2026-001",
    type: "영업활동",
    name: "삼성전자 EMS 구축 - 대면미팅",
    customer: "삼성전자",
    date: "2026-03-17",
    status: "완료",
    amount: "-",
  },
  {
    id: "PMA-2025-008",
    type: "유지보수",
    name: "삼성SDS EMS 유상유지보수",
    customer: "삼성SDS",
    date: "2025-06-01",
    status: "종료예정",
    amount: "2,500만",
  },
]

export default function InquiryPage() {
  const [searchType, setSearchType] = useState("all")
  const [searchStatus, setSearchStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewModal, setViewModal] = useState<{
    title: string
    fields: { label: string; value: string }[]
  } | null>(null)
  const [editModal, setEditModal] = useState<{
    title: string
    fields: { label: string; value: string }[]
  } | null>(null)

  const openViewDialog = (title: string, fields: { label: string; value: string }[]) => {
    setViewModal({ title, fields })
    setIsViewDialogOpen(true)
  }

  const openEditDialog = (title: string, fields: { label: string; value: string }[]) => {
    setEditModal({ title, fields })
    setIsEditDialogOpen(true)
  }

  const handleViewDialogChange = (open: boolean) => {
    setIsViewDialogOpen(open)
    if (!open) setViewModal(null)
  }

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open)
    if (!open) setEditModal(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title="조회" 
          description="영업관리시스템에 등록된 각종 정보를 다양한 조건으로 조회합니다"
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            {/* 검색 필터 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  검색 조건
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>유형</Label>
                    <Select value={searchType} onValueChange={setSearchType}>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="opportunity">사업기회</SelectItem>
                        <SelectItem value="activity">영업활동</SelectItem>
                        <SelectItem value="bid">입찰</SelectItem>
                        <SelectItem value="contract">계약</SelectItem>
                        <SelectItem value="project">사업</SelectItem>
                        <SelectItem value="maintenance">유지보수</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>상태</Label>
                    <Select value={searchStatus} onValueChange={setSearchStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="active">진행중</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                        <SelectItem value="pending">대기</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>고객군</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="public">공공</SelectItem>
                        <SelectItem value="private">민간</SelectItem>
                        <SelectItem value="overseas">해외</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <Input 
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
                    <Input 
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>제품</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="ems">EMS</SelectItem>
                        <SelectItem value="itsm">ITSM</SelectItem>
                        <SelectItem value="automation">Automation</SelectItem>
                        <SelectItem value="wss">WSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>담당자</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="kim">김영업</SelectItem>
                        <SelectItem value="lee">이대리</SelectItem>
                        <SelectItem value="park">박과장</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button variant="outline">
                      초기화
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 검색 결과 */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">검색 결과</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{searchResults.length}건</Badge>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      다운로드
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">코드</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>명칭</TableHead>
                      <TableHead>고객사</TableHead>
                      <TableHead>일자</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((result) => (
                      <TableRow key={result.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openViewDialog(`${result.type} 조회`, [
                        { label: "번호", value: result.id },
                        { label: "유형", value: result.type },
                        { label: "명칭", value: result.name },
                        { label: "고객사", value: result.customer },
                        { label: "기준일", value: result.date },
                        { label: "금액", value: result.amount },
                        { label: "상태", value: result.status },
                      ])}>
                        <TableCell className="font-mono text-sm">{result.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            result.type === "사업기회" ? "bg-blue-50 text-blue-700" :
                            result.type === "계약" ? "bg-green-50 text-green-700" :
                            result.type === "사업" ? "bg-purple-50 text-purple-700" :
                            result.type === "영업활동" ? "bg-cyan-50 text-cyan-700" :
                            "bg-orange-50 text-orange-700"
                          }>
                            {result.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-[250px] truncate">{result.name}</TableCell>
                        <TableCell>{result.customer}</TableCell>
                        <TableCell>{result.date}</TableCell>
                        <TableCell className="text-right font-medium">{result.amount}</TableCell>
                        <TableCell>
                          <Badge variant={
                            result.status === "진행중" ? "default" :
                            result.status === "완료" ? "secondary" : "outline"
                          }
                            className={
                              result.status === "진행중" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                              result.status === "완료" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                              "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            }
                          >
                            {result.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditDialog(`${result.type} 수정`, [
                                { label: "번호", value: result.id },
                                { label: "유형", value: result.type },
                                { label: "명칭", value: result.name },
                                { label: "고객사", value: result.customer },
                                { label: "기준일", value: result.date },
                                { label: "금액", value: result.amount },
                                { label: "상태", value: result.status },
                              ])
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 페이지네이션 */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    총 {searchResults.length}개 중 1-{searchResults.length} 표시
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>이전</Button>
                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
                    <Button variant="outline" size="sm" disabled>다음</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Dialog open={isViewDialogOpen} onOpenChange={handleViewDialogChange}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewModal?.title ?? "조회"}</DialogTitle>
              <DialogDescription>선택한 항목의 상세 정보를 조회합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              {viewModal?.fields.map((field) => (
                <div key={field.label} className="space-y-2 rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
                  <p className="whitespace-pre-wrap break-words text-sm font-semibold">{field.value || "-"}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editModal?.title ?? "수정"}</DialogTitle>
              <DialogDescription>선택한 항목의 정보를 수정합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              {editModal?.fields.map((field) => (
                <div key={field.label} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input defaultValue={field.value} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleEditDialogChange(false)}>취소</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => handleEditDialogChange(false)}>수정</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
