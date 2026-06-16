import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ResumeBuilder from './components/ResumeBuilder';
import Auth from './components/Auth';
import TemplateSelection from './components/TemplateSelection';
import CreationMethod from './components/CreationMethod';
import MyResumes from './components/MyResumes';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import { supabase } from './supabase';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const [chosenTemplate, setChosenTemplate] = useState(() => localStorage.getItem('selected_template') || 'minimalist'); // Passed to builder
  const [parsedData, setParsedData] = useState(null);
  const [initialId, setInitialId] = useState(null);
  const [initialTitle, setInitialTitle] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        if (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/') {
          navigate('/templates');
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        if (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/') {
          navigate('/templates');
        }
      } else {
        // Just clear session
        setSession(null);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading App...</div>;

  const handleTemplateSelection = (templateId) => {
    localStorage.setItem('selected_template', templateId);
    localStorage.removeItem('resume_builder_data');
    setChosenTemplate(templateId);
    setParsedData(null);
    setInitialId(null);
    setInitialTitle(null);
    navigate('/creation-method');
  };

  const handleMethodSelection = (data) => {
    if (data) {
      setParsedData(data);
    }
    navigate('/builder');
  };

  const handleOpenSavedResume = ({ id, title, data }) => {
    setInitialId(id);
    setInitialTitle(title);
    setParsedData(data);
    navigate('/builder');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    navigate('/login');
  };

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={
          session ? <Navigate to="/templates" replace /> : (
            <Auth 
              defaultIsLogin={true} 
              onAuthSuccess={(sessionData) => {
                setSession(sessionData);
                navigate('/templates');
              }} 
            />
          )
        } />
        
        <Route path="/signup" element={
          session ? <Navigate to="/templates" replace /> : (
            <Auth 
              defaultIsLogin={false} 
              onAuthSuccess={(sessionData) => {
                setSession(sessionData);
                navigate('/templates');
              }} 
            />
          )
        } />

        <Route path="/templates" element={
          !session ? <Navigate to="/login" replace /> : (
              <TemplateSelection onSelectTemplate={handleTemplateSelection} onSignOut={handleSignOut} session={session} />
          )
        } />

        <Route path="/creation-method" element={
          !session ? <Navigate to="/login" replace /> : (
            <CreationMethod onMethodSelect={handleMethodSelection} />
          )
        } />
        
        <Route path="/my-resumes" element={
          !session ? <Navigate to="/login" replace /> : (
            <MyResumes session={session} onOpenResume={handleOpenSavedResume} />
          )
        } />

        <Route path="/profile" element={
          !session ? <Navigate to="/login" replace /> : (
            <Profile session={session} onSignOut={handleSignOut} />
          )
        } />

        <Route path="/builder" element={
          !session ? <Navigate to="/login" replace /> : (
            <ResumeBuilder session={session} initialTemplate={chosenTemplate} initialData={parsedData} initialId={initialId} initialTitle={initialTitle} />
          )
        } />

        <Route path="/admin" element={<AdminPanel />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to={session ? "/templates" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;
