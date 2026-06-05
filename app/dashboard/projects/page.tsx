// app/(dashboard)/dashboard/workspaces/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/features/dashboard/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  FolderOpen,
  CalendarDays,
  Users,
  X,
  Check,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useWorkspaces } from "@/features/dashboard/hooks/use-workspaces";
import { useCreateWorkspace } from "@/features/dashboard/hooks/use-create-workspace";
import { useDeleteWorkspace } from "@/features/dashboard/hooks/use-delete-workspace";
import { useUpdateWorkspace } from "@/features/dashboard/hooks/use-update-workspace";

type SortField = "name" | "createdAt";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";

export default function WorkspacesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Queries & Mutations
  const { workspaces, pagination, isLoading, error } = useWorkspaces({
    limit: 6,
  });

  const createWorkspace = useCreateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  // Client-side filter & sort
  const processedWorkspaces = useMemo(() => {
    if (!workspaces) return [];

    let result = [...workspaces];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.teamId.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "createdAt") {
        comparison =
          new Date(a.$createdAt).getTime() -
          new Date(b.$createdAt).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [workspaces, searchQuery, sortField, sortOrder]);

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    await createWorkspace.mutateAsync({
      name: newWorkspaceName,
    });
    setNewWorkspaceName("");
    setShowCreateForm(false);
  };

  const handleDelete = (workspaceId: string, teamId: string) => {
    deleteWorkspace.mutate({ workspaceId, deleteTeam: true });
  };

  const startEditing = (workspace: { $id: string; name: string }) => {
    setEditingId(workspace.$id);
    setEditValue(workspace.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (workspaceId: string) => {
    if (!editValue.trim()) return;
    await updateWorkspace.mutateAsync({
      workspaceId,
      data: { name: editValue.trim() },
    });
    setEditingId(null);
    setEditValue("");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortField("createdAt");
    setSortOrder("desc");
  };

  const activeFiltersCount = searchQuery ? 1 : 0;

  const navigateToProject = (workspaceId: string) => {
    router.push(`/project?id=${workspaceId}`);
  };

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader header="Рабочие пространства" />

      <div className="px-4 md:px-8 lg:px-12 py-6 space-y-6">
        {/* ═══════════════════════════════════════════
            COMPACT COMMAND BAR
           ═══════════════════════════════════════════ */}
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1.5 shadow-sm">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              className="h-8 pl-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Separator orientation="vertical" className="h-5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-normal text-muted-foreground"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {sortField === "name" ? "Название" : "Дата"}
                </span>
                {sortField === "name" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : null}
                <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                className="text-xs"
                onClick={() => toggleSort("name")}
              >
                <span className="flex-1">Названию</span>
                {sortField === "name" &&
                  (sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 ml-2" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 ml-2" />
                  ))}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => toggleSort("createdAt")}
              >
                <span className="flex-1">Дате создания</span>
                {sortField === "createdAt" &&
                  (sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 ml-2" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 ml-2" />
                  ))}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <span className="hidden md:inline text-xs text-muted-foreground">
            <strong className="text-foreground">{processedWorkspaces.length}</strong> из{" "}
            <strong className="text-foreground">{workspaces?.length || 0}</strong>
          </span>

          <Separator orientation="vertical" className="hidden md:block h-5" />

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border rounded-md bg-muted p-0.5"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Сетка"
              className="h-7 px-2 data-[state=on]:bg-background"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="Список"
              className="h-7 px-2 data-[state=on]:bg-background"
            >
              <List className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Создать</span>
          </Button>
        </div>

        {/* Active filters */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Фильтры:</span>
            <Badge
              variant="secondary"
              className="gap-1 pr-1.5 h-6 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => setSearchQuery("")}
            >
              Поиск: {searchQuery}
              <X className="h-3 w-3" />
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={clearFilters}
            >
              Сбросить
            </Button>
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <Card className="border-dashed border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Новое рабочее пространство
              </CardTitle>
              <CardDescription className="text-xs">
                Введите название и нажмите «Создать»
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Название"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="max-w-xs h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={
                    createWorkspace.isPending || !newWorkspaceName.trim()
                  }
                >
                  {createWorkspace.isPending ? "Создание..." : "Создать"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWorkspaceName("");
                  }}
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-36">
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )
        ) : processedWorkspaces.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold">Пространства не найдены</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? "Измените параметры поиска или сбросьте фильтры."
                  : "Создайте первое пространство, чтобы начать работу."}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={clearFilters}
                >
                  Сбросить фильтры
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* ═══════════════════════════════════════════
              GRID VIEW — clickable cards
             ═══════════════════════════════════════════ */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processedWorkspaces.map((workspace) => (
              <Card
                key={workspace.$id}
                className="group relative transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                onClick={() => navigateToProject(workspace.$id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === workspace.$id ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                saveEdit(workspace.$id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                          />
                          <Button
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit(workspace.$id);
                            }}
                            disabled={updateWorkspace.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base leading-tight truncate">
                            {workspace.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(workspace);
                            }}
                          >
                            <PencilIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                      <CardDescription className="text-[11px] font-mono mt-0.5">
                        {workspace.teamId}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToProject(workspace.$id);
                        }}
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(workspace);
                            }}
                          >
                            <PencilIcon className="mr-2 h-3.5 w-3.5" />
                            Переименовать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(workspace.$id, workspace.teamId);
                            }}
                            disabled={deleteWorkspace.isPending}
                          >
                            <TrashIcon className="mr-2 h-3.5 w-3.5" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      {new Date(workspace.$createdAt).toLocaleDateString(
                        "ru-RU"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-mono">
                      {workspace.teamId.slice(0, 12)}...
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* ═══════════════════════════════════════════
              LIST VIEW — clickable rows
             ═══════════════════════════════════════════ */
          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-3 p-3 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
              <div className="col-span-5 sm:col-span-4">Название</div>
              <div className="col-span-3 sm:col-span-3 hidden sm:block">Идентификатор</div>
              <div className="col-span-4 sm:col-span-3">Дата создания</div>
              <div className="col-span-3 sm:col-span-2 text-right">Действия</div>
            </div>
            <div className="divide-y">
              {processedWorkspaces.map((workspace) => (
                <div
                  key={workspace.$id}
                  className="grid grid-cols-12 gap-3 p-3 items-center text-sm hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => navigateToProject(workspace.$id)}
                >
                  <div className="col-span-5 sm:col-span-4 font-medium min-w-0">
                    {editingId === workspace.$id ? (
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(workspace.$id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                        <Button
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEdit(workspace.$id);
                          }}
                          disabled={updateWorkspace.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="truncate block">{workspace.name}</span>
                    )}
                  </div>
                  <div className="col-span-3 sm:col-span-3 hidden sm:block text-xs text-muted-foreground font-mono truncate">
                    {workspace.teamId}
                  </div>
                  <div className="col-span-4 sm:col-span-3 text-xs text-muted-foreground">
                    {new Date(workspace.$createdAt).toLocaleDateString("ru-RU")}
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(workspace);
                          }}
                        >
                          <PencilIcon className="mr-2 h-3.5 w-3.5" />
                          Переименовать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(workspace.$id, workspace.teamId);
                          }}
                          disabled={deleteWorkspace.isPending}
                        >
                          <TrashIcon className="mr-2 h-3.5 w-3.5" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.goToPrevPage}
              disabled={!pagination.hasPrevPage}
            >
              Назад
            </Button>
            <span className="text-xs text-muted-foreground">
              Страница {pagination.page} из {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.goToNextPage}
              disabled={!pagination.hasNextPage}
            >
              Вперёд
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
