import { LeftSidebar } from "@/components/LeftSidebar"
import { Header } from "@/components/Header"

import { TerminalProvider } from "@/core/context";
import { SimulationEngine } from "@/core/simulation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TerminalProvider>
        <SimulationEngine />
        <div className="flex flex-col h-screen overflow-hidden bg-black font-sans text-foreground">
           {/* Header Full Width */}
           <Header />
           
           {/* Main Content Area (Layout handled by page.tsx) */}
           <main className="flex-1 overflow-hidden relative flex">
              {children}
           </main>
        </div>
    </TerminalProvider>
  );
}
