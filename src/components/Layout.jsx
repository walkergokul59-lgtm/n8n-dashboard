import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import LightPillar from "./LightPillar";

export function Layout() {
    const location = useLocation();
    return (
        <div className="relative flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
            <div className="pointer-events-none absolute inset-0 z-0">
                <LightPillar
                    topColor="#9DFFFF"
                    bottomColor="#00D6E6"
                    intensity={1.05}
                    rotationSpeed={0.28}
                    glowAmount={0.0055}
                    pillarWidth={2.9}
                    pillarHeight={0.45}
                    noiseIntensity={0.28}
                    mixBlendMode="screen"
                    pillarRotation={-12}
                    quality="high"
                />
            </div>
            <Sidebar />
            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                <Header />
                <main className="flex-1 overflow-auto p-8">
                    <div key={location.pathname} className="page-transition relative z-10 mx-auto h-full max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
