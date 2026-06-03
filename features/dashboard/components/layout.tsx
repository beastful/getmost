"use client"

import { AppSidebar } from "./sidebar"
import { SiteHeader } from "./header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Dashboard({ children }: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <div>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
