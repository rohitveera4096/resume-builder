import React, { useRef, useState } from 'react';
import { UploadCloud, FileEdit, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function CreationMethod({ onMethodSelect }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to parse resume');

      const data = await res.json();
      setLoading(false);
      onMethodSelect(data.result);
    } catch (err) {
      console.error(err);
      setError('An error occurred while parsing the resume. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 mb-8">
        <div className="container flex h-16 mx-auto max-w-screen-2xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FileEdit size={18} />
            </div>
            <span className="text-xl tracking-tight hidden sm:inline">RGUKT CV</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl px-4 py-12 mx-auto flex flex-col items-center">
        
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            How will you make your resume?
          </h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg mb-8 max-w-md w-full border border-destructive/20 font-medium">
            <AlertCircle size={18} className="shrink-0" /> 
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

          {/* Card 1: Upload */}
          <Card 
            className={`group cursor-pointer border-2 transition-all duration-200 hover:border-primary/50 hover:shadow-md ${loading ? 'opacity-60 pointer-events-none' : ''}`}
            onClick={() => !loading && fileInputRef.current.click()}
          >
            <CardContent className="p-8 md:p-10 flex flex-col items-center text-center h-full">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl text-primary flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                {loading ? <Loader2 size={32} className="animate-spin" /> : <UploadCloud size={32} />}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">I already have a resume</h3>
              <p className="text-muted-foreground leading-relaxed">
                {loading ? 'Analyzing your resume with AI...' : 'Upload your existing PDF resume to instantly import your data and make quick edits.'}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Scratch */}
          <Card 
            className={`group cursor-pointer border-2 transition-all duration-200 hover:border-destructive/50 hover:shadow-md ${loading ? 'opacity-60 pointer-events-none' : ''}`}
            onClick={() => !loading && onMethodSelect(null)}
          >
            <CardContent className="p-8 md:p-10 flex flex-col items-center text-center h-full">
              <div className="h-16 w-16 bg-destructive/10 rounded-2xl text-destructive flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                <FileEdit size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Start from scratch</h3>
              <p className="text-muted-foreground leading-relaxed">
                Manually build your new professional resume step-by-step from the ground up.
              </p>
            </CardContent>
          </Card>

        </div>

        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
      </main>
    </div>
  );
}
