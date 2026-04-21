import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  const menus = [
    { name: "대시보드", path: "/" },
    { name: "발굴", path: "/finding" },
    { name: "활동", path: "/activity" },
    { name: "입찰", path: "/bid" },
    { name: "계약", path: "/contract" },
    { name: "사업", path: "/project" },
    { name: "유지보수", path: "/maintenance" },
    { name: "사후영업", path: "/post-sales" },
    { name: "시스템 관리", path: "/admin" },
  ];

  return (
    <div className="flex flex-col w-full h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between px-8 h-16 max-w-[1920px] mx-auto w-full">
          <div className="flex items-center h-full">
            <div className="text-xl font-extrabold text-blue-600 tracking-tight mr-10">Orbis</div>

            <nav className="flex space-x-1 h-full">
              {menus.map((menu) => {
                const isActive = location.pathname === menu.path;
                return (
                  <Link
                    key={menu.path}
                    to={menu.path}
                    className={`relative flex items-center px-4 h-full text-sm font-semibold transition-colors duration-200 ${
                      isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {menu.name}
                    {isActive && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-md" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">A</div>
              <span className="text-sm font-medium text-slate-700">관리자님</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-y-auto p-8">
        <div className="bg-white w-full min-h-full rounded-2xl shadow-sm border border-slate-100 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
