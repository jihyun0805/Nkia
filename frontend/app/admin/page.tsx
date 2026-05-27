"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Users, Shield, Settings, Search, Loader2, PackagePlus, Plus, Building, Pencil, Trash2 } from "lucide-react";
import { adminApi, UserResponse, RoleListResponse, WorkflowTemplateListResponse, ProductModuleResponse, DepartmentResponse } from "@/lib/api/admin-api";
import { format } from "date-fns";
import { toast } from "sonner";

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTab === "permissions" || initialTab === "workflow" || initialTab === "products" || initialTab === "departments"
      ? initialTab
      : "users",
  );

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [usersRes, rolesRes, workflowsRes, productsRes, departmentsRes] = await Promise.all([
          adminApi.getUsers().catch(() => null),
          adminApi.getRoles().catch(() => null),
          adminApi.getWorkflows().catch(() => null),
          adminApi.getProducts().catch(() => null),
          adminApi.getDepartments().catch(() => null),
        ]);

        if (usersRes && usersRes.data && usersRes.data.length > 0) {
          const mappedUsers = usersRes.data.map((u: UserResponse) => ({
            id: u.id,
            employeeNumber: u.employeeNumber,
            rawId: u.id,
            name: u.name,
            position: u.position,
            email: u.email,
            department: u.departmentName,
            role: u.roles ? u.roles.join(", ") : "-",
            permissions: [],
            status: u.status,
            lastLogin: u.createdAt ? format(new Date(u.createdAt), "yyyy-MM-dd HH:mm") : "-",
            isPresales: false,
          }));
          setUsers(mappedUsers);
        }

        if (rolesRes && rolesRes.data && rolesRes.data.length > 0) {
          const mappedRoles = rolesRes.data.map((r: RoleListResponse) => ({
            id: r.id.toString(),
            name: r.name,
            description: r.permissions ? r.permissions.join(", ") : "설명 없음",
            userCount: "-",
            permissions: r.permissions,
          }));
          setRoles(mappedRoles);
        }

        const workflowData = workflowsRes?.data ?? [];

        if (workflowData.length > 0) {
          const mappedWorkflows = workflowData.map((w) => ({
            id: w.id.toString(),
            name: w.name,
            steps: [w.workflowDomain],
            status: w.active ? "활성" : "비활성",
            lastModified: "-",
            active: w.active,
          }));

          setWorkflows(mappedWorkflows);
        }

        if (productsRes && productsRes.data && productsRes.data.length > 0) {
          const mappedProducts = productsRes.data.map((p: ProductModuleResponse) => ({
            id: p.id.toString(),
            productClass: p.productClass,
            productGroup: p.productGroup,
            productName: p.productName,
            licenseStandard: p.licenseStandard,
            licenseUnit: p.licenseUnit,
            unitPrice: p.unitPrice,
          }));
          setProducts(mappedProducts);
        }

        if (departmentsRes && departmentsRes.data && departmentsRes.data.length > 0) {
          const mappedDepartments = departmentsRes.data.map((d: DepartmentResponse) => ({
            id: d.id.toString(),
            headquarters: d.headquarters,
            team: d.team,
          }));
          setDepartments(mappedDepartments);
        }
      } catch (e) {
        console.error("Failed to load admin data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await adminApi.deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      toast.success("부서가 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("부서 삭제에 실패했습니다.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await adminApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("제품이 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("제품 삭제에 실패했습니다.");
    }
  };

  // 검색 필터링 로직
  const filteredUsers = users.filter((u) => !searchTerm || [u.employeeNumber, u.name, u.position, u.email, u.department, u.role].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())));

  const filteredRoles = roles.filter((r) => !searchTerm || [r.name, r.description].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())));

  const filteredWorkflows = workflows.filter((w) => !searchTerm || [w.name].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())));

  const filteredProducts = products.filter((p) => !searchTerm || [p.productClass, p.productGroup, p.productName].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())));

  const filteredDepartments = departments.filter((d) => !searchTerm || [d.headquarters, d.team].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="시스템관리" description="계정, 권한, 프로세스, 제품 및 부서 관리를 수행합니다" />
        <main className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              <TabsList>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  계정관리
                </TabsTrigger>
                <TabsTrigger value="permissions" className="gap-2">
                  <Shield className="w-4 h-4" />
                  권한관리
                </TabsTrigger>
                <TabsTrigger value="workflow" className="gap-2">
                  <Settings className="w-4 h-4" />
                  프로세스관리
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-2">
                  <PackagePlus className="w-4 h-4" />
                  제품관리
                </TabsTrigger>
                <TabsTrigger value="departments" className="gap-2">
                  <Building className="w-4 h-4" />
                  부서관리
                </TabsTrigger>
              </TabsList>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="검색..." className="w-64 pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <TabsContent value="users">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">사용자 목록</CardTitle>
                    <Button asChild>
                      <Link href="/admin/users/new">
                        <UserPlus className="mr-2 w-4 h-4" />
                        계정 등록
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 사용자가 없습니다.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>사번</TableHead>
                          <TableHead>이름</TableHead>
                          <TableHead>직급</TableHead>
                          <TableHead>이메일</TableHead>
                          <TableHead>부서</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>등록일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/users/${user.rawId || user.id}`)}>
                            <TableCell>{user.employeeNumber || user.id}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.position}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.department}</TableCell>
                            <TableCell>{user.status}</TableCell>
                            <TableCell>{user.lastLogin}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">권한 그룹</CardTitle>
                    <Button asChild>
                      <Link href="/admin/permissions/new">
                        <Plus className="mr-2 w-4 h-4" />
                        권한 등록
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredRoles.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 권한 그룹이 없습니다.</div>
                  ) : (
                    filteredRoles.map((group) => (
                      <div key={group.id} className="cursor-pointer rounded-lg border p-4 hover:bg-muted/50" onClick={() => router.push(`/admin/permissions/${group.id}`)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{group.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xl">{group.description}</p>
                          </div>
                          <p className="text-sm">{group.userCount !== "-" ? `${group.userCount}명` : ""}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflow">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">워크플로우 설정</CardTitle>
                    <Button asChild>
                      <Link href="/admin/workflow/new">
                        <Plus className="mr-2 w-4 h-4" />
                        템플릿 등록
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredWorkflows.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 프로세스 템플릿이 없습니다.</div>
                  ) : (
                    filteredWorkflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                        onClick={() => router.push(`/admin/workflow/${workflow.id}`)}
                      >
                        <div>
                          <p className="font-semibold">{workflow.name}</p>
                          <p className="text-sm text-muted-foreground">{workflow.steps ? workflow.steps.join(" → ") : ""}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch checked={workflow.active || workflow.status === "활성"} disabled />
                          <p className="text-sm text-muted-foreground">{workflow.lastModified !== "-" ? workflow.lastModified : ""}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">제품목록</CardTitle>
                    <Button asChild>
                      <Link href="/admin/products/new">
                        <Plus className="mr-2 w-4 h-4" />
                        제품등록
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 제품이 없습니다.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>제품분류</TableHead>
                          <TableHead>제품군</TableHead>
                          <TableHead>제품명</TableHead>
                          <TableHead>라이선스 기준</TableHead>
                          <TableHead>라이선스 단위</TableHead>
                          <TableHead className="text-right">단가(천 원)</TableHead>
                          <TableHead className="w-[100px] text-right">수정 / 삭제</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.productClass}</TableCell>
                            <TableCell>{product.productGroup}</TableCell>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell>{product.licenseStandard}</TableCell>
                            <TableCell>{product.licenseUnit}</TableCell>
                            <TableCell className="text-right">{(product.unitPrice || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/products/${product.id}/edit`)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(product.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departments">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">부서목록</CardTitle>
                    <Button asChild>
                      <Link href="/admin/departments/new">
                        <Plus className="mr-2 w-4 h-4" />
                        부서등록
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredDepartments.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 부서가 없습니다.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>순번</TableHead>
                          <TableHead>본부</TableHead>
                          <TableHead>팀</TableHead>
                          <TableHead className="w-[100px] text-right">수정 / 삭제</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDepartments.map((dept) => (
                          <TableRow key={dept.id}>
                            <TableCell>{dept.id}</TableCell>
                            <TableCell>{dept.headquarters}</TableCell>
                            <TableCell>{dept.team}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/departments/${dept.id}/edit`)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDepartment(dept.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  );
}
