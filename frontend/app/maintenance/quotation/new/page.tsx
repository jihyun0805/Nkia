"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { useToast } from "@/hooks/use-toast";
import MaintenanceQuotationDocument from "@/components/erp/maintenance/maintenance-quotation-document";
import { createMaintenanceQuotation } from "@/lib/api/maintenance";
import type { MaintenanceQuotationCreateRequest } from "@/lib/api/maintenance";

export default function NewMaintenanceQuotationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: MaintenanceQuotationCreateRequest) => {
    setIsSubmitting(true);
    try {
      const response = await createMaintenanceQuotation(formData);
      const isSuccess = (response as any).result === "SUCCESS" || (response as any).success === true;

      if (isSuccess && response.data) {
        toast({
          title: "견적서 저장 완료",
          description: `유지보수 견적서가 등록되었습니다. (No. ${response.data.refNo})`,
        });
        router.push(`/maintenance/quotation/${response.data.id}`);
      } else {
        throw new Error((response as any).message || "저장에 실패했습니다");
      }
    } catch (error: any) {
      toast({
        title: "저장 실패",
        description: error?.response?.data?.message || error?.message || "견적서 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="유지보수 견적서 등록" description="PDF 서식과 동일한 폼에서 바로 견적서를 작성할 수 있습니다" />
        <main className="flex-1 overflow-auto bg-slate-50">
          <MaintenanceQuotationDocument mode="create" onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </main>
      </div>
    </div>
  );
}
