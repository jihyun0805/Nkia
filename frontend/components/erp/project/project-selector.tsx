"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Loader2 } from "lucide-react";
import { projectApi, type ProjectListResponse } from "@/lib/api/project-api";
import { fuzzyMatch } from "@/lib/fuzzy-match";
import { Badge } from "@/components/ui/badge";

interface ProjectSelectorProps {
  onSelect: (project: ProjectListResponse) => void;
  trigger?: React.ReactNode;
}

export function ProjectSelector({ onSelect, trigger }: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjects();
      setProjects(res.data || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const filteredProjects = (() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return projects;
    const hits = fuzzyMatch(
      trimmed,
      projects,
      (p) => [p.customerName || "", p.projectName || ""],
      projects.length
    );
    return hits.map((h) => h.item);
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="w-4 h-4" />
            사업 선택
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>사업 선택</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="고객사 또는 사업명 검색..."
              className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>고객사</TableHead>
                  <TableHead>사업명</TableHead>
                  <TableHead>PM</TableHead>
                  <TableHead>영업대표</TableHead>
                  <TableHead>사업 기간</TableHead>
                  <TableHead>결과보고</TableHead>
                  <TableHead className="text-right">사업금액</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      불러오는 중...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium text-xs">{project.customerName || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs font-semibold">{project.projectName || "-"}</TableCell>
                      <TableCell className="text-xs">{project.pmName || "-"}</TableCell>
                      <TableCell className="text-xs">{project.salesRepresentativeName || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {project.startDate && project.endDate 
                          ? `${project.startDate} ~ ${project.endDate}` 
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={project.hasResultReport ? "default" : "outline"} 
                          className="text-[10px] px-1.5 h-5"
                        >
                          {project.hasResultReport ? "완료" : "미등록"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {project.totalAmount != null ? `₩${project.totalAmount.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onSelect(project);
                            setOpen(false);
                          }}
                        >
                          선택
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
