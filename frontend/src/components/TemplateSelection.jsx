import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, FileEdit, LogOut, FolderOpen, ChevronRight, LayoutTemplate, User, Settings, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import latexImg from '../assets/templates/rohit_preview.png';
import eswaraImg from '../assets/templates/eswara_sai_veera_resume.png';

export default function TemplateSelection({ onSelectTemplate, onSignOut, session }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const user = session?.user;
  const userEmail = user?.email;
  const displayName = user?.user_metadata?.display_name || userEmail?.split('@')[0] || 'My Account';

  const templates = [
    { id: 'latex', name: 'Eswara Sai Veera (LaTeX)', tag: 'ATS-Optimized Exact Match', recommended: true, image: eswaraImg }
  ];

  return (
    <div className="flex min-h-screen bg-muted/40 font-sans overflow-x-hidden relative">
      
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'mr-72' : 'mr-0'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-6 md:px-8">
            <div className="flex items-center gap-2 font-bold text-primary">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <FileEdit size={18} />
              </div>
              <span className="text-xl tracking-tight">RGUKT CV</span>
            </div>
            
            {/* Toggle Button */}
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
                <Menu size={24} />
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="container max-w-6xl py-12 px-6 md:px-8 mx-auto">
          <div className="flex flex-col items-center text-center space-y-6 mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Choose your resume template
            </h1>
            <Button variant="link" onClick={() => onSelectTemplate('latex')} className="text-muted-foreground hover:text-primary mt-2">
              Skip for now &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map(tmpl => (
              <Card 
                key={tmpl.id}
                className="relative overflow-hidden cursor-pointer flex flex-col border border-border/50 shadow-sm"
                onClick={() => onSelectTemplate(tmpl.id)}
              >
                <div className="relative w-full bg-muted/10">
                  <img
                    src={tmpl.image}
                    alt={`${tmpl.name} preview`}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>

                <div className="p-4 bg-card border-t border-border/50">
                  <Button className="w-full font-semibold tracking-wide">
                    Choose template
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* Right Sidebar */}
      <aside 
        className={`fixed top-0 right-0 z-50 h-screen w-72 bg-card border-l shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="text-lg tracking-tight">Navigation</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-3 px-3 uppercase tracking-wider">General</div>
            <div className="space-y-1">
              <Button variant="secondary" className="w-full justify-start gap-3 font-medium">
                <LayoutTemplate size={18} />
                Templates
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground font-medium" onClick={() => navigate('/my-resumes')}>
                <FolderOpen size={18} />
                My Resumes
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-3 px-3 uppercase tracking-wider">Profile</div>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground font-medium" onClick={() => navigate('/profile')}>
                <User size={18} />
                Account Details
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground font-medium">
                <Settings size={18} />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-4 bg-muted/20">
          {onSignOut && (
            <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 font-medium" onClick={onSignOut}>
              <LogOut size={18} />
              Log out
            </Button>
          )}
          
          {user && (
            <div 
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
              onClick={() => navigate('/profile')}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold border overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
