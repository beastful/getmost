import Dashboard from "@/features/dashboard/components/layout";

export default function Layout({ children }: {
    children: React.ReactNode
}) {
    return <>
        <Dashboard>
            {children}
        </Dashboard>
    </>
}
