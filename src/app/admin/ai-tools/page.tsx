"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, Sparkles, Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { analyzeEssayAnswer } from '@/ai/flows/admin-essay-answer-analyzer';
import { generateQuizQuestions } from '@/ai/flows/admin-quiz-question-generator';

export default function AITools() {
  const [essay, setEssay] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  const handleAnalyze = async () => {
    if (!essay) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeEssayAnswer({ essayAnswer: essay });
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const result = await generateQuizQuestions({ topic, numberOfQuestions: 3, questionType: 'BOTH' });
      setQuestions(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
          <BrainCircuit className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-4xl font-headline font-bold">مساعد البشمهندس الذكي</h1>
          <p className="text-muted-foreground">استخدم الذكاء الاصطناعي لتسهيل مهامك اليومية.</p>
        </div>
      </div>

      <Tabs defaultValue="essay" className="space-y-6">
        <TabsList className="bg-card border h-14 p-1 rounded-2xl">
          <TabsTrigger value="essay" className="h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-8">تحليل المقالات</TabsTrigger>
          <TabsTrigger value="quiz" className="h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-8">توليد الأسئلة</TabsTrigger>
        </TabsList>

        <TabsContent value="essay" className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> تحليل إجابات الطلاب المقالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="ألصق إجابة الطالب هنا ليقوم الذكاء الاصطناعي بتلخيصها واستخراج المفاهيم الأساسية..."
                className="min-h-[200px] bg-background border-primary/10 focus:border-primary text-lg"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !essay}
                className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl text-lg shadow-lg shadow-primary/20"
              >
                {isAnalyzing ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" /> جاري التحليل...</> : <><Wand2 className="w-5 h-5 ml-2" /> ابدأ التحليل الآن</>}
              </Button>
            </CardContent>
          </Card>

          {analysisResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-500">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader><CardTitle className="text-primary font-bold">الملخص الذكي</CardTitle></CardHeader>
                <CardContent><p className="leading-relaxed">{analysisResult.summary}</p></CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardHeader><CardTitle className="text-accent font-bold">المفاهيم الرئيسية</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.keyConcepts.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" /> {c}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> إنشاء أسئلة امتحان ذكية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="اكتب موضوع الامتحان (مثال: قوانين نيوتن للحركة)" 
                className="h-14 bg-background border-primary/10 focus:border-primary text-lg"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !topic}
                className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl text-lg shadow-lg shadow-primary/20"
              >
                {isGenerating ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" /> جاري التوليد...</> : <><Sparkles className="w-5 h-5 ml-2" /> ولد 3 أسئلة فورية</>}
              </Button>
            </CardContent>
          </Card>

          {questions.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h3 className="text-xl font-bold border-b pb-2">الأسئلة المقترحة:</h3>
              {questions.map((q, i) => (
                <Card key={i} className="bg-card">
                  <CardContent className="p-6">
                    <div className="flex justify-between mb-4">
                      <span className="text-xs font-bold px-2 py-1 bg-secondary rounded uppercase">{q.type}</span>
                    </div>
                    <p className="text-lg font-bold mb-4">{i+1}. {q.questionText}</p>
                    {q.type === 'MCQ' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt: string, idx: number) => (
                          <div key={idx} className={`p-3 rounded-lg border ${opt === q.correctAnswer ? 'bg-accent/10 border-accent/50 text-accent' : 'bg-background'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-primary/5 rounded-xl border border-dashed border-primary/30">
                        <p className="text-sm font-bold text-primary mb-2">عناصر الإجابة المقترحة:</p>
                        <p className="text-sm italic">{q.suggestedAnswerOutline}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full h-12 border-primary/20 text-primary">إضافة هذه الأسئلة للامتحان الحالي</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}