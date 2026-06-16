import { Heart, Sparkles, Clock3 } from "lucide-react";

import { SiteHeader } from "@/features/dashboard/components/header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader header={"Избранное"} />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            <Clock3 className="mr-1 h-3.5 w-3.5" />
            Скоро появится
          </Badge>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Раздел «Избранное» находится в разработке
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Здесь будут сохраняться важные элементы, быстрые подборки и
              материалы, к которым вы хотите вернуться позже.
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Что будет доступно</CardTitle>
            <CardDescription>
              Мы готовим удобное пространство для быстрого доступа к нужному
              контенту.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium">Сохранённые элементы</h3>
              <p className="text-sm text-muted-foreground">
                Добавляйте важные позиции в избранное и быстро находите их позже.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium">Быстрый доступ</h3>
              <p className="text-sm text-muted-foreground">
                Отдельный список для приоритетных сущностей и часто используемых
                объектов.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium">Возврат к важному</h3>
              <p className="text-sm text-muted-foreground">
                Всё нужное под рукой, без повторного поиска и лишних действий.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

