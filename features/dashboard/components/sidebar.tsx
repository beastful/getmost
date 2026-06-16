"use client"

import * as React from "react"

import { NavDocuments } from "@/features/dashboard/components/nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/features/auth/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, UsersIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon, Settings, Store, StarIcon, Box, Clapperboard } from "lucide-react"

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Мои проекты",
            url: "/dashboard/projects",
            icon: (
                <ListIcon />
            ),
        },
        {
            title: "Аналитика",
            url: "/dashboard/analytics",
            icon: (
                <ChartBarIcon />
            ),
        },
        {
            title: "Избранное",
            url: "/dashboard/featured",
            icon: (
                <StarIcon />
            ),
        },
    ],
    navClouds: [
        {
            title: "Capture",
            icon: (
                <CameraIcon
                />
            ),
            isActive: true,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Proposal",
            icon: (
                <FileTextIcon
                />
            ),
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Prompts",
            icon: (
                <FileTextIcon
                />
            ),
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Настройки",
            url: "/dashboard/settings",
            icon: (
                <Settings2Icon />
            ),
        },
        {
            title: "Помощь",
            url: "#",
            icon: (
                <CircleHelpIcon
                />
            ),
        }
    ],
    documents: [
        //  {
        //     name: "Магазин",
        //     url: "/dashboard/store",
        //     icon: (
        //         <Store />
        //     ),
        // },
        {
            name: "Хаб",
            url: "/dashboard/hub",
            icon: (
                <Box />
            ),
        },
        // {
        //     name: "Витрина",
        //     url: "/dashboard/featured",
        //     icon: (
        //         <Clapperboard />
        //     ),
        // },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                        >
                            <a href="/dashboard">
                                <svg
                                    style={{
                                        width: 20,
                                        height: 30
                                    }}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 90 70">
                                    <path
                                        d="M5 25 25 5 45 25 65 5 85 25 85 65 65 65 65 45 45 25 25 45 25 65 5 65 5 25 25 5M5 65 25 45M25 5 25 45 5 25M65 45 65 5M85 65 65 45 85 25M25 45"
                                        stroke="#000000"
                                        strokeLinecap="round"
                                        strokeWidth="5"
                                        fill="#00000000" />
                                </svg>
                                <span className="text-base font-semibold">
                                    <span className="text-gray-400">Платформа</span> Мост
                                </span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavDocuments items={data.documents} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}
