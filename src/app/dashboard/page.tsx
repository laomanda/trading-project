import { ChartView } from "@/components/ChartView";
import { RightPanel } from "@/components/RightPanel";
import { ControlPanel } from "@/components/ControlPanel";

export default function DashboardPage() {
  return (
    <div className="flex w-full h-full bg-black">
      {/* Left Control Panel */}
      <ControlPanel />

      {/* Main Chart Area */}
      <div className="flex-1 relative border-r border-white/10 min-w-0 overflow-hidden">
        <ChartView />
      </div>

      {/* Right Panel (Logs, etc.) */}
      <div className="w-[320px] shrink-0 h-full">
         <RightPanel />
      </div>
    </div>
  );
}
