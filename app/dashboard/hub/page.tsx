// app/store/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCreateWorkspace } from '@/features/dashboard/hooks/use-create-workspace';
import { listEntities } from '@/features/project/api/list-entities';
import { SiteHeader } from '@/features/dashboard/components/header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, LayoutTemplate, ArrowRight, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Entity } from '@/features/project/types/types';

const ITEMS_PER_PAGE = 10;

/* ─── Debounce ─── */
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/* ─── Card ─── */
function TemplateCard({
  entity,
  onStart,
  isStarting,
}: {
  entity: Entity;
  onStart: (entity: Entity) => void;
  isStarting: boolean;
}) {
  const preview = (() => {
    try {
      const meta = JSON.parse(entity.metadata);
      if (meta?.preview && typeof meta.preview === 'string') return meta.preview;
    } catch {
      /* metadata may be empty or invalid */
    }
    return null;
  })();

  return (
    <Card className="group flex flex-col overflow-hidden border-border/60 transition-all hover:shadow-md hover:border-border">
      {/* Image */}
      <div className="aspect-[4/3] relative bg-muted overflow-hidden">
        {preview ? (
          <img
            src={preview}
            alt={entity.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <LayoutTemplate className="h-10 w-10 opacity-40" />
          </div>
        )}

        {entity.featured && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground shadow-sm">
            Рекомендуемое
          </Badge>
        )}

        <Badge variant="secondary" className="absolute top-3 right-3 font-semibold shadow-sm">
          {entity.price > 0 ? `${entity.price.toLocaleString('ru-RU')} ₽` : 'Бесплатно'}
        </Badge>
      </div>

      <CardHeader className="pb-0">
        <CardTitle className="text-base line-clamp-2" title={entity.name}>
          {entity.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm mt-1.5 min-h-[2.5rem]">
          {entity.description || 'Описание отсутствует'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {entity.folders?.length ?? 0} папок
          </span>
          {entity.editor && (
            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {entity.editor}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          className="w-full gap-2 transition-all"
          onClick={() => onStart(entity)}
          disabled={isStarting}
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Начать с шаблона
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ─── Page ─── */
export default function StorePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  /* Reset to first page when search changes */
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  /* Public store query */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['store-entities', { search: debouncedSearch, page }],
    queryFn: () =>
      listEntities({
        public: true,
        store: true,
        search: debouncedSearch,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
  });

  const entities = (data?.entities as Entity[]) ?? [];
  const total = (data?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const createWorkspace = useCreateWorkspace();

  const handleStart = (template: Entity) => {
    createWorkspace.mutate(
      {
        name: template.name,
        entities: [template.$id],
      },
      {
        onSuccess: (workspace) => {
          toast.success(`Рабочая область «${template.name}» создана`);
          if (workspace?.$id) {
            router.push(`/project?id=${workspace.$id}`);
          }
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : 'Не удалось создать рабочую область'
          );
        },
      }
    );
  };

  const goToNextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setPage((p) => Math.max(p - 1, 1));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader header="Публичное пространство" />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Магазин шаблонов</h1>
          <p className="text-muted-foreground text-lg">
            Выберите готовый шаблон и начните работу за считанные секунды
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* States */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Skeleton key={i} className="h-[340px] rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Ошибка загрузки</p>
            <p>Не удалось загрузить шаблоны. Попробуйте обновить страницу.</p>
          </div>
        ) : entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Шаблоны не найдены</p>
            <p>Попробуйте изменить запрос поиска</p>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {entities.map((entity) => (
                <TemplateCard
                  key={entity.$id}
                  entity={entity}
                  onStart={handleStart}
                  isStarting={createWorkspace.isPending}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Назад
                </Button>

                <span className="text-sm text-muted-foreground tabular-nums">
                  Страница {page} из {totalPages} ({total} всего)
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={page >= totalPages}
                >
                  Вперёд
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
