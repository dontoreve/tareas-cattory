"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type { Profile, Project } from "@/lib/types";

interface TeamMembersModalProps {
  open: boolean;
  onClose: () => void;
  members: Profile[];
  projects: Project[];
  memberAccess: { member_id: string; project_id: string }[];
  onRefresh: () => void;
}

export default function TeamMembersModal({
  open,
  onClose,
  members,
  projects,
  memberAccess,
  onRefresh,
}: TeamMembersModalProps) {
  const { role, user } = useAuth();
  const { showToast } = useToast();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setConfirmDeleteId(null);
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setExpandedMember(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const getMemberProjects = useCallback(
    (memberId: string) => {
      const accessIds = new Set(
        memberAccess
          .filter((a) => a.member_id === memberId)
          .map((a) => a.project_id)
      );
      return accessIds;
    },
    [memberAccess]
  );

  async function toggleRole(member: Profile) {
    const newRole = member.role === "admin" ? "member" : "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", member.id);

    if (error) {
      showToast("Error al cambiar el rol");
      return;
    }
    showToast(`${member.full_name} ahora es ${newRole}`, "success");
    onRefresh();
  }

  async function toggleProjectAccess(memberId: string, projectId: string) {
    const has = getMemberProjects(memberId).has(projectId);

    if (has) {
      const { error } = await supabase
        .from("member_project_access")
        .delete()
        .eq("member_id", memberId)
        .eq("project_id", projectId);
      if (error) {
        showToast("Error al quitar acceso");
        return;
      }
    } else {
      const { error } = await supabase
        .from("member_project_access")
        .insert({ member_id: memberId, project_id: projectId });
      if (error) {
        showToast("Error al dar acceso");
        return;
      }
    }
    onRefresh();
  }

  async function deleteMember(memberId: string) {
    // Reassign tasks to current admin
    const adminId = user?.id;
    if (!adminId) return;

    const { error: reassignError } = await supabase
      .from("tasks")
      .update({ responsible_id: adminId })
      .eq("responsible_id", memberId);

    if (reassignError) {
      showToast("Error al reasignar tareas");
      return;
    }

    // Clear secondary assignments
    const { error: secondaryError } = await supabase
      .from("tasks")
      .update({ secondary_responsible_id: null })
      .eq("secondary_responsible_id", memberId);
    if (secondaryError) {
      showToast("Error al limpiar asignaciones secundarias");
      return;
    }

    // Remove project access
    const { error: accessError } = await supabase
      .from("member_project_access")
      .delete()
      .eq("member_id", memberId);
    if (accessError) {
      showToast("Error al quitar acceso a proyectos");
      return;
    }

    // Delete profile
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", memberId);

    if (error) {
      showToast("Error al eliminar miembro");
      return;
    }

    showToast("Miembro eliminado", "success");
    setConfirmDeleteId(null);
    onRefresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold">Equipo</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scroll">
          {members.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Cargando equipo...
            </p>
          ) : (
            members.map((member) => {
              const isSelf = member.id === user?.id;
              const memberProjectIds = getMemberProjects(member.id);
              const isExpanded = expandedMember === member.id;
              const isDeleting = confirmDeleteId === member.id;

              return (
                <div
                  key={member.id}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-xl overflow-hidden"
                >
                  {/* Member row */}
                  <div className="flex items-center gap-3 p-3">
                    <img
                      src={member.avatar_url || "/logo.png"}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {member.full_name || "Sin nombre"}
                      </p>
                      {/* Role badge — clickable for admin (including self) */}
                      {isAdmin ? (
                        <button
                          onClick={() => toggleRole(member)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 transition-colors active:scale-95 ${
                            member.role === "admin"
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                          }`}
                        >
                          {member.role}
                          {isSelf ? " (tú)" : ""}
                          <span className="material-symbols-outlined text-[10px] opacity-60">swap_horiz</span>
                        </button>
                      ) : (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                            member.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-emerald-100 text-emerald-600"
                          }`}
                        >
                          {member.role}
                        </span>
                      )}
                    </div>

                    {/* Admin actions */}
                    {isAdmin && !isSelf && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Toggle projects */}
                        {member.role === "member" && (
                          <button
                            onClick={() =>
                              setExpandedMember(isExpanded ? null : member.id)
                            }
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Proyectos asignados"
                          >
                            <span
                              className="material-symbols-outlined text-[18px] transition-transform"
                              style={
                                isExpanded
                                  ? { transform: "rotate(180deg)" }
                                  : undefined
                              }
                            >
                              expand_more
                            </span>
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDeleteId(member.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar miembro"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            close
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Project access panel (expandable) */}
                  {isExpanded && member.role === "member" && (
                    <div className="px-4 pb-3 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Proyectos Asignados
                      </p>
                      <div className="space-y-1">
                        {projects.map((project) => {
                          const hasAccess = memberProjectIds.has(project.id);
                          return (
                            <label
                              key={project.id}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={() =>
                                  toggleProjectAccess(member.id, project.id)
                                }
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                              />
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                {project.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation inline */}
                  {isDeleting && (
                    <div className="px-4 pb-3 pt-2 border-t border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                      <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                        Las tareas de {member.full_name} se reasignarán a ti.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => deleteMember(member.id)}
                          className="flex-1 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
