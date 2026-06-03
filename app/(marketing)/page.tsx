"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  Check,
  Zap,
  Shield,
  Layers,
  Workflow,
  Bot,
  Globe,
  Clock,
  Code2,
  BarChart3,
  Lock,
  ChevronRight,
  Sparkles,
  Plug,
  Server,
  Cpu,
  Network,
  X,
  Menu
} from "lucide-react";
import { motion } from "framer-motion";

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

export default function KnitLandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Продукт", href: "#product" },
    { label: "Решения", href: "#solutions" },
    { label: "Тарифы", href: "#pricing" },
    { label: "Документация", href: "#docs" },
  ];

  const features = [
    {
      icon: <Plug className="h-6 w-6" />,
      title: "Более 200 B2B-коннекторов",
      description:
        "Готовые интеграции с Salesforce, HubSpot, SAP, NetSuite, Workday и всей экосистемой B2B SaaS.",
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "Шлюз ИИ-агентов",
      description:
        "Позвольте ИИ-агентам безопасно читать, записывать и действовать с данными вашей платформы через единый протокол агентов.",
    },
    {
      icon: <Workflow className="h-6 w-6" />,
      title: "Визуальная оркестрация",
      description:
        "Создавайте сложные многошаговые интеграционные сценарии с помощью визуального конструктора. Без участия инженеров.",
    },
    {
      icon: <Code2 className="h-6 w-6" />,
      title: "Единый API",
      description:
        "Единый RESTful API и SDK для подключения к любой интеграции. Забудьте о необходимости создавать пользовательские коннекторы.",
    },
    {
      icon: <Server className="h-6 w-6" />,
      title: "Синхронизация в реальном времени",
      description:
        "Вебхуки, потоковая обработка событий и двусторонняя синхронизация поддерживают актуальность данных на всех подключённых платформах.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Корпоративная безопасность",
      description:
        "Сертификация SOC 2 Type II, соответствие GDPR, сквозное шифрование и детальные области разрешений OAuth 2.0.",
    },
  ];

  const problems = [
    {
      title: "Отставание по интеграциям",
      description:
        "Ваша инженерная команда тратит 40% времени на создание и поддержку единичных интеграций вместо разработки ключевых функций продукта.",
      stat: "4–6 месяцев",
      statLabel: "среднее время создания одной интеграции",
    },
    {
      title: "Блокировка ИИ-агентов",
      description:
        "ИИ-агенты не могут получить доступ к вашей платформе из-за отсутствия структурированных API, разрешений и наблюдаемости для автономных систем.",
      stat: "73%",
      statLabel: "SaaS-платформ блокируют ИИ-агентов",
    },
    {
      title: "Разрастание интеграций",
      description:
        "Каждая интеграция — уникальна. Разная авторизация, разные схемы, разная обработка ошибок. Операционный хаос.",
      stat: "15+",
      statLabel: "среднее число интеграций на одну B2B-SaaS-компанию",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Подключение",
      description:
        "Выбирайте из 200+ готовых коннекторов или используйте конструктор коннекторов на базе ИИ для создания пользовательских интеграций за минуты.",
    },
    {
      number: "02",
      title: "Настройка",
      description:
        "Сопоставляйте поля данных, задавайте правила трансформации и определяйте бизнес-логику в визуальном конструкторе или редакторе кода.",
    },
    {
      number: "03",
      title: "Запуск",
      description:
        "Запускайтесь в один клик. Наша управляемая инфраструктура автоматически масштабируется, повторяет попытки и выполняет мониторинг.",
    },
    {
      number: "04",
      title: "Масштабирование",
      description:
        "Добавляйте новые интеграции, подключайте корпоративных клиентов и активируйте ИИ-агентов без расширения штата инженеров.",
    },
  ];

  const pricingPlans = [
    {
      name: "Стартовый",
      description: "Для стартапов на ранней стадии",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "3 активных интеграции",
        "1 000 API-вызовов/мес",
        "Коннекторы сообщества",
        "Базовая авторизация (API Key)",
        "Поддержка сообщества",
        "1 участник команды",
      ],
      cta: "Начать бесплатно",
      popular: false,
    },
    {
      name: "Рост",
      description: "Для растущих B2B-SaaS-команд",
      monthlyPrice: 299,
      annualPrice: 249,
      features: [
        "20 активных интеграций",
        "100 000 API-вызовов/мес",
        "Доступ к шлюзу ИИ-агентов",
        "OAuth 2.0 + SSO",
        "Визуальный конструктор сценариев",
        "Управление вебхуками",
        "Приоритетная поддержка по электронной почте",
        "5 участников команды",
      ],
      cta: "Начать пробный период",
      popular: true,
    },
    {
      name: "Масштаб",
      description: "Для быстрорастущих компаний",
      monthlyPrice: 999,
      annualPrice: 799,
      features: [
        "Неограниченное число интеграций",
        "1 млн API-вызовов/мес",
        "Конструктор пользовательских коннекторов",
        "Расширенное управление ИИ-агентами",
        "Потоковая передача событий в реальном времени",
        "Аудиторские журналы и аналитика",
        "SLA: доступность 99,9%",
        "Выделенная поддержка",
        "25 участников команды",
      ],
      cta: "Связаться с отделом продаж",
      popular: false,
    },
    {
      name: "Корпоративный",
      description: "Для крупных организаций",
      monthlyPrice: null,
      annualPrice: null,
      features: [
        "Всё из тарифа Масштаб",
        "Индивидуальный SLA и доступность",
        "Выделенная инфраструктура",
        "SSO / SAML / SCIM",
        "Пользовательская локализация данных",
        "Опросники по безопасности",
        "Выделенный менеджер по сопровождению",
        "Неограниченное число участников",
      ],
      cta: "Поговорить с отделом продаж",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "Чем Мост отличается от Zapier или Workato?",
      answer:
        "Мост создан специально для продуктов B2B SaaS и инфраструктуры ИИ-агентов. В отличие от универсальных инструментов автоматизации, мы предоставляем унифицированный API-слой, нативные протоколы ИИ-агентов, глубокую двустороннюю синхронизацию и корпоративную безопасность, рассчитанные на продуктовые интеграции, а не только на сценарии.",
    },
    {
      question: "Могут ли ИИ-агенты действительно взаимодействовать с моей платформой через Мост?",
      answer:
        "Да. Мост реализует протокол Model Context Protocol (MCP) и предоставляет специализированные конечные точки для агентов с детальными областями разрешений, наблюдаемостью и ограничением скорости. ИИ-агенты могут безопасно и прозрачно читать, записывать и выполнять действия на вашей платформе.",
    },
    {
      question: "Сколько времени занимает запуск новой интеграции?",
      answer:
        "С нашими готовыми коннекторами вы можете запуститься менее чем за 30 минут. Для пользовательских интеграций наш конструктор коннекторов на базе ИИ и визуальный конструктор сокращают время разработки с месяцев до дней.",
    },
    {
      question: "Безопасны ли данные моих клиентов?",
      answer:
        "Абсолютно. Мост сертифицирован по SOC 2 Type II, соответствует GDPR и использует сквозное шифрование. Данные ваших клиентов никогда не попадают в наше постоянное хранилище, если вы явно не настроите это. Мы выступаем в роли защищённого посредника и слоя преобразования данных.",
    },
    {
      question: "Поддерживаете ли вы развёртывание на собственных площадках или в частном облаке?",
      answer:
        "Корпоративные клиенты могут развёртывать Мост в собственном виртуальном частном облаке (VPC) или частном облаке (AWS, Azure, GCP) с выделенной инфраструктурой и требованиями к локализации данных.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Network className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Мост</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="lg">
              Вход
            </Button>
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
              Начать бесплатно <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Separator />
            <Button variant="ghost" size="lg" className="w-full justify-start">
              Вход
            </Button>
            <Button size="lg" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600">
              Начать бесплатно
            </Button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-40">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-violet-400 opacity-20 blur-[100px]" />
          <div className="absolute right-0 top-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="flex flex-col items-center text-center max-w-4xl mx-auto"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Badge
                variant="secondary"
                className="mb-6 px-3 py-1 text-sm font-medium bg-violet-100 text-violet-800 hover:bg-violet-100"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Теперь со шлюзом ИИ-агентов
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
            >
              Единый интеграционный слой{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                для B2B SaaS
              </span>{" "}<br />
              и ИИ-агентов
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              Подключите ваш SaaS-продукт ко всей B2B-экосистеме и инфраструктуре ИИ-агентов за дни, а не месяцы. Одна унифицированная платформа для всех интеграционных задач.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8"
              >
                Начать бесплатно
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="px-8">
                <Globe className="mr-2 h-4 w-4" />
                Смотреть демо
              </Button>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-sm text-muted-foreground"
            >
              Без банковской карты · Бесплатно для стартапов навсегда
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Logos / Social Proof */}
      <section className="border-y bg-muted/30 py-12">
      </section>

      {/* Problem Section */}
      <section id="solutions" className="py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">
              Проблема
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Интеграции тормозят вашу разработку
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Каждая B2B-SaaS-компания сталкивается с одним и тем же интеграционным кризисом. Ваша дорожная карта страдает, пока инженеры тонут в поддержке коннекторов.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((problem, index) => (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-3xl font-bold text-red-500/80 mb-2">
                      {problem.stat}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {problem.statLabel}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {problem.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / Features Section */}
      <section id="product" className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-700">
              Платформа
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Одна платформа. Все интеграции. Готовность к ИИ.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Мост заменяет всю вашу интеграционную инфраструктуру единой безопасной масштабируемой платформой, созданной для современного B2B SaaS.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full group hover:shadow-md transition-all duration-300 border-border/50">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <CardTitle className="mt-4 text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">
              Как это работает
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              От нуля до интеграции в четыре шага
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="text-5xl font-bold text-muted-foreground/20 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-violet-950 via-indigo-950 to-background text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-violet-500/20 text-violet-200 border-violet-500/30">
                <Cpu className="mr-1 h-3 w-3" />
                Шлюз ИИ-агентов
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Ваша платформа готова к эре ИИ
              </h2>
              <p className="text-lg text-violet-100/80 mb-8 leading-relaxed">
                ИИ-агенты — это новые пользователи. Мост предоставляет безопасную инфраструктуру для взаимодействия автономных систем с вашей B2B-платформой — с полной наблюдаемостью, управлением правами доступа и аудиторскими журналами.
              </p>
              <ul className="space-y-4">
                {[
                  "Соответствие протоколу Model Context Protocol (MCP)",
                  "Детальное разграничение прав доступа агентов",
                  "Мониторинг активности агентов в реальном времени",
                  "Автоматическое распознавание схем для больших языковых моделей",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-violet-300" />
                    </div>
                    <span className="text-violet-100/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-8 bg-white text-violet-900 hover:bg-violet-50"
              >
                Изучить шлюз ИИ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl opacity-20 blur-2xl" />
              <Card className="relative bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6 font-mono text-sm">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-xs">agent-session.json</span>
                  </div>
                  <pre className="text-violet-300 overflow-x-auto">
{`{
  "agent_id": "agt_2vR9kLmP",
  "platform": "customer-crm",
  "permissions": [
    "contacts:read",
    "deals:write",
    "tasks:execute"
  ],
  "context": {
    "user_id": "usr_8842",
    "tenant": "acme-corp",
    "session_ttl": 3600
  },
  "audit_level": "full",
  "rate_limit": {
    "requests_per_min": 120,
    "burst": 20
  }
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="mb-4">
              Тарифы
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Простая и прозрачная ценовая политика
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Начинайте бесплатно, масштабируйтесь по мере роста. Никаких скрытых платежей и непредвиденных сборов.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Помесячно
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Ежегодно
            </span>
            <Badge variant="secondary" className="ml-2 text-xs">
              Экономия 20%
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col h-full ${
                  plan.popular
                    ? "border-violet-500 shadow-lg shadow-violet-500/10 relative"
                    : "border-border/50"
                }`}
              >
                <CardHeader className="flex-1">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {plan.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                        </span>
                        <span className="text-muted-foreground">/мес</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-bold">По запросу</div>
                    )}
                    {isAnnual && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${plan.annualPrice * 12} при ежегодной оплате
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    size="lg"
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              Вопросы и ответы
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Часто задаваемые вопросы
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Готовы унифицировать свои интеграции?
              </h2>
              <p className="text-lg text-violet-100 mb-8">
                Присоединяйтесь к сотням B2B-SaaS-команд, которые внедряют интеграции быстрее с помощью Моста. Начните бесплатно уже сегодня.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-violet-700 hover:bg-violet-50 px-8"
                >
                  Начать бесплатно
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-violet-300 text-white hover:bg-violet-600/50 px-8"
                >
                  Поговорить с отделом продаж
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                  <Network className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold">Мост</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Унифицированная интеграционная платформа для B2B SaaS и инфраструктуры ИИ-агентов.
              </p>
              <div className="flex gap-4 mt-4">
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Продукт</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Коннекторы</a></li>
                <li><a href="#" className="hover:text-foreground">Шлюз ИИ</a></li>
                <li><a href="#" className="hover:text-foreground">Сценарии</a></li>
                <li><a href="#" className="hover:text-foreground">Безопасность</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Разработчикам</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Документация</a></li>
                <li><a href="#" className="hover:text-foreground">Справочник API</a></li>
                <li><a href="#" className="hover:text-foreground">SDK</a></li>
                <li><a href="#" className="hover:text-foreground">Статус</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Компания</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">О компании</a></li>
                <li><a href="#" className="hover:text-foreground">Блог</a></li>
                <li><a href="#" className="hover:text-foreground">Вакансии</a></li>
                <li><a href="#" className="hover:text-foreground">Контакты</a></li>
              </ul>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-sm text-muted-foreground">
            <p>© 2026 Мост Интеграция. Все права защищены.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground">Конфиденциальность</a>
              <a href="#" className="hover:text-foreground">Условия использования</a>
              <a href="#" className="hover:text-foreground">Файлы cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
