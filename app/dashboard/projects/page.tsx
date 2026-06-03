// app/(dashboard)/dashboard/workspaces/page.tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/features/dashboard/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useWorkspaces } from "@/features/dashboard/hooks/use-workspaces";
import { useCreateWorkspace } from "@/features/dashboard/hooks/use-create-workspace";
import { useDeleteWorkspace } from "@/features/dashboard/hooks/use-delete-workspace";

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [ownerId] = useState("user_123"); // In real app, get from auth

  // Queries & Mutations
  const { workspaces, pagination, isLoading, error } = useWorkspaces({
    ownerId,
    limit: 5,
  });

  const createWorkspace = useCreateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    await createWorkspace.mutateAsync({
      name: newWorkspaceName,
      ownerId,
    });
    setNewWorkspaceName("");
  };

  const handleDelete = (workspaceId: string, teamId: string) => {
    deleteWorkspace.mutate({ workspaceId, deleteTeam: true });
  };

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <SiteHeader header="Рабочие пространства (Workspaces)" />

      <div className="px-4 md:px-8 lg:px-12 py-6 space-y-8">
        {/* Create form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Создать новое рабочее пространство</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Название пространства"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="max-w-sm"
              />
              <Button
                onClick={handleCreate}
                disabled={createWorkspace.isPending || !newWorkspaceName.trim()}
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                {createWorkspace.isPending ? "Создание..." : "Создать"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workspaces grid (cards) */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <Card key={workspace.$id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <div>Team ID: {workspace.teamId}</div>
                    <div>Создано: {new Date(workspace.$createdAt).toLocaleDateString()}</div>
                  </CardContent>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(workspace.$id, workspace.teamId)}
                    disabled={deleteWorkspace.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>

            {/* Pagination controls */}
            {pagination.totalPages > 0 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={pagination.goToPrevPage}
                  disabled={!pagination.hasPrevPage}
                >
                  Назад
                </Button>
                <span className="text-sm">
                  Страница {pagination.page} из {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={pagination.goToNextPage}
                  disabled={!pagination.hasNextPage}
                >
                  Вперёд
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
