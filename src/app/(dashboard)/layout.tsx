"use client";

import { AuthProvider } from "@/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — will be extracted into <Sidebar /> component */}
        <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-slate-100 md:bg-white">
          <div className="flex h-14 items-center gap-2 px-4">
            <img src="/logo.png" alt="Cattory" className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight">Cattory</span>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-2 text-sm">
            <p className="px-2 py-1 text-xs text-slate-400">
              Sidebar — pendiente de migrar
            </p>
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header — will be extracted into <Header /> component */}
          <header className="flex h-14 items-center border-b border-slate-100 bg-white px-4 md:px-6">
            <p className="text-sm text-slate-400">
              Header — pendiente de migrar
            </p>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
