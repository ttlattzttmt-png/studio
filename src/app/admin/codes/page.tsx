"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ticket, Search, Filter, Download, Plus } from 'lucide-react';

export default function ManageCodes() {
  const [codes, setCodes] = useState([
    { id: 1, code: 'ENG-HY-8821', course: 'الفيزياء الحديثة', status: 'نشط', student: '-' },
    { id: 2, code: 'ENG-MZ-1123', course: 'الفيزياء الحديثة', status: 'مستخدم', student: 'محمد أحمد' },
    { id: 3, code: 'ENG-LK-9902', course: 'الميكانيكا', status: 'نشط', student: '-' },
    { id: 4, code: 'ENG-OP-5512', course: 'الرياضيات 1', status: 'منتهي', student: 'خالد يوسف' },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">أكواد التفعيل</h1>
          <p className="text-muted-foreground">أنت المسؤول الوحيد عن إنشاء وتوزيع هذه الأكواد.</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="h-14 px-6 rounded-xl border-primary/20 text-primary">
            <Download className="w-5 h-5 ml-2" /> تصدير Excel
          </Button>
          <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg">
            <Plus className="w-6 h-6" /> توليد أكواد جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">إجمالي الأكواد</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">1,500</p></CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">أكواد مستخدمة</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-accent">1,120</p></CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">أكواد متاحة</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-primary">380</p></CardContent>
        </Card>
      </div>

      <Card className="bg-card overflow-hidden">
        <CardHeader className="border-b bg-secondary/20 py-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="بحث عن كود أو طالب..." className="pr-10 bg-background border-primary/10" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2"><Filter className="w-4 h-4" /> تصفية</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الكورس</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الطالب المستفيد</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                  <TableCell>{c.course}</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      c.status === 'نشط' ? 'bg-accent/10 text-accent border border-accent/20' : 
                      c.status === 'مستخدم' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                      'bg-muted text-muted-foreground border'
                    }`}>
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell>{c.student}</TableCell>
                  <TableCell className="text-left">
                    <Button variant="ghost" size="sm">إلغاء</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}