"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import MobileMoreSheet from "@/components/layout/MobileMoreSheet";
import FloatingNewTaskButton from "@/components/layout/FloatingNewTaskButton";
import TeamMembersModal from "@/components/modals/TeamMembersModal";
import ProjectsModal from "@/components/modals/ProjectsModal";
import TaskModal, { type TaskFormData } from "@/components/modals/TaskModal";
import TaskPreviewModal from "@/components/modals/TaskPreviewModal";
import RecurringModal from "@/components/modals/RecurringModal";
import { useRecurringTasks, type RecurringTemplate } from "@/lib/hooks/useRecurringTasks";
import { useCelebration } from "@/components/ui/CelebrationAnimation";
import { getPriorityConfig } from "@/lib/utils/priority";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, role } = useAuth();
  const {
    teamMembers,
    projects,
    taskModalOpen,
    editingTask,
    openTaskModal,
    closeTaskModal,
    createTask,
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
    memberAccess,
    visibleProjects,
    getProjectsForMember,
    refetchProjects,
    refetchMembers,
    createProject,
    renameProject,
    archiveProject,
    restoreProject,
    deleteProject: deleteProjectFn,
    setGlobalSearch,
    previewTask,
    openPreview,
    closePreview,
  } = useDashboard();

  // Members only see their accessible projects in the task modal
  const modalProjects = visibleProjects;
  const { showToast } = useToast();
  const celebrate = useCelebration();

  // Recurring tasks (admin only)
  const { templates: recurringTemplates, createTemplate, updateTemplate, deleteTemplate: deleteRecurringTemplate } =
    useRecurringTasks(user?.id ?? null, role);

  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTemplate | null>(null);

  // Keyboard shortcut: C → open new task, Escape → close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && taskModalOpen) {
        closeTaskModal();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (taskModalOpen) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        openTaskModal();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [taskModalOpen, openTaskModal, closeTaskModal]);

  // Redirect to login if not authenticated
  if (!loading && !user) {
    router.replace("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  async function handleSaveTask(data: TaskFormData) {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data);
        showToast("Tarea actualizada", "success");
      } else {
        await createTask(data);
        showToast("Tarea creada", "success");
      }
    } catch {
      showToast("Error al guardar la tarea");
    }
  }

  async function handleCompleteFromPreview(task: { id: string; status: string }) {
    try {
      if (task.status === "done") {
        await reopenTask(task.id);
        showToast("Tarea reabierta", "success");
      } else {
        await completeTask(task.id);
        const firstName = profile?.full_name?.split(" ")[0];
        celebrate(null, firstName);
      }
    } catch {
      showToast("Error al actualizar la tarea");
    }
  }

  async function handleDeleteFromPreview(task: { id: string }) {
    try {
      await deleteTask(task.id);
      closePreview();
      showToast("Tarea eliminada", "success");
    } catch {
      showToast("Error al eliminar la tarea");
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar
        onTeamClick={() => setTeamModalOpen(true)}
        onNewProjectClick={() => setProjectsModalOpen(true)}
        onManageProjectsClick={() => setProjectsModalOpen(true)}
        recurringTemplates={recurringTemplates}
        onNewRecurring={() => { setEditingRecurring(null); setRecurringModalOpen(true); }}
        onEditRecurring={(t) => { setEditingRecurring(t); setRecurringModalOpen(true); }}
      />

      <main className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[280px]">
        <Header pathname={pathname} onSearch={setGlobalSearch} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
          {children}
        </div>
      </main>

      <FloatingNewTaskButton onClick={() => openTaskModal()} />

      <MobileNav
        onNewTask={() => openTaskModal()}
        onMoreClick={() => setMoreSheetOpen(true)}
      />

      <MobileMoreSheet
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        onTeamClick={() => setTeamModalOpen(true)}
        onNewProjectClick={() => setProjectsModalOpen(true)}
        onManageProjectsClick={() => setProjectsModalOpen(true)}
      />

      <ProjectsModal
        open={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        projects={projects}
        onCreate={createProject}
        onRename={renameProject}
        onArchive={archiveProject}
        onRestore={restoreProject}
        onDelete={deleteProjectFn}
      />

      <TeamMembersModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        members={teamMembers}
        projects={projects}
        memberAccess={memberAccess}
        onRefresh={() => {
          refetchProjects();
          refetchMembers();
        }}
      />

      <TaskModal
        open={taskModalOpen}
        onClose={closeTaskModal}
        onSave={handleSaveTask}
        onDelete={
          editingTask
            ? async () => {
                await deleteTask(editingTask.id);
                closeTaskModal();
              }
            : undefined
        }
        task={editingTask}
        teamMembers={teamMembers}
        projects={modalProjects}
        currentUserId={user?.id ?? ""}
      />

      <RecurringModal
        open={recurringModalOpen}
        onClose={() => { setRecurringModalOpen(false); setEditingRecurring(null); }}
        onSave={async (data) => {
          if (editingRecurring) {
            await updateTemplate(editingRecurring.id, data);
            showToast("Recurrente actualizada", "success");
          } else {
            await createTemplate(data as Parameters<typeof createTemplate>[0]);
            showToast("Recurrente creada", "success");
          }
        }}
        onDelete={editingRecurring ? async () => {
          await deleteRecurringTemplate(editingRecurring.id);
          setRecurringModalOpen(false);
          setEditingRecurring(null);
          showToast("Recurrente eliminada", "success");
        } : undefined}
        template={editingRecurring}
        teamMembers={teamMembers}
        projects={projects}
        currentUserId={user?.id ?? ""}
      />

      <TaskPreviewModal
        open={!!previewTask}
        task={previewTask}
        onClose={closePreview}
        onEdit={(task) => openTaskModal(task)}
        onComplete={handleCompleteFromPreview}
        onDelete={handleDeleteFromPreview}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardProvider>
          <DashboardShell>{children}</DashboardShell>
        </DashboardProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
