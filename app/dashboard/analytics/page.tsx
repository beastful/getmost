import { BarChart3, Clock3, Sparkles } from "lucide-react"

import { SiteHeader } from "@/features/dashboard/components/header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader header="Аналитика" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            <Clock3 className="mr-1 h-3.5 w-3.5" />
            Скоро будет доступно
          </Badge>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Раздел аналитики находится в разработке
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Мы готовим удобную аналитику по ключевым показателям, динамике,
              источникам данных и эффективности процессов. Скоро здесь появятся
              наглядные графики, сводки и инструменты для принятия решений.
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Что появится в этом разделе</CardTitle>
            <CardDescription>
              Мы собираем интерфейс, который поможет быстро понимать состояние
              бизнеса и видеть важные изменения.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium">Наглядные показатели</h3>
              <p className="text-sm text-muted-foreground">
                Основные метрики, динамика, статусы и быстрый обзор по данным.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium">Умные сводки</h3>
              <p className="text-sm text-muted-foreground">
                Краткие выводы, подсказки и выделение важных изменений в данных.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium">История и тренды</h3>
              <p className="text-sm text-muted-foreground">
                Сравнение периодов, отслеживание изменений и анализ тенденций.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
