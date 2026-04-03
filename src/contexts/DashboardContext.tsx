"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/lib/hooks/useTasks";
import { useProjects } from "@/lib/hooks/useProjects";
import { useTeamMembers } from "@/lib/hooks/useTeamMembers";
import type { Task, Profile, Project, TaskLink } from "@/lib/types";

interface DashboardState {
  // Data
  tasks: Task[];
  tasksLoading: boolean;
  projects: Project[];
  projectsLoading: boolean;
  teamMembers: Profile[];
  membersLoading: boolean;

  // Task mutations
  createTask: (data: {
    title: string;
    description: string;
    responsible_id: string;
    secondary_responsible_id: string | null;
    project_id: string | null;
    status: string;
    priority: number;
    deadline: string | null;
    links: TaskLink[];
  }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  completeTask: (taskId: string) => Promise<void>;
  reopenTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refetchTasks: () => Promise<void>;

  // Projects
  memberAccess: { member_id: string; project_id: string }[];
  getProjectsForMember: (memberId: string) => Project[];
  hasMemberAccess: (memberId: string, projectId: string) => boolean;
  refetchProjects: () => Promise<void>;
  refetchMembers: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Task modal state
  taskModalOpen: boolean;
  editingTask: Task | null;
  openTaskModal: (task?: Task | null) => void;
  closeTaskModal: () => void;

  // Preview modal state
  previewTask: Task | null;
  openPreview: (task: Task) => void;
  closePreview: () => void;

  // Global search
  globalSearch: string;
  setGlobalSearch: (query: string) => void;
}

const DashboardContext = createContext<DashboardState>(null!);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const userId = user?.id ?? null;

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
    refetch: refetchTasks,
  } = useTasks({ userId, role });

  const {
    projects,
    memberAccess,
    loading: projectsLoading,
    getProjectsForMember,
    hasMemberAccess,
    refetch: refetchProjects,
    createProject,
    renameProject,
    deleteProject,
  } = useProjects({ userId, role });

  const { members: teamMembers, loading: membersLoading, refetch: refetchMembers } =
    useTeamMembers(userId);

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openTaskModal = useCallback((task?: Task | null) => {
    setEditingTask(task ?? null);
    setTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false);
    setEditingTask(null);
  }, []);

  // Global search
  const [globalSearch, setGlobalSearch] = useState("");

  // Preview modal state
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  const openPreview = useCallback((task: Task) => {
    setPreviewTask(task);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTask(null);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        tasks,
        tasksLoading,
        projects,
        projectsLoading,
        teamMembers,
        membersLoading,
        createTask,
        updateTask: updateTask as DashboardState["updateTask"],
        completeTask,
        reopenTask,
        deleteTask,
        refetchTasks,
        memberAccess,
        getProjectsForMember,
        hasMemberAccess,
        refetchProjects,
        refetchMembers,
        createProject,
        renameProject,
        deleteProject,
        taskModalOpen,
        editingTask,
        openTaskModal,
        closeTaskModal,
        previewTask,
        openPreview,
        closePreview,
        globalSearch,
        setGlobalSearch,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
