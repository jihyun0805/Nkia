"use client"

import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot,
  Send,
  Sparkles,
  Search,
  FileText,
  HelpCircle,
  Clock,
  ArrowRight,
} from "lucide-react"

// 예시 질문들
const exampleQuestions = [
  "키움증권 실주 이유 알려줘",
  "국민은행 견적서 요약해줘",
  "롯데카드 사업기회 진행 상황 알려줘",
  "올해 계약된 프로젝트와 계약 금액 알려줘",
  "현재 진행 중인 사업기회 목록 알려줘",
]

// 대화 기록 샘플
const initialMessages = [
  {
    id: 1,
    role: "assistant",
    content: "안녕하세요! Nkia 영업관리시스템 AI 어시스턴트입니다. 영업 정보 검색, 데이터 조회, 시스템 사용법 등을 자연어로 질문해 주세요.",
    timestamp: "09:00",
  },
]

export default function LlmPage() {
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage = {
      id: messages.length + 1,
      role: "user" as const,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages([...messages, userMessage])
    setInputValue("")
    setIsLoading(true)

    // 시뮬레이션된 AI 응답
    setTimeout(() => {
      let responseContent = ""
      
      if (inputValue.includes("삼성전자")) {
        responseContent = `삼성전자 관련 사업기회 현황입니다:

**진행 중인 사업기회:** 2건
1. **삼성전자 EMS 구축** (OPP-2026-001)
   - 예상 금액: 5억원
   - 예상 계약 시점: 2026년 2분기
   - 상태: 진행중
   - 담당자: 김영업

2. **삼성전자 NMS 확장** (OPP-2026-008)
   - 예상 금액: 2억원
   - 예상 계약 시점: 2026년 3분기
   - 상태: 발굴
   - 담당자: 박과장

자세한 내용은 [발굴] 메뉴에서 확인하실 수 있습니다.`
      } else if (inputValue.includes("수주") && inputValue.includes("실적")) {
        responseContent = `이번 달(2026년 3월) 수주 실적 현황입니다:

**총 수주액:** 7억 5천만원
**수주 건수:** 3건

| 고객사 | 사업명 | 금액 |
|--------|--------|------|
| 농협은행 | 통합 모니터링 시스템 | 3억원 |
| 현대해상 | ITSM 구축 | 4.5억원 |
| 우리은행 | 자동화 시스템 | - (기승인) |

전월 대비 **+8%** 증가했습니다.`
      } else if (inputValue.includes("유지보수") && inputValue.includes("종료")) {
        responseContent = `유지보수 계약 종료 임박 고객사 목록입니다:

**3개월 이내 종료 예정: 3건**

1. **삼성SDS** - 2026-05-31 종료 (D-75)
   - 제품: EMS Standard
   - 계약금액: 2,500만원
   - 진행상태: 견적서 전달

2. **LG전자** - 2026-08-31 종료 (D-167)
   - 제품: EMS Enterprise  
   - 계약금액: 4,500만원
   - 진행상태: 견적서 전달

⚠️ LG전자는 아직 계약 미체결 상태입니다. 조속한 대응이 필요합니다.`
      } else if (inputValue.includes("PRB")) {
        responseContent = `**PRB(Pre-Review Board)란?**

PRB는 입찰 참여 전 사업 타당성을 검증하는 절차입니다.

**목적:**
- 입찰 참여의 적합성 검토
- 리스크 사전 파악 및 대응 방안 수립
- 자원 배분의 효율성 확보

**PRB 보고서 작성 단계:**
1. 영업대표가 PRB 보고서 작성
2. 영업팀장 검토
3. 본부장 최종 승인

**보고서 포함 내용:**
- 사업 개요 및 예상 규모
- 경쟁 분석
- 리스크 평가
- 예상 수익성

[입찰] > [PRB] 메뉴에서 작성하실 수 있습니다.`
      } else {
        responseContent = `죄송합니다. "${inputValue}"에 대한 정확한 답변을 찾지 못했습니다.

다음과 같이 질문해 보세요:
- "○○고객사 사업기회 현황"
- "이번 달 수주 실적"
- "유지보수 종료 임박 고객사"
- "특정 기능 사용법"

또는 왼쪽 메뉴에서 직접 원하는 정보를 찾아보실 수 있습니다.`
      }

      const assistantMessage = {
        id: messages.length + 2,
        role: "assistant" as const,
        content: responseContent,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleExampleClick = (question: string) => {
    setInputValue(question)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title="LLM" 
          description="자연어로 영업관리시스템을 검색하고 사용법을 안내받으세요"
        />
        
        <main className="flex-1 p-6 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 채팅 영역 */}
            <Card className="lg:col-span-3 flex flex-col h-[calc(100vh-200px)]">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI 어시스턴트</CardTitle>
                    <p className="text-sm text-muted-foreground">영업관리시스템 전문 AI</p>
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Bot className="w-3 h-3 text-primary-foreground" />
                            </div>
                            <span className="text-sm font-medium">AI 어시스턴트</span>
                            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                          </div>
                        )}
                        <div className={`rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <div className="text-xs text-muted-foreground text-right mt-1">
                            {message.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Bot className="w-3 h-3 text-primary-foreground" />
                          </div>
                          <span className="text-sm font-medium">AI 어시스턴트</span>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="질문을 입력하세요..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1"
                  />
                  <Button 
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleSend}
                    disabled={isLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* 사이드바 */}
            <div className="space-y-4">
              {/* 빠른 질문 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    빠른 질문
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {exampleQuestions.map((question, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                      onClick={() => handleExampleClick(question)}
                    >
                      <ArrowRight className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{question}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* 기능 안내 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    이런 것을 물어보세요
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Search className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">정보 검색</p>
                      <p className="text-xs text-muted-foreground">고객사, 사업기회, 계약 정보</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">시스템 가이드</p>
                      <p className="text-xs text-muted-foreground">기능 사용법, 프로세스 안내</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">현황 조회</p>
                      <p className="text-xs text-muted-foreground">실적, 통계, 알림 정보</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI 상태 */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AI 상태</span>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      정상 운영
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    마지막 업데이트: 2026-03-17 15:00
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
