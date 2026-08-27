import { useState } from "react";
import { Link } from "react-router-dom";
import { SidebarDemo } from "@/components/ui/demo";
import { SchedulingSidebarDemo } from "@/components/ui/sidebar-scheduling-demo";
import { ArrowLeft, Sparkles, Layout } from "lucide-react";

export function SidebarDemoPage() {
  const [activeTab, setActiveTab] = useState<"aceternity" | "scheduling">("scheduling");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", padding: "24px" }}>
      {/* Top Header */}
      <header style={{ maxWidth: "1280px", margin: "0 auto 24px auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            <ArrowLeft size={16} /> Back to Scheduling System
          </Link>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#ffffff" }}>
            Aceternity Motion Sidebar Integration
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: "4px 0 0 0" }}>
            Integrated cleanly into <code>src/components/ui/sidebar.tsx</code> without modifying the rest of your system.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: "flex", gap: "8px", backgroundColor: "#1e293b", padding: "4px", borderRadius: "8px", border: "1px solid #334155" }}>
          <button
            type="button"
            onClick={() => setActiveTab("scheduling")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: activeTab === "scheduling" ? "#3b82f6" : "transparent",
              color: activeTab === "scheduling" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            <Layout size={15} /> Scheduling System Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("aceternity")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: activeTab === "aceternity" ? "#3b82f6" : "transparent",
              color: activeTab === "aceternity" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            <Sparkles size={15} /> Original Aceternity Demo
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {activeTab === "scheduling" ? (
          <SchedulingSidebarDemo />
        ) : (
          <SidebarDemo />
        )}
      </main>
    </div>
  );
}

export default SidebarDemoPage;
