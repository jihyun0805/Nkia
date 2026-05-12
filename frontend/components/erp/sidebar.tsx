"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Orbit, UserStar, LogOut } from "lucide-react";
import { logout } from "@/lib/api/generated/auth/auth";
import { clearAuthSession, loadAuthSession, subscribeAuthSession, type AuthSession } from "@/lib/auth-session";

const menuItems = [
  {
    id: "dashboard",
    label: "대시보드",
    href: "/",
  },
  {
    id: "finding",
    label: "발굴",
    href: "/finding",
  },
  {
    id: "activity",
    label: "활동",
    href: "/activity",
  },
  {
    id: "bid",
    label: "입찰",
    href: "/bid",
  },
  {
    id: "contract",
    label: "계약",
    href: "/contract",
  },
  {
    id: "project",
    label: "사업",
    href: "/project",
  },
  {
    id: "maintenance",
    label: "유지보수",
    href: "/maintenance",
  },
  {
    id: "admin",
    label: "시스템관리",
    href: "/admin",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  // 세션 상태를 구독하여 로그인/로그아웃 시 실시간 반영
  useEffect(() => {
    setSession(loadAuthSession());
    const unsubscribe = subscribeAuthSession(() => {
      setSession(loadAuthSession());
    });
    return unsubscribe;
  }, []);

  // 이메일에서 이름 부분 추출 (표시용)
  const displayName = session?.name || session?.email?.split("@")[0] || "사용자";
  const displayEmail = session?.email || "";

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      clearAuthSession();
      router.push("/login");
    }
  };

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-sidebar text-sidebar-foreground shadow-sm">
      <div className="grid grid-cols-[220px_1fr_220px] items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
            <Orbit className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Orbis</h1>
            <p className="text-xs text-sidebar-foreground/60">오르비스</p>
          </div>
        </Link>

        <nav className="min-w-0 overflow-hidden">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive && "bg-red-500 text-white hover:bg-red-500 hover:text-white",
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-3 border-l border-sidebar-border pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
            <UserStar className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{displayEmail}</p>
          </div>
          <button onClick={handleLogout} className="ml-2 p-2 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="로그아웃">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
