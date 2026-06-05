export interface Entity {
  $id: string;
  name: string;
  description: string;
  folders: string[];
  editor: string;
  data: string;
  metadata: string;
  workspaceId: string;
  public: boolean;
  featured: boolean;
  store: boolean;
  price: number;
  $createdAt: string;
  $updatedAt: string;
}

export type CreateEntityData = {
  name: string;
  description?: string;
  folders?: string[];
  editor: string;
  data: string;
  metadata?: string;
  workspaceId: string;
  public?: boolean;
  featured?: boolean;
  store?: boolean;
  price?: number;
};

export type UpdateEntityData = Partial<Omit<CreateEntityData, 'workspaceId'>>;