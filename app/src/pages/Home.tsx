import { useEffect } from 'react';
import { useStore } from '@/store';
import { AppLayout } from '@/sections/AppLayout';
import { Dashboard } from '@/sections/Dashboard';
import { AIChat } from '@/sections/AIChat';
import { Classroom } from '@/sections/Classroom';
import { ExamCenter } from '@/sections/ExamCenter';
import { SpeakingLab } from '@/sections/SpeakingLab';
import { KnowledgeMap } from '@/sections/KnowledgeMap';
import { MemoryBooks } from '@/sections/MemoryBooks';
import { StudyReport } from '@/sections/StudyReport';
import { ParentDashboard } from '@/sections/ParentDashboard';
import { UserProfile } from '@/sections/UserProfile';

export default function Home() {
  const currentPage = useStore((s) => s.currentPage);
  const loadConversations = useStore((s) => s.loadConversations);
  const loadReports = useStore((s) => s.loadReports);

  useEffect(() => {
    loadConversations();
    loadReports();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'chat': return <AIChat />;
      case 'classroom': return <Classroom />;
      case 'exam': return <ExamCenter />;
      case 'speaking': return <SpeakingLab />;
      case 'knowledge': return <KnowledgeMap />;
      case 'memory': return <MemoryBooks />;
      case 'report': return <StudyReport />;
      case 'parent': return <ParentDashboard />;
      case 'profile': return <UserProfile />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppLayout>
      {renderPage()}
    </AppLayout>
  );
}
