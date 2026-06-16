import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { FileText, Clock, Edit, Trash2, ArrowLeft, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export default function MyResumes({ session, onOpenResume }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      try {
        const { error } = await supabase.from('resumes').delete().eq('id', id);
        if (error) throw error;
        setResumes(resumes.filter(r => r.id !== id));
      } catch (error) {
        alert('Failed to delete resume: ' + error.message);
      }
    }
  };

  const handleOpen = (resume) => {
    onOpenResume({
      id: resume.id,
      title: resume.title,
      data: resume.resume_data
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 mb-8">
        <div className="container flex h-16 mx-auto max-w-screen-2xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FileText size={18} />
            </div>
            <span className="text-xl tracking-tight hidden sm:inline">My Resumes</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/templates')} className="gap-2 shadow-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Templates</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl px-4 md:px-8 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Saved Resumes</h1>
            <p className="text-muted-foreground mt-2">Manage your resume drafts and projects.</p>
          </div>
          <Button onClick={() => navigate('/templates')} className="gap-2">
            <Plus size={16} /> Create New Resume
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24 text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <p>Loading your resumes...</p>
            </div>
          </div>
        ) : resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-muted/30 rounded-2xl border border-dashed border-border">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-6">
              <FileText size={32} className="text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No resumes found</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">You haven't saved any resumes yet. Start building your career profile by picking a template.</p>
            <Button size="lg" onClick={() => navigate('/templates')} className="gap-2 shadow-md hover:shadow-lg transition-all">
              <Plus size={18} /> Create New Resume
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resumes.map(resume => (
              <Card key={resume.id} className="flex flex-col group overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-bold leading-tight line-clamp-2" title={resume.title}>
                      {resume.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 mt-2">
                    <Clock size={14} className="opacity-70" />
                    <span>Last updated: {new Date(resume.updated_at).toLocaleDateString()}</span>
                  </CardDescription>
                </CardHeader>
                
                <div className="flex-grow"></div>

                <CardFooter className="pt-4 border-t bg-muted/10 gap-3">
                  <Button 
                    className="flex-1 gap-2 font-semibold shadow-sm"
                    onClick={() => handleOpen(resume)}
                  >
                    <Edit size={16} /> Open
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
                    onClick={() => handleDelete(resume.id)}
                    title="Delete Resume"
                  >
                    <Trash2 size={16} />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
