"use client";

import { SidebarNav } from '@/components/layout/sidebar-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav isAdmin={true} />
      <main className="pr-64 min-h-screen">
        <div className="container mx-auto p-8">
          {children}
          <div className="mt-20 border-t pt-8 text-center pb-8">
            <p className="text-sm text-muted-foreground">made by : mohamed alaa</p>
          </div>
        </div>
      </main>
    </div>
  );
}