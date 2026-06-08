import { AuthGuard } from "@/features/auth/components/auth-guard";
import GraphPage from "@/features/graph-builder/components/graph-page";

export default function Page() {
    return <div>
        <AuthGuard>
            <GraphPage />
        </AuthGuard>
    </div>
}
