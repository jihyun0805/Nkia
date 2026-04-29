import * as z from "zod";

export const orderReportSchema = z.object({
  // 기본 정보
  projectName: z.string().min(1, "사업명을 입력해주세요."),
  totalAmount: z.string().min(1, "총 계약금액을 입력해주세요."),
  paymentTerms: z.string().optional(),

  // 매출분류
  salesClassification: z.object({
    ems: z.string().default("0"),
    emsMaintenance: z.string().default("0"),
    itg: z.string().default("0"),
    itgMaintenance: z.string().default("0"),
    dashboard: z.string().default("0"),
    ito: z.string().default("0"),
    aiotion: z.string().default("0"),
    others: z.string().default("0"),
    verification: z.string().default("0"),
  }),

  // 담당자 및 일정 정보
  type: z.string().optional(),
  pmName: z.string().optional(),
  contractPartner: z.object({
    name: z.string().optional(),
    manager: z.string().optional(),
    contact: z.string().optional(),
  }),
  maintenanceTarget: z.string().optional(),
  hasChannel: z.string().optional(),
  codeClassification: z.string().optional(),
  finalCustomer: z.object({
    name: z.string().optional(),
    manager: z.string().optional(),
    contact: z.string().optional(),
  }),
  contractDate: z.string().optional(),
  startDate: z.string().optional(),
  contractPeriod: z.string().optional(),
  endDate: z.string().optional(),
  freeMaintenancePeriod: z.string().optional(),

  // 사업 범위 및 첨부 서류
  businessScope: z.string().optional(),
  inspectionCycle: z.string().optional(),
  deliveryModules: z.string().optional(),
  specialNotes: z.string().optional(),
  attachments: z.object({
    quotation: z.string().optional(),
    contract: z.string().optional(),
    purchaseOrder: z.string().optional(),
    prbReport: z.string().optional(),
    others: z.string().optional(),
  }),

  // 유지보수 수주보고 시 작성 테이블
  maintenanceSummary: z
    .array(
      z.object({
        year: z.string(),
        projectAmount: z.string(),
        license: z.string(),
        thirdParty: z.string(),
        service: z.string(),
        maintenance: z.string(),
        rate: z.string(),
      }),
    )
    .default([]),
  maintenanceSummaryTotal: z
    .object({
      projectAmount: z.string(),
      license: z.string(),
      thirdParty: z.string(),
      service: z.string(),
      maintenance: z.string(),
      rate: z.string(),
    })
    .optional(),

  // PAGE 1~3: 세부 내역 테이블
  licenseDetails: z.array(z.object({ category: z.string(), group: z.string(), product: z.string(), quantity: z.string(), unitPrice: z.string(), subtotal: z.string() })).default([]),
  licenseDiscount: z.string().optional(),

  serviceDetails: z.array(z.object({ content: z.string(), mm: z.string(), unitPrice: z.string(), subtotal: z.string() })).default([]),
  serviceDiscount: z.string().optional(),

  maintenanceDetails: z.array(z.object({ content: z.string(), cycle: z.string(), months: z.string(), monthlyAmount: z.string(), subtotal: z.string() })).default([]),
  maintenanceDiscount: z.string().optional(),

  otherSalesDetails: z.array(z.object({ content: z.string(), quantity: z.string(), unitPrice: z.string(), subtotal: z.string() })).default([]),

  purchaseDetails: z.array(z.object({ content: z.string(), quantity: z.string(), unitPrice: z.string(), subtotal: z.string() })).default([]),
});

export type OrderReportValues = z.infer<typeof orderReportSchema>;
