// features/graph-editor/types/types.ts
import type { Node, Edge, Viewport } from '@xyflow/react';

export interface Entity {
  $id: string;
  name: string;
  description: string;
  folders: string[];
  editor: string;
  data: string;          // JSON string of GraphData
  metadata: string;
  workspaceId: string;
  public: boolean;
  featured: boolean;
  store: boolean;
  price: number;
  $createdAt: string;
  $updatedAt: string;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
}
