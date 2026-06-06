'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
    Menubar,
    MenubarContent,
    MenubarGroup,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from '@/components/ui/menubar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ChevronDown,
    PlusCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    FileEdit,
} from 'lucide-react';
import { useGraphStore } from '@/features/graph-builder/store/graph-store';
import { toast } from 'sonner';
import type { Entity } from '@/features/graph-builder/types/types';
import Link from 'next/link';

interface NavBarProps {
    workspaceId: string;
}

export function NavBar({ workspaceId }: NavBarProps) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');
    const limit = 10;

    const renameInputRef = useRef<HTMLInputElement>(null);

    const entities = useGraphStore((s) => s.entities);
    const total = useGraphStore((s) => s.total);
    const isLoading = useGraphStore((s) => s.isLoading);
    const loadEntities = useGraphStore((s) => s.loadEntities);
    const openEntity = useGraphStore((s) => s.openEntity);
    const switchEntity = useGraphStore((s) => s.switchEntity);
    const activeEntityId = useGraphStore((s) => s.activeEntityId);
    const currentEntity = useGraphStore((s) => s.currentEntity());
    const drafts = useGraphStore((s) => s.drafts);
    const createNewEntity = useGraphStore((s) => s.createNewEntity);
    const renameEntity = useGraphStore((s) => s.renameEntity);

    useEffect(() => {
        loadEntities({
            workspaceId,
            search: search || undefined,
            limit,
            offset: (page - 1) * limit,
        });
    }, [workspaceId, search, page, loadEntities]);

    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenaming]);

    const totalPages = Math.ceil(total / limit) || 1;

    const handleSelect = (entity: Entity) => {
        if (activeEntityId === entity.$id) return;
        switchEntity(entity.$id);
    };

    const handleRename = async () => {
        if (!currentEntity) return;
        if (!newName.trim()) {
            cancelRename();
            return;
        }
        try {
            await renameEntity(currentEntity.$id, newName);
            toast.success('Переименовано');
        } catch {
            toast.error('Ошибка переименования');
        } finally {
            setIsRenaming(false);
            setNewName('');
        }
    };

    const cancelRename = () => {
        setIsRenaming(false);
        setNewName('');
    };

    const handleCreateNew = async () => {
        try {
            const newEntity = await createNewEntity({
                name: 'Безымянный граф',
                editor: 'graph-editor',
                data: JSON.stringify({ nodes: [], edges: [] }),
                workspaceId,
                public: false,
                featured: false,
                store: false,
                price: 0,
            });
            openEntity(newEntity);
            toast.success('Граф создан');
        } catch {
            toast.error('Ошибка создания');
        }
    };

    const startRename = () => {
        if (!currentEntity) return;
        setIsRenaming(true);
        setNewName(currentEntity.name);
    };

    return (
        <div className="flex items-center gap-1">
            <Menubar className="bg-background">
                <div className="w-8 flex justify-center">
                    <Link href={"/dashboard"}>
                        <Image alt="Most" width={20} height={20} src="/logo.svg" />
                    </Link>
                </div>

                <MenubarMenu>
                    <MenubarTrigger className="flex gap-2">
                        <span>Файлы</span>
                        <ChevronDown size={15} />
                    </MenubarTrigger>

                    <MenubarContent className="w-80" align="start">
                        <div className="flex gap-2 p-2">
                            <Input
                                placeholder="Поиск..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="h-8 text-sm"
                            />
                            <Button size="sm" variant="ghost" onClick={handleCreateNew}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>

                        <MenubarGroup className="max-h-64 overflow-y-auto">
                            {isLoading && (
                                <div className="px-2 py-4 text-center text-sm text-gray-500">
                                    Загрузка...
                                </div>
                            )}

                            {!isLoading && entities.length === 0 && (
                                <div className="px-2 py-4 text-center text-sm text-gray-500">
                                    Нет файлов
                                </div>
                            )}

                            {entities.map((entity) => {
                                const draft = drafts[entity.$id];
                                const hasUnsaved = draft?.isDirty ?? false;
                                const isActive = activeEntityId === entity.$id;

                                return (
                                    <MenubarItem
                                        key={entity.$id}
                                        onClick={() => handleSelect(entity)}
                                        className={`flex items-center justify-between cursor-pointer ${isActive ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex flex-1 items-center gap-2 min-w-0">
                                            <span className="truncate text-sm font-medium">
                                                {entity.name}
                                            </span>
                                            {hasUnsaved && (
                                                <AlertCircle className="h-3 w-3 flex-shrink-0 text-amber-500" />
                                            )}
                                        </div>
                                    </MenubarItem>
                                );
                            })}
                        </MenubarGroup>

                        {entities.length > 0 && (
                            <div className="flex items-center justify-between border-t p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    disabled={page <= 1}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPage((p) => Math.max(1, p - 1));
                                    }}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <span className="text-xs text-gray-500">
                                    {page} / {totalPages}
                                </span>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    disabled={page >= totalPages}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPage((p) => Math.min(totalPages, p + 1));
                                    }}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </MenubarContent>
                </MenubarMenu>

                <div className="flex items-center min-w-[120px] max-w-[200px] px-2">
                    {isRenaming && currentEntity ? (
                        <Input
                            ref={renameInputRef}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename();
                                if (e.key === 'Escape') cancelRename();
                            }}
                            className="h-6 text-sm w-full"
                        />
                    ) : (
                        <MenubarMenu>
                            <MenubarTrigger className="flex gap-2 w-full justify-center cursor-default">
                                <span className="truncate text-sm">
                                    {currentEntity?.name || 'Нет файла'}
                                </span>
                            </MenubarTrigger>
                        </MenubarMenu>
                    )}
                </div>
            </Menubar>

            <Button
                variant="outline"
                size="icon"
                onClick={startRename}
                disabled={!currentEntity || isRenaming}
                title="Переименовать файл"
            >
                <FileEdit className="h-4 w-4" />
            </Button>
        </div>
    );
}
