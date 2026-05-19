"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { DetailFormCard } from "@/components/erp/detail-form-card";
import { OrderReportDetail } from "@/components/erp/contract/order-report-detail";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { orderReportApi, contractApi, licenseApi, purchaseApi, type OrderReportResponse, type ContractResponse, type LicenseResponse, type PurchaseResponse } from "@/lib/api/contract-api";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Category = "orders" | "order" | "contracts" | "contract" | "purchases" | "purchase" | "licenses" | "license";

export default function ContractDetailPage() {
  const params = useParams();
  const category = params.category as Category;
  const id = params.id as string;
  const numericId = parseInt(id);

  const [data, setData] = useState<OrderReportResponse | ContractResponse | LicenseResponse | PurchaseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isNaN(numericId)) {
      setError("유효하지 않은 ID입니다.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        let res: any;
        console.log(`Fetching ${category} detail with ID: ${numericId}`);

        if (category === "orders" || category === "order") {
          res = await orderReportApi.getOrderReport(numericId);
        } else if (category === "contracts" || category === "contract") {
          res = await contractApi.getContract(numericId);
        } else if (category === "licenses" || category === "license") {
          res = await licenseApi.getLicense(numericId);
        } else if (category === "purchases" || category === "purchase") {
          res = await purchaseApi.getPurchase(numericId);
        } else {
          setError(`알 수 없는 카테고리: ${category}`);
          setLoading(false);
          return;
        }

        console.log("API Response received:", res);

        if (res) {
          // ApiResponse 형태인 경우 (success/result와 data 필드가 있음)
          const isSuccess = res.success === true || res.result === "SUCCESS";
          const hasDataField = res.data !== undefined;

          if ((res.success !== undefined || res.result !== undefined) && hasDataField) {
            if (isSuccess) {
              setData(res.data);
            } else {
              setError(res.message || "데이터를 찾을 수 없습니다.");
            }
          }
          // 응답 자체가 데이터인 경우
          else {
            setData(res);
          }
        } else {
          setError("응답 데이터가 비어있습니다.");
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        const errMsg = err.response?.data?.message || err.message || "정보를 불러오는 데 실패했습니다.";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, numericId, refreshKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="로딩 중..." description="정보를 불러오고 있습니다" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>정보를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="오류" description="정보를 불러오지 못했습니다" />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-destructive">
              <AlertCircle className="w-12 h-12" />
              <p className="text-xl font-bold">{error || "데이터를 찾을 수 없습니다."}</p>
              <Button asChild variant="outline">
                <Link href="/contract">목록으로 돌아가기</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getLabel = () => {
    if (category === "orders" || category === "order") return "수주보고";
    if (category === "contracts" || category === "contract") return "계약";
    if (category === "purchases" || category === "purchase") return "매입계약";
    return "라이선스";
  };

  const label = getLabel();

  // DetailFormCard용 필드 생성
  const getFields = () => {
    if (category === "contracts" || category === "contract") {
      const d = data as ContractResponse;
      return [
        { label: "계약번호", value: d?.id },
        { label: "수주보고번호", value: d?.orderReportId },
        { label: "계약일", value: d?.contractDate },
        { label: "계약금액", value: d?.contractAmount ? `₩${d.contractAmount.toLocaleString()}` : "₩0" },
        { label: "제안유형", value: d?.proposalType === "SELF" ? "직접제안" : "SI제안" },
        { label: "영업대표", value: d?.salesRepresentativeName },
        { label: "유지보수조건", value: d?.maintenanceCondition },
      ];
    }
    if (category === "licenses" || category === "license") {
      const d = data as LicenseResponse;
      return [
        { label: "라이선스번호", value: d?.id },
        { label: "수주보고번호", value: d?.orderReportId },
        { label: "고객사", value: d?.customerCompanyName },
        { label: "제품명", value: d?.productName },
        { label: "수량", value: d?.quantity },
        { label: "유형", value: d?.licenseType },
        { label: "상태", value: d?.licenseStatus },
        { label: "시작일", value: d?.startDate },
        { label: "종료일", value: d?.endDate },
      ];
    }
    if (category === "purchases" || category === "purchase") {
      const d = data as PurchaseResponse;
      return [
        { label: "프로젝트명", value: d?.projectOpportunityName || "-" },
        { label: "매입내용", value: d?.content },
        { label: "수량", value: d?.quantity },
        { label: "단가", value: d?.price ? `₩${d.price.toLocaleString()}` : "₩0" },
        { label: "합계금액", value: d?.totalPrice ? `₩${d.totalPrice.toLocaleString()}` : "₩0" },
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 상세`} description={`${label} 정보를 페이지에서 조회합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className={`space-y-6 ${category === "orders" ? "" : "mx-auto max-w-5xl"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/contract">계약</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {category === "orders" ? (
              <OrderReportDetail report={data as OrderReportResponse} onRefresh={() => setRefreshKey((k) => k + 1)} />
            ) : (
              <DetailFormCard
                title={`${label} 상세`}
                fields={getFields()}
                listHref="/contract"
                editHref={category === "purchases" || category === "purchase" ? undefined : `/contract/${category}/${id}/edit`}
                includeAttachment
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
