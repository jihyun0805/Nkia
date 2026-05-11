"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { UserPlus, Users, Shield, Settings } from "lucide-react"
import { permissionGroups, users, workflows } from "@/lib/admin-data"

export default function AdminPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title="시스템관리" description="계정 관리, 권한 설정 및 프로세스 관리를 수행합니다" />
      <main className="flex-1 overflow-auto p-6"><Tabs defaultValue="users" className="space-y-6"><div className="flex items-center justify-between"><TabsList><TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />계정관리</TabsTrigger><TabsTrigger value="permissions" className="gap-2"><Shield className="w-4 h-4" />권한관리</TabsTrigger><TabsTrigger value="workflow" className="gap-2"><Settings className="w-4 h-4" />프로세스관리</TabsTrigger></TabsList></div>
      <TabsContent value="users"><Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">사용자 목록</CardTitle><Button asChild><Link href="/admin/new"><UserPlus className="mr-2 w-4 h-4" />계정 등록</Link></Button></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>이름</TableHead><TableHead>이메일</TableHead><TableHead>부서</TableHead><TableHead>역할</TableHead><TableHead>프리세일즈</TableHead><TableHead>권한</TableHead><TableHead>상태</TableHead><TableHead>최종 로그인</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/users/${user.id}`)}><TableCell>{user.id}</TableCell><TableCell>{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.department}</TableCell><TableCell>{user.role}</TableCell><TableCell>{user.isPresales ? "지정" : "-"}</TableCell><TableCell>{user.permissions.join(", ")}</TableCell><TableCell>{user.status}</TableCell><TableCell>{user.lastLogin}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="permissions"><Card><CardHeader><CardTitle className="text-lg">권한 그룹</CardTitle></CardHeader><CardContent className="space-y-4">{permissionGroups.map((group) => <div key={group.id} className="cursor-pointer rounded-lg border p-4 hover:bg-muted/50" onClick={() => router.push(`/admin/permissions/${group.id}`)}><div className="flex items-center justify-between"><div><p className="font-semibold">{group.name}</p><p className="text-sm text-muted-foreground">{group.description}</p></div><p className="text-sm">{group.userCount}명</p></div></div>)}</CardContent></Card></TabsContent>
      <TabsContent value="workflow"><Card><CardHeader><CardTitle className="text-lg">워크플로우 설정</CardTitle></CardHeader><CardContent className="space-y-4">{workflows.map((workflow) => <div key={workflow.id} className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-muted/50" onClick={() => router.push(`/admin/workflow/${workflow.id}`)}><div><p className="font-semibold">{workflow.name}</p><p className="text-sm text-muted-foreground">{workflow.steps.join(" → ")}</p></div><div className="flex items-center gap-4"><Switch checked={workflow.status === "활성"} /><p className="text-sm text-muted-foreground">{workflow.lastModified}</p></div></div>)}</CardContent></Card></TabsContent>
      </Tabs></main></div></div>
  )
}
