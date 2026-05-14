"use client";

import { useState, useEffect } from "react";
import { Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadBackendFindingData } from "@/lib/finding-backend";
import { type OpportunityRecord } from "@/lib/finding-data";

interface ProjectOpportunitySelectorProps {
  onSelect: (opportunity: OpportunityRecord) => void;
  selectedId?: number;
}

export function ProjectOpportunitySelector({ onSelect, selectedId }: ProjectOpportunitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const data = await loadBackendFindingData();
          setOpportunities(data.opportunities);
        } catch (error) {
          console.error("Failed to load opportunities:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const filteredOpportunities = opportunities.filter((opp) => opp.name.toLowerCase().includes(searchTerm.toLowerCase()) || opp.customer.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedOpp = opportunities.find((o) => o.backendId === selectedId);

  return (
    <div className="space-y-2 mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-blue-900">사업기회 연결</h3>
          <p className="text-xs text-blue-700">등록된 사업기회를 선택하여 데이터를 자동으로 채울 수 있습니다.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100">
              <Search className="w-4 h-4 mr-2" />
              {selectedOpp ? "사업기회 변경" : "사업기회 찾기"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>사업기회 검색</DialogTitle>
            </DialogHeader>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="사업명 또는 고객사명 검색" className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex-1 overflow-auto mt-4 space-y-2 min-h-[300px]">
              {loading ? (
                <div className="flex justify-center items-center h-40 text-sm text-muted-foreground">로딩 중...</div>
              ) : filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp) => (
                  <button
                    key={opp.id}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-slate-50 flex items-center justify-between ${
                      selectedId === opp.backendId ? "border-blue-500 bg-blue-50" : "border-slate-200"
                    }`}
                    onClick={() => {
                      onSelect(opp);
                      setOpen(false);
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{opp.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {opp.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {opp.customer} | {opp.product} | {opp.expectedAmount}원
                      </div>
                    </div>
                    {selectedId === opp.backendId && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">검색 결과가 없습니다.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedOpp && (
        <div className="mt-3 text-xs bg-white p-2 rounded border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-800">[연결됨]</span>
            <span className="text-slate-600">
              {selectedOpp.name} ({selectedOpp.customer})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              /* 초기화 로직은 부모에서 처리 */
            }}
          >
            연결 해제
          </Button>
        </div>
      )}
    </div>
  );
}
