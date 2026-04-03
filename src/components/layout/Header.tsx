"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/ui/NotificationBell";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

const PAGE_TITLES: Record<string, string> = {
  "/": "Prioridades",
  "/kanban": "Mis Tareas",
  "/calendar": "Calendario",
  "/backlog": "Backlog",
  "/tareas-creadas": "Tareas Creadas",
};

export default function Header({
  pathname,
  onSearch,
}: {
  pathname: string;
  onSearch?: (query: string) => void;
}) {
  const { user, profile, role, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const push = usePushNotifications();
  const menuRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] ?? "Cattory";
  const avatarUrl = profile?.avatar_url || "/logo.png";
  const displayName = profile?.full_name || "Usuario";
  const displayEmail = user?.email || "";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  function handleSearch(value: string) {
    setSearchQuery(value);
    onSearch?.(value);
  }

  return (
    <header className="h-16 border-b border-white/20 dark:border-slate-700/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl px-4 md:px-8 flex items-center justify-between z-30">
      {/* Left side: title + search */}
      <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
        <h2 className="text-lg md:text-xl font-bold whitespace-nowrap">
          {pageTitle}
        </h2>

        {/* Admin: member filter — placeholder for Phase 4 data hooks */}
        {role === "admin" && pathname === "/kanban" && (
          <div className="hidden">
            {/* Will be populated with useTasks hook in Phase 4 */}
          </div>
        )}

        {/* Desktop search */}
        <div className="relative w-full max-w-xs hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            placeholder="Buscar tareas..."
            type="text"
          />
        </div>
      </div>

      {/* Right side: notification bell + user menu */}
      <div className="flex items-center gap-2 md:gap-4">
        <NotificationBell />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-colors"
          >
            <img
              src={avatarUrl}
              className="w-9 h-9 rounded-full object-cover"
              alt="User profile avatar"
            />
            <span className="material-symbols-outlined text-slate-400 text-[16px] hidden md:block">
              expand_more
            </span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    className="w-11 h-11 rounded-full object-cover"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {displayEmail}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-2 space-y-1">
                {/* Push notifications toggle */}
                {push.supported && (
                  <button
                    onClick={async () => {
                      if (push.subscribed) {
                        await push.unsubscribe(user?.id ?? "");
                      } else {
                        await push.subscribe(user?.id ?? "");
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined text-lg"
                      style={push.subscribed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                      {push.subscribed ? "notifications_active" : "notifications_off"}
                    </span>
                    {push.subscribed ? "Notificaciones activadas" : "Activar notificaciones"}
                    {push.subscribed && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                )}
                {push.permission === "denied" && (
                  <p className="px-3 py-1 text-[10px] text-red-400">
                    Notificaciones bloqueadas en el navegador
                  </p>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-lg">
                    logout
                  </span>
                  Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
