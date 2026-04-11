
"use client";

import { SidebarNav } from '@/components/layout/sidebar-nav';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row-reverse">
      <SidebarNav isAdmin={false} />
      <main className="flex-1 min-h-screen pt-16 lg:pt-0 lg:pr-64">
        <div className="container mx-auto p-4 md:p-8">
          {children}
          <div className="mt-20 border-t pt-8 text-center pb-8">
            <p className="text-sm text-muted-foreground">made by : mohamed alaa</p>
          </div>
        </div>
      </main>
    </div>
  );
}
