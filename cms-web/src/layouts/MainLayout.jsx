import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const handleSidebarToggle = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar isOpen={isSidebarOpen} onToggle={handleSidebarToggle} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header isSidebarOpen={isSidebarOpen} onSidebarToggle={handleSidebarToggle} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
