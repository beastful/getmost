import { AuthGuard } from "@/features/auth/components/auth-guard";
import Dashboard from "@/features/dashboard/components/layout";

export default function Layout({ children }: {
    children: React.ReactNode
}) {
    return <>
        <AuthGuard>
            <Dashboard>
                {children}
            </Dashboard>
        </AuthGuard>
    </>
}
