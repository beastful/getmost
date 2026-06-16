"use client";

import React from "react";
import { SiteHeader } from "@/features/dashboard/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Layers, Sparkles, FolderOpen, Zap, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function DashboardHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader header="Панель управления" />

      <main className="container mx-auto px-4 md:px-6 py-12 max-w-5xl">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="space-y-10"
        >
          {/* Greeting */}
          <motion.div variants={fadeInUp} className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Добро пожаловать в <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-600">Мост</span>
            </h1>
            <p className="mt-2 text-md text-gray-600 max-w-2xl">
              Ваша платформа для бесшовных B2B-интеграций и управления ИИ-агентами. Начните создавать свой первый проект уже сейчас.
            </p>
          </motion.div>

          {/* Quick start cards */}
          <motion.div variants={fadeInUp} className="grid md:grid-cols-2 gap-6">
            {/* New project card */}
            <Link href="/dashboard/projects" className="group">
              <Card className="h-full border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-300 bg-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-100 to-transparent rounded-bl-3xl -mr-2 -mt-2" />
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Plus className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Новый проект
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Создайте интеграцию с нуля, используя визуальный конструктор и готовые коннекторы.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-500">
                    {[
                      "Более (чем достаточно) коннекторов",
                      "Визуальное построение сценариев",
                      "Шлюз ИИ-агентов из коробки",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-red-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white group-hover:shadow-md transition-all"
                    size="lg"
                  >
                    Создать проект
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Templates hub card */}
            <Link href="/dashboard/hub" className="group">
              <Card className="h-full border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-300 bg-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-100 to-transparent rounded-bl-3xl -mr-2 -mt-2" />
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Layers className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Хаб шаблонов
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Используйте готовые решения для популярных сценариев: CRM, маркетинг, поддержка и многое другое.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-500">
                    {[
                      "Шаблоны для HubSpot, Salesforce, SAP",
                      "Сценарии синхронизации данных",
                      "Интеграции для ИИ-агентов",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 bg-white border-2 border-purple-500 text-purple-700 hover:bg-purple-50 hover:border-purple-600 group-hover:shadow-md transition-all"
                    size="lg"
                    variant="outline"
                  >
                    Открыть хаб
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Getting started checklist
          <motion.div variants={fadeInUp}>
            <Card className="border-gray-200 bg-gray-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Быстрый старт
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Выполните эти шаги, чтобы получить максимальную отдачу от платформы.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { step: 1, text: "Создайте первый проект и подключите коннектор", done: false },
                    { step: 2, text: "Настройте OAuth и права доступа", done: false },
                    { step: 3, text: "Активируйте шлюз ИИ-агентов", done: false },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 flex-shrink-0 mt-0.5">
                        {item.step}
                      </div>
                      <span className="text-sm text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div> */}

          {/* Recent projects placeholder (empty state)
          <motion.div variants={fadeInUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Последние проекты</h2>
              <Button variant="ghost" className="text-gray-500 hover:text-gray-900" size="sm">
                Все проекты <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30 p-8 text-center">
              <div className="max-w-md mx-auto">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет активных проектов</h3>
                <p className="text-gray-600 mb-6">
                  Ваши интеграции появятся здесь после создания первого проекта.
                </p>
                <Link href="/dashboard/projects">
                  <Button className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Создать первый проект
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div> */}
        </motion.div>
      </main>
    </div>
  );
}
