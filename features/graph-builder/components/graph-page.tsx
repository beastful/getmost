"use client";

import { useEffect, useState } from "react";
import { useGraphStore } from "@/features/graph-builder/store/graph-store";
import { GraphEditor } from "@/features/graph-builder/components/graph-editor";
import { Panel } from "@xyflow/react";
import { NavBar } from "@/features/graph-builder/components/nav-bar";
import { SocialButtons } from "@/features/graph-builder/components/social-buttons";
import { Palette } from "@/features/graph-builder/components/palette";
import { EmptyState } from "./empty-state";
import CollaborationBar, { CursorOverlay } from "./awareness";
import { CollaborationProvider, TeamGuard, VisitorManager } from "@/features/teams/components/team-guard";

export default function ProjectPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Extract workspaceId from URL: ?id=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setWorkspaceId(id);
  }, []);

  // Cleanup store and load new workspace data
  useEffect(() => {
    if (!workspaceId) return;

    const { loadEntities } = useGraphStore.getState();

    loadEntities({ workspaceId, limit: 10, offset: 0 });
  }, [workspaceId]);


  if (!workspaceId) return <div className="p-8">Loading workspace...</div>;

  return (
    <div className="flex h-screen">

      <main className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <CollaborationProvider>
            <TeamGuard>
              <EmptyState workspaceId={workspaceId}>

                <GraphEditor>
                  <CollaborationBar />
                  <Panel position="top-left">
                    <div className="flex gap-1">
                    <NavBar workspaceId={workspaceId} />
                    <VisitorManager />
                    </div>
                  </Panel>
                  <Panel position="top-right">
                    <SocialButtons />
                  </Panel>
                  <Panel position="bottom-center">
                    <Palette />
                  </Panel>
                </GraphEditor>

              </EmptyState>
            </TeamGuard>
          </CollaborationProvider>
        </div>
      </main>
    </div>
  );
}
