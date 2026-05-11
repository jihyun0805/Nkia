"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Header } from "@/components/erp/header"
import { Sidebar } from "@/components/erp/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { deleteProposal, getProposalById, subscribeProposalUpdates, type ProposalAttachment, type ProposalRecord } from "@/lib/bid-data"
import { toast } from "@/hooks/use-toast"

function ProposalDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input readOnly value={value || "-"} />
    </div>
  )
}

function ProposalAttachmentField({ proposal }: { proposal: ProposalRecord }) {
  const attachments: ProposalAttachment[] = proposal.attachments ?? proposal.attachmentNames.map((name) => ({ name }))

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>첨부파일</Label>
      {attachments.length > 0 ? (
        <div className="space-y-2 rounded-md border px-4 py-3">
          {attachments.map((attachment, index) =>
            attachment.url ? (
              <a
                key={`${attachment.name}-${index}`}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {attachment.name}
              </a>
            ) : (
              <p key={`${attachment.name}-${index}`} className="text-sm text-muted-foreground">
                {attachment.name}
              </p>
            ),
          )}
        </div>
      ) : (
        <Input readOnly value="등록된 첨부파일이 없습니다." />
      )}
    </div>
  )
}

export function ProposalDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [proposal, setProposal] = useState<ProposalRecord | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    const sync = () => setProposal(getProposalById(id))
    sync()
    const unsubscribe = subscribeProposalUpdates(sync)
    window.addEventListener("storage", sync)

    return () => {
      unsubscribe()
      window.removeEventListener("storage", sync)
    }
  }, [id])

  const handleDelete = () => {
    const result = deleteProposal(id)
    if (result.status === "not_found") {
      toast({
        title: "제안서 삭제 실패",
        description: "삭제할 제안서를 찾지 못했습니다.",
      })
      setIsDeleteOpen(false)
      return
    }

    toast({
      title: "제안서 삭제 완료",
      description: `${result.proposal.id} 제안서가 삭제되었습니다.`,
    })
    setIsDeleteOpen(false)
    router.push("/bid")
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="제안서 상세" description="제안서 정보를 조회합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  제안서 정보를 찾을 수 없습니다.
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="제안서 상세" description="최종 완료된 제안서 정보를 조회합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/bid">입찰</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{proposal.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="border-b pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold tracking-tight">{proposal.opportunity}</CardTitle>
                  <p className="text-sm text-muted-foreground">{proposal.id}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="grid gap-4 md:grid-cols-2">
                  <ProposalDetailField label="활동 요청 코드" value={proposal.requestId} />
                  <ProposalDetailField label="고객사 코드" value={proposal.customerCode} />
                  <ProposalDetailField label="고객사명" value={proposal.customer} />
                  <ProposalDetailField label="사업기회 코드" value={proposal.opportunityCode} />
                  <ProposalDetailField label="사업명" value={proposal.opportunity} />
                  <ProposalDetailField label="제안형태" value={proposal.proposalType} />
                  <ProposalDetailField label="제품군" value={proposal.productGroup} />
                  <ProposalDetailField label="요청일" value={proposal.requestDate} />
                  <ProposalDetailField label="제안서 마감일" value={proposal.proposalDeadline} />
                  <ProposalDetailField label="영업대표" value={proposal.salesRep} />
                  <ProposalDetailField label="담당자" value={proposal.contactName} />
                  <ProposalAttachmentField proposal={proposal} />
                  <ProposalDetailField label="상태" value="완료" />
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/bid">목록</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/bid/proposal/${proposal.id}/edit`}>수정</Link>
                  </Button>
                  <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제안서를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 제안서 상세 정보를 다시 확인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
