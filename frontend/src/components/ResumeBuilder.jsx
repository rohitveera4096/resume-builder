import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Download, Wand2, Plus, Trash2, Save, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, GripVertical, Check, Mail, Phone, MapPin, Link, Loader2, FileText, ArrowLeft } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { supabase } from '../supabase';
import { generateLatex } from '../utils/latexGenerator';
import { Checkbox } from './ui/checkbox';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Layout', 'Contacts', 'Objective', 'Education', 'Skills', 'Projects', 'Experience', 'Certifications', 'Availability', 'Finalize'];

const parseSkills = (skillsStr) => {
  if (!skillsStr) return [];
  return skillsStr.split('\n').map(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      return {
        category: line.substring(0, colonIdx).trim(),
        tags: line.substring(colonIdx + 1).split(',').map(s => s.trim()).filter(Boolean)
      };
    } else if (line.trim()) {
      return {
        category: '',
        tags: line.split(',').map(s => s.trim()).filter(Boolean)
      };
    }
    return null;
  }).filter(Boolean);
};

const serializeSkills = (skillsArr) => {
  return skillsArr.map(cat => {
    if (cat.category) {
      return `${cat.category}: ${cat.tags.join(', ')}`;
    }
    return cat.tags.join(', ');
  }).join('\n');
};

const LOADING_STATUSES = [
  'Reading resume details...',
  'Evaluating keyword match...',
  'Analyzing section structure...',
  'Measuring readability & length...',
  'Calculating ATS score...',
  'Polishing AI suggestions...'
];

export default function ResumeBuilder({ session, initialTemplate, initialData, initialId, initialTitle }) {
  const navigate = useNavigate();
  const [resumeId, setResumeId] = useState(initialId || null);
  const [projectName, setProjectName] = useState(initialTitle || null);
  const [saving, setSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(initialTemplate || localStorage.getItem('selected_template') || 'minimalist');
  const [activeStep, setActiveStep] = useState(0);

  const [expandedExpId, setExpandedExpId] = useState(null);
  const [expandedEdId, setExpandedEdId] = useState(null);
  const [expandedProjId, setExpandedProjId] = useState(null);
  const [expandedCertId, setExpandedCertId] = useState(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tempProjectName, setTempProjectName] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle");

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [tempDownloadName, setTempDownloadName] = useState("");

  // Initialize data parsing
  const initData = useMemo(() => {
    // Try to load saved data from localStorage first
    const savedData = localStorage.getItem('resume_builder_data');
    let data = initialData || (savedData ? JSON.parse(savedData) : null) || {
      personal: { firstName: 'Eswara', lastName: 'Sai Veera', email: 'eswarsaiveera@gmail.com', phone: '+91 6309746112', linkedin: 'https://www.linkedin.com/in/eswara-sai-veera-66a121236', linkedinName: 'Eswara Sai Veera', github: 'https://github.com/EswarSaiVeera', githubName: 'EswarSaiVeera' },
      availability: { internshipType: '', startDate: '', workMode: '' },
      summary: 'An aspiring Computer Science student seeking an entry-level position at a software Company. I am eager to contribute to impactful projects using my skills in Python, Java, and SQL. I am particularly interested in working on projects related to Web Development, Artificial Intelligence and Machine Learning.',
      experience: [
        { id: '1', title: 'Data Engineer', company: 'Edubot, Vijayawada, AP.', location: '', startDate: 'May 2024', endDate: 'June 2024', description: 'Developed a Console based application using Python and Postgresql, Participated in code reviews, Gained hands-on experience with version control using Git.' }
      ],
      education: [
        { id: '1', school: 'RGUKT, Nuzvid', degree: 'B.Tech, CSE', cgpa: '8.53', startDate: '2021', endDate: '2025' },
        { id: '2', school: 'RGUKT, Nuzvid', degree: 'Pre University Course', cgpa: '9.37', startDate: '2019', endDate: '2021' },
        { id: '3', school: 'ZPPH School , Valluru, East Godavari District', degree: 'Class 10th', cgpa: '10.0', startDate: '2018', endDate: '2019' }
      ],
      projects: [
        { id: 'p1', title: 'Time Table Manager', location: '', startDate: '2023', endDate: '', description: 'This web application is useful for managing the timetables in colleges or academic instutes by providing information about the leisure periods and whether the class is going on at the given point of time or not. It consists of HTML,CSS,JS technologies.' },
        { id: 'p2', title: 'CertiFier', location: '', startDate: 'Feb 2024', endDate: 'May 2024', description: 'Created a decentralized NFT Marketplace called CertiFier using Solidity and React. Developed smart contracts for minting NFTs, ensuring maximum security. Deployed the application using Hardhat.' },
        { id: 'p3', title: 'Student Stress Prediction and Health Risk Detection', location: '', startDate: 'April 2025', endDate: '', description: 'Student health risks are concerned more these days so using Machine Learning techniques like SVMs, Random Forests etc. We are trying to predict the Stress level of a student to identify the Health risks thereby suggesting the measures to reduce it.' }
      ],
      skills: 'Programming Languages: Python, C, Java, SQL and Solidity Basics\nWeb Technologies: HTML, CSS, JavaScript\nDatabases: MySQL\nTools: Git and GitHub, AWS Basics\nSoft Skills: Problem Solving, Communication, Time Management and Adaptability',
      certifications: [
        { id: 'c1', name: 'Supervised Machine Learning: Regression and Classification', link: 'https://coursera.org/share/40a8ef328e897eddf7de130728ec5998' },
        { id: 'c2', name: 'Advanced Learning Algorithms', link: 'https://coursera.org/share/d9427caa496cbb190e7937f85995b020' },
        { id: 'c3', name: 'Unsupervised Learning, Recommenders, Reinforcement Learning', link: 'https://coursera.org/share/f71875eec24cb26a05eb170c45c1359e' }
      ],
      sectionTitles: {
        objective: 'Objective',
        education: 'Education',
        skills: 'Skills',
        projects: 'Projects',
        experience: 'Internships',
        certifications: 'Certifications',
        availability: 'Availability'
      },
      sectionOrder: ['objective', 'education', 'skills', 'projects', 'experience', 'certifications', 'availability'],
      sectionVisibility: { objective: true, education: true, skills: true, projects: true, experience: true, certifications: true, availability: false }
    };

    // Convert skills array to string if needed
    if (Array.isArray(data.skills)) {
      data.skills = data.skills.join('\n');
    }

    // Ensure skills is a string
    if (typeof data.skills !== 'string') {
      data.skills = data.skills ? String(data.skills) : '';
    }

    // Up-convert legacy "name" field to firstName/lastName for AI parsing payloads
    if (data.personal.name && !data.personal.firstName) {
      const parts = data.personal.name.split(' ');
      data.personal.firstName = parts[0] || '';
      data.personal.lastName = parts.slice(1).join(' ') || '';
    }

    // Normalize education entries: map legacy fields and ensure IDs
    if (data.education && Array.isArray(data.education)) {
      data.education = data.education.map((ed, idx) => {
        const normalized = { ...ed };
        // Auto-generate id if missing
        if (!normalized.id) normalized.id = String(idx + 1);
        // Map "year" to startDate/endDate if they are missing
        if (normalized.year && !normalized.startDate && !normalized.endDate) {
          // Try to split "2022 - 2026" or "2022-2026" format
          const yearParts = normalized.year.split(/[-–—]/);
          if (yearParts.length >= 2) {
            normalized.startDate = yearParts[0].trim();
            normalized.endDate = yearParts[1].trim();
          } else {
            normalized.startDate = normalized.year.trim();
            normalized.endDate = '';
          }
        }
        // Ensure fields exist
        if (!normalized.startDate) normalized.startDate = '';
        if (!normalized.endDate) normalized.endDate = '';
        if (!normalized.cgpa) normalized.cgpa = '';
        if (!normalized.school) normalized.school = '';
        if (!normalized.degree) normalized.degree = '';
        return normalized;
      });
    }

    // Normalize experience entries: map legacy fields and ensure IDs
    if (data.experience && Array.isArray(data.experience)) {
      data.experience = data.experience.map((exp, idx) => {
        const normalized = { ...exp };
        // Auto-generate id if missing
        if (!normalized.id) normalized.id = String(idx + 1);
        // Map "role" to "title" if title is missing
        if (normalized.role && !normalized.title) {
          normalized.title = normalized.role;
        }
        // Map "date" to startDate/endDate if they are missing
        if (normalized.date && !normalized.startDate && !normalized.endDate) {
          const dateParts = normalized.date.split(/[-–—]/);
          if (dateParts.length >= 2) {
            normalized.startDate = dateParts[0].trim();
            normalized.endDate = dateParts[1].trim();
          } else {
            normalized.startDate = normalized.date.trim();
            normalized.endDate = '';
          }
        }
        // Ensure fields exist
        if (!normalized.title) normalized.title = '';
        if (!normalized.company) normalized.company = '';
        if (!normalized.location) normalized.location = '';
        if (!normalized.startDate) normalized.startDate = '';
        if (!normalized.endDate) normalized.endDate = '';
        if (!normalized.description) normalized.description = '';
        return normalized;
      });
    }

    // Normalize projects: ensure IDs and fields
    if (data.projects && Array.isArray(data.projects)) {
      data.projects = data.projects.map((proj, idx) => {
        const normalized = { ...proj };
        if (!normalized.id) normalized.id = String(Date.now() + idx);
        if (!normalized.title) normalized.title = '';
        if (!normalized.location) normalized.location = '';
        if (!normalized.startDate) normalized.startDate = '';
        if (!normalized.endDate) normalized.endDate = '';
        if (!normalized.description) normalized.description = '';
        return normalized;
      });
    }

    // Migrate legacy projects out of experience array (if projects not already set)
    if (!data.projects && data.experience) {
      data.projects = data.experience.filter(e => e.company === 'Project' || !e.company);
      data.experience = data.experience.filter(e => e.company && e.company !== 'Project');
    }
    if (!data.projects) data.projects = [];

    // Ensure availability exists
    if (!data.availability) data.availability = {};

    // Ensure sectionTitles exists
    if (!data.sectionTitles) {
      data.sectionTitles = {
        objective: 'OBJECTIVE',
        education: 'EDUCATION',
        skills: 'SKILLS',
        projects: 'PROJECTS',
        experience: 'EXPERIENCE',
        certifications: 'CERTIFICATIONS',
        availability: 'AVAILABILITY'
      };
    } else if (!data.sectionTitles.certifications) {
      data.sectionTitles.certifications = 'CERTIFICATIONS';
    }

    if (!data.certifications || data.certifications.length === 0) {
      data.certifications = [
        { id: 'c1', name: 'Supervised Machine Learning: Regression and Classification', link: 'https://coursera.org/share/40a8ef328e897eddf7de130728ec5998' },
        { id: 'c2', name: 'Advanced Learning Algorithms', link: 'https://coursera.org/share/d9427caa496cbb190e7937f85995b020' },
        { id: 'c3', name: 'Unsupervised Learning, Recommenders, Reinforcement Learning', link: 'https://coursera.org/share/f71875eec24cb26a05eb170c45c1359e' }
      ];
    }

    if (!data.sectionOrder) {
      data.sectionOrder = ['objective', 'education', 'skills', 'projects', 'experience', 'certifications', 'availability'];
    }
    if (!data.sectionVisibility) {
      data.sectionVisibility = { objective: true, education: true, skills: true, projects: true, experience: true, certifications: true, availability: true };
    }

    return data;
  }, [initialData]);

  const [resumeData, setResumeData] = useState(initData);
  const [latexPdfUrl, setLatexPdfUrl] = useState(null);
  const [isCompilingLatex, setIsCompilingLatex] = useState(false);
  const [latexError, setLatexError] = useState(null);
  const printRef = useRef(null);

  // Auto-save resumeData to localStorage on every change
  useEffect(() => {
    localStorage.setItem('resume_builder_data', JSON.stringify(resumeData));
  }, [resumeData]);

  useEffect(() => {
    if (activeTemplate !== 'latex') return;

    setIsCompilingLatex(true);
    setLatexError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const texString = generateLatex(resumeData);

        const formData = new FormData();
        formData.append('filecontents', texString);

        const response = await fetch('/api/compile-latex', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const blob = await response.blob();
          if (blob.type === 'application/pdf') {
            if (latexPdfUrl) URL.revokeObjectURL(latexPdfUrl);
            const url = URL.createObjectURL(blob);
            setLatexPdfUrl(url);
          } else {
            const text = await blob.text();
            setLatexError('Compilation failed. Check input for invalid LaTeX characters.');
            console.error('LaTeX Error:', text);
          }
        } else {
          setLatexError('API Error: ' + response.statusText);
        }
      } catch (error) {
        setLatexError('Network Error: ' + error.message);
      } finally {
        setIsCompilingLatex(false);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [resumeData, activeTemplate]);

  // Removed auto-load from Supabase. New resumes should start fresh or from localStorage.
  // Saved resumes are loaded via the "My Resumes" screen instead.

  // Synchronize activeTemplate with initialTemplate when the selected template prop changes
  useEffect(() => {
    if (initialTemplate) {
      setActiveTemplate(initialTemplate);
      localStorage.setItem('selected_template', initialTemplate);
    }
  }, [initialTemplate]);

  // --- AI ATS Analysis ---
  const [atsResult, setAtsResult] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const [atsLoadingStep, setAtsLoadingStep] = useState(0);

  useEffect(() => {
    let interval;
    if (atsLoading) {
      setAtsLoadingStep(0);
      interval = setInterval(() => {
        setAtsLoadingStep(prev => (prev + 1) % LOADING_STATUSES.length);
      }, 900);
    }
    return () => clearInterval(interval);
  }, [atsLoading]);

  const analyzeAts = async () => {
    setAtsLoading(true);
    setAtsError(null);
    setAtsResult(null);
    setAppliedSuggestions(new Set());
    setExpandedSuggestion(null);
    try {
      const response = await fetch('/api/analyze-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData })
      });
      if (!response.ok) throw new Error('Failed to analyze');
      const data = await response.json();
      setAtsResult(data);
    } catch (err) {
      setAtsError('Our servers are currently experiencing high demand. Please try again later.');
    } finally {
      setAtsLoading(false);
    }
  };

  const applySuggestion = (suggestion, index) => {
    const fieldPath = suggestion.field;
    const replacement = suggestion.replacement;

    setResumeData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const parts = fieldPath.split('.');
      let target = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
        target = target[key];
      }
      const lastKey = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : parseInt(parts[parts.length - 1]);
      target[lastKey] = replacement;
      return updated;
    });

    setAppliedSuggestions(prev => new Set([...prev, index]));
  };

  // --- State Updaters ---
  const updatePersonal = (field, value) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, [field]: value } }));
  const updateSummary = (value) => setResumeData(prev => ({ ...prev, summary: value }));
  const updateExperience = (id, field, value) => {
    setResumeData(prev => ({ ...prev, experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp) }));
  };
  const addExperience = () => {
    const newId = Date.now().toString();
    setResumeData(prev => ({ ...prev, experience: [...prev.experience, { id: newId, title: '', company: '', location: '', startDate: '', endDate: '', description: '' }] }));
    setExpandedExpId(newId);
  };
  const removeExperience = (id) => {
    setResumeData(prev => ({ ...prev, experience: prev.experience.filter(exp => exp.id !== id) }));
  };

  const updateProject = (id, field, value) => {
    setResumeData(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  };
  const addProject = () => {
    const newId = Date.now().toString();
    setResumeData(prev => ({ ...prev, projects: [...(prev.projects || []), { id: newId, title: '', location: '', startDate: '', endDate: '', description: '' }] }));
    setExpandedProjId(newId);
  };
  const removeProject = (id) => setResumeData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));

  const updateEducation = (id, field, value) => {
    setResumeData(prev => ({ ...prev, education: prev.education.map(ed => ed.id === id ? { ...ed, [field]: value } : ed) }));
  };
  const addEducation = () => {
    const newId = Date.now().toString();
    setResumeData(prev => ({ ...prev, education: [...prev.education, { id: newId, school: '', degree: '', cgpa: '', startDate: '', endDate: '' }] }));
    setExpandedEdId(newId);
  };
  const removeEducation = (id) => setResumeData(prev => ({ ...prev, education: prev.education.filter(ed => ed.id !== id) }));

  const updateCertification = (id, field, value) => {
    setResumeData(prev => ({ ...prev, certifications: prev.certifications.map(c => c.id === id ? { ...c, [field]: value } : c) }));
  };
  const addCertification = () => {
    const newId = Date.now().toString();
    setResumeData(prev => ({ ...prev, certifications: [...(prev.certifications || []), { id: newId, name: '', link: '' }] }));
    setExpandedCertId(newId);
  };
  const removeCertification = (id) => setResumeData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c.id !== id) }));

  const updateSkills = (value) => setResumeData(prev => ({ ...prev, skills: value }));
  const updateAvailability = (field, value) => setResumeData(prev => ({ ...prev, availability: { ...(prev.availability || {}), [field]: value } }));
  const updateSectionTitle = (section, value) => setResumeData(prev => ({ ...prev, sectionTitles: { ...(prev.sectionTitles || {}), [section]: value } }));

  const moveSectionUp = (index) => {
    if (index === 0) return;
    setResumeData(prev => {
      const newOrder = [...prev.sectionOrder];
      const temp = newOrder[index - 1];
      newOrder[index - 1] = newOrder[index];
      newOrder[index] = temp;
      return { ...prev, sectionOrder: newOrder };
    });
  };

  const moveSectionDown = (index) => {
    if (index === resumeData.sectionOrder.length - 1) return;
    setResumeData(prev => {
      const newOrder = [...prev.sectionOrder];
      const temp = newOrder[index + 1];
      newOrder[index + 1] = newOrder[index];
      newOrder[index] = temp;
      return { ...prev, sectionOrder: newOrder };
    });
  };

  const toggleSectionVisibility = (id) => {
    setResumeData(prev => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [id]: !prev.sectionVisibility[id]
      }
    }));
  };

  // --- AI Operations ---
  const [aiLoading, setAiLoading] = useState(null);
  const enhanceDescription = async (id, currentTitle, currentDesc) => {
    setAiLoading(id);
    try {
      const response = await fetch('/api/generate-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: currentTitle, description: currentDesc })
      });
      if (!response.ok) throw new Error("Backend error");
      const data = await response.json();
      updateExperience(id, 'description', data.generatedText);
    } catch (error) {
      alert("Failed to connect to AI backend.");
    } finally {
      setAiLoading(null);
    }
  };

  const saveResume = () => {
    setTempProjectName(projectName || (resumeData.personal.firstName ? `${resumeData.personal.firstName}'s Resume` : 'Untitled'));
    setSaveStatus("idle");
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => {
    if (!tempProjectName.trim()) return;
    setProjectName(tempProjectName);
    setSaveStatus("saving");
    
    try {
      const payload = {
        user_id: session?.user?.id,
        title: tempProjectName,
        resume_data: resumeData
      };
      
      let error;
      if (resumeId) {
        const { error: updateError } = await supabase.from('resumes').update(payload).eq('id', resumeId);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase.from('resumes').insert([payload]).select();
        error = insertError;
        if (data && data.length > 0) setResumeId(data[0].id);
      }
      if (error) throw error;
      setSaveStatus("success");
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const openDownloadModal = () => {
    let defaultName = `${resumeData.personal.firstName || ''}_${resumeData.personal.lastName || ''}_Resume`.replace(/\s+/g, '_');
    if (!resumeData.personal.firstName && !resumeData.personal.lastName) defaultName = 'resume';
    if (defaultName.startsWith('_')) defaultName = defaultName.slice(1);
    setTempDownloadName(defaultName);
    setShowDownloadModal(true);
  };

  const handleDownloadConfirm = () => {
    if (!tempDownloadName.trim()) return;
    const finalFilename = tempDownloadName.trim().endsWith('.pdf') ? tempDownloadName.trim() : `${tempDownloadName.trim()}.pdf`;

    if (activeTemplate === 'latex') {
      if (latexPdfUrl) {
        const a = document.createElement('a');
        a.href = latexPdfUrl;
        a.download = finalFilename;
        a.click();
      }
    } else {
      if (printRef.current) {
        const opt = {
          margin: 0,
          filename: finalFilename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(printRef.current).save();
      }
    }
    setShowDownloadModal(false);
  };

  // --- Render Subcomponents ---
  const renderStepper = () => (
    <div className="wb-stepper">
      {STEPS.map((step, idx) => (
        <div key={idx} className={`wb-step ${idx === activeStep ? 'active' : ''} ${idx < activeStep ? 'completed' : ''}`} onClick={() => setActiveStep(idx)}>
          <div className="wb-step-node">
            {idx + 1}
          </div>
          <div className="wb-step-name">{step}</div>
          {idx < STEPS.length - 1 && <div className="wb-step-line" />}
        </div>
      ))}
    </div>
  );

  const getFullName = () => [resumeData.personal.firstName, resumeData.personal.lastName].filter(Boolean).join(' ');

  return (
    <div className="builder-container">
      {/* Editor Panel */}
      <div className="editor-panel-wrapper" style={{ width: '50%', borderRight: '1px solid #e2e8f0', zIndex: 10, display: 'flex', flexDirection: 'row' }}>

        {/* Left Sidebar */}
        <div className="sidebar-stepper">
          <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '2rem' }}>
            <button 
              onClick={() => navigate('/templates')} 
              style={{ background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', color: '#475569', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
              title="Back to Dashboard"
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
          </div>
          {renderStepper()}
        </div>

        {/* Main Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>

          <div className="wb-scroll-area">

            {/* Layout Step */}
            {activeStep === 0 && (
              <div className="wb-step-content fading-in">
                <h2>Resume Layout</h2>
                <p className="wb-subtitle">Reorder your resume sections and choose which ones to display in the generated PDF.</p>
                <div className="wb-accordion-list">
                  {resumeData.sectionOrder?.map((secId, index) => {
                    const visible = resumeData.sectionVisibility?.[secId] !== false;
                    const titleStr = resumeData.sectionTitles?.[secId] || secId.toUpperCase();
                    return (
                      <div key={secId} className="wb-accordion-item" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <Checkbox
                            id={`visibility-${secId}`}
                            checked={visible}
                            onCheckedChange={() => toggleSectionVisibility(secId)}
                            title="Toggle visibility"
                            className="w-5 h-5 data-[state=checked]:bg-slate-900 data-[state=checked]:text-slate-50 border-slate-300"
                          />
                          <label htmlFor={`visibility-${secId}`} style={{ fontWeight: 600, color: visible ? '#0f172a' : '#94a3b8', textDecoration: visible ? 'none' : 'line-through', cursor: 'pointer' }}>
                            {titleStr}
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="wb-icon-btn"
                            disabled={index === 0}
                            onClick={() => moveSectionUp(index)}
                            title="Move Up"
                          >
                            <ChevronUp size={18} />
                          </button>
                          <button
                            className="wb-icon-btn"
                            disabled={index === resumeData.sectionOrder?.length - 1}
                            onClick={() => moveSectionDown(index)}
                            title="Move Down"
                          >
                            <ChevronDown size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contacts Step */}
            {activeStep === 1 && (
              <div className="wb-step-content fading-in">
                <h2>Contact Information</h2>
                <p className="wb-subtitle">Provide your professional contact details so recruiters and hiring managers can easily connect with you regarding career opportunities.</p>
                <div className="form-row">
                  <div className="form-group wb-floating-group">
                    <label>First Name</label>
                    <div className="wb-input-with-icon">
                      <input type="text" value={resumeData.personal.firstName || ''} onChange={e => updatePersonal('firstName', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group wb-floating-group">
                    <label>Last Name</label>
                    <div className="wb-input-with-icon">
                      <input type="text" value={resumeData.personal.lastName || ''} onChange={e => updatePersonal('lastName', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group wb-floating-group">
                    <label>Phone Number</label>
                    <div className="wb-input-with-icon">
                      <input type="text" value={resumeData.personal.phone || ''} onChange={e => updatePersonal('phone', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group wb-floating-group">
                    <label>Email Address</label>
                    <div className="wb-input-with-icon">
                      <input type="email" value={resumeData.personal.email || ''} onChange={e => updatePersonal('email', e.target.value)} />
                      {resumeData.personal.email && <Check size={16} className="wb-check-icon" />}
                    </div>
                  </div>
                </div>
                {activeTemplate === 'latex' ? (
                  <>
                    <div className="form-row">
                      <div className="form-group wb-floating-group">
                        <label>LinkedIn URL</label>
                        <input type="text" value={resumeData.personal.linkedin || ''} onChange={e => updatePersonal('linkedin', e.target.value)} placeholder="https://..." />
                      </div>
                      <div className="form-group wb-floating-group">
                        <label>LinkedIn Display Name</label>
                        <input type="text" value={resumeData.personal.linkedinName || ''} onChange={e => updatePersonal('linkedinName', e.target.value)} placeholder="e.g. Eswara Sai Veera" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group wb-floating-group">
                        <label>GitHub URL</label>
                        <input type="text" value={resumeData.personal.github || ''} onChange={e => updatePersonal('github', e.target.value)} placeholder="https://..." />
                      </div>
                      <div className="form-group wb-floating-group">
                        <label>GitHub Display Name</label>
                        <input type="text" value={resumeData.personal.githubName || ''} onChange={e => updatePersonal('githubName', e.target.value)} placeholder="e.g. EswarSaiVeera" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="form-group wb-floating-group">
                    <label>LinkedIn/Website URL</label>
                    <input type="text" value={resumeData.personal.linkedin || ''} onChange={e => updatePersonal('linkedin', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* Experience Step */}
            {activeStep === 6 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Experience</h2>
                    <input type="text" value={resumeData.sectionTitles?.experience || ''} onChange={e => updateSectionTitle('experience', e.target.value)} placeholder="e.g. EXPERIENCE" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                  </div>
                  <div className="wb-chip">Experience tips <ChevronDown size={14} /></div>
                </div>
                <p className="wb-subtitle">List your work experience starting with the most recent position first.</p>

                <div className="wb-accordion-list">
                  {resumeData.experience.map(exp => {
                    const isExpanded = expandedExpId === exp.id;
                    return (
                      <div key={exp.id} className={`wb-accordion-item ${isExpanded ? 'active' : ''}`}>
                        <div className="wb-acc-header" onClick={() => setExpandedExpId(isExpanded ? null : exp.id)}>
                          <div className="wb-acc-title-area">
                            <GripVertical size={16} color="#cbd5e0" className="drag-handle" />
                            <div>
                              <div className="wb-acc-title">{exp.title || '(Not specified)'}, {exp.company || 'Employer'}</div>
                              <div className="wb-acc-sub">{exp.startDate} {exp.startDate && exp.endDate ? '-' : ''} {exp.endDate}</div>
                            </div>
                          </div>
                          <div className="wb-acc-actions">
                            <button className="wb-icon-btn" onClick={(e) => { e.stopPropagation(); setExpandedExpId(isExpanded ? null : exp.id); }}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button className="wb-icon-btn danger" onClick={(e) => { e.stopPropagation(); removeExperience(exp.id); }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="wb-acc-body" onClick={e => e.stopPropagation()}>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Job title</label>
                                <div className="wb-input-with-icon">
                                  <input type="text" value={exp.title} onChange={e => updateExperience(exp.id, 'title', e.target.value)} />
                                </div>
                              </div>
                              <div className="form-group">
                                <label>Employer</label>
                                <div className="wb-input-with-icon">
                                  <input type="text" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} />
                                </div>
                              </div>
                            </div>
                            <div className="form-row" style={{ alignItems: 'flex-end' }}>
                              <div className="form-group" style={{ flex: 0.5 }}>
                                <label>Start date</label>
                                <input type="text" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} />
                              </div>
                              <div className="form-group" style={{ flex: 0.5 }}>
                                <label>End date</label>
                                <input type="text" value={exp.endDate} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} />
                              </div>
                            </div>
                            <div className="form-group">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label>Description</label>
                                <button
                                  className="btn btn-magic"
                                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}
                                  onClick={() => enhanceDescription(exp.id, exp.title, exp.description)}
                                  disabled={aiLoading === exp.id || !exp.title}
                                >
                                  <Wand2 size={14} /> {aiLoading === exp.id ? 'Enhancing...' : 'Generate with AI'}
                                </button>
                              </div>
                              <div className="wb-wysiwyg-toolbar">
                                <b>B</b> <i>I</i> <u>U</u> <s>S</s> <span>🔗</span> <span>≡</span> <span>↑</span> <span>↩</span>
                              </div>
                              <textarea rows={5} value={exp.description} onChange={e => updateExperience(exp.id, 'description', e.target.value)} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button className="wb-add-link" onClick={addExperience}><Plus size={16} /> Add work experience</button>
              </div>
            )}

            {/* Education Step */}
            {activeStep === 3 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Education</h2>
                  <input type="text" value={resumeData.sectionTitles?.education || ''} onChange={e => updateSectionTitle('education', e.target.value)} placeholder="e.g. EDUCATION" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                </div>
                <p className="wb-subtitle">A varied education on your resume sums up the value that your learnings and background will bring to job.</p>

                <div className="wb-accordion-list">
                  {resumeData.education.map(ed => {
                    const isExpanded = expandedEdId === ed.id;
                    return (
                      <div key={ed.id} className={`wb-accordion-item ${isExpanded ? 'active' : ''}`}>
                        <div className="wb-acc-header" onClick={() => setExpandedEdId(isExpanded ? null : ed.id)}>
                          <div className="wb-acc-title-area">
                            <GripVertical size={16} color="#cbd5e0" className="drag-handle" />
                            <div>
                              <div className="wb-acc-title">{ed.degree || '(Not specified)'}, {ed.school || 'School'}</div>
                              <div className="wb-acc-sub">{ed.startDate} {ed.startDate && ed.endDate ? '-' : ''} {ed.endDate}</div>
                            </div>
                          </div>
                          <div className="wb-acc-actions">
                            <button className="wb-icon-btn" onClick={(e) => { e.stopPropagation(); setExpandedEdId(isExpanded ? null : ed.id); }}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button className="wb-icon-btn danger" onClick={(e) => { e.stopPropagation(); removeEducation(ed.id); }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="wb-acc-body" onClick={e => e.stopPropagation()}>
                            <div className="form-row">
                              <div className="form-group">
                                <label>School/University</label>
                                <input type="text" value={ed.school} onChange={e => updateEducation(ed.id, 'school', e.target.value)} />
                              </div>
                              <div className="form-group">
                                <label>Degree</label>
                                <input type="text" value={ed.degree} onChange={e => updateEducation(ed.id, 'degree', e.target.value)} />
                              </div>
                            </div>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Start Date</label>
                                <input type="text" value={ed.startDate} onChange={e => updateEducation(ed.id, 'startDate', e.target.value)} />
                              </div>
                              <div className="form-group">
                                <label>End Date</label>
                                <input type="text" value={ed.endDate} onChange={e => updateEducation(ed.id, 'endDate', e.target.value)} />
                              </div>
                              <div className="form-group">
                                <label>CGPA</label>
                                <input type="text" value={ed.cgpa || ''} onChange={e => updateEducation(ed.id, 'cgpa', e.target.value)} placeholder="e.g. 9.1" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button className="wb-add-link" onClick={addEducation}><Plus size={16} /> Add education</button>
              </div>
            )}

            {/* Skills Step */}
            {activeStep === 4 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Skills & Expertise</h2>
                  <input type="text" value={resumeData.sectionTitles?.skills || ''} onChange={e => updateSectionTitle('skills', e.target.value)} placeholder="e.g. SKILLS" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                </div>
                <p className="wb-subtitle">Organize your skills into categories. Type a skill and press Enter or Comma to add it.</p>
                <div className="skills-editor">
                  {parseSkills(resumeData.skills || '').map((cat, idx) => (
                    <div key={idx} className="skill-category-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={cat.category}
                          onChange={(e) => {
                            const newSkills = parseSkills(resumeData.skills);
                            newSkills[idx].category = e.target.value;
                            updateSkills(serializeSkills(newSkills));
                          }}
                          className="skill-category-input"
                          placeholder="Category Name (e.g. Languages)"
                        />
                        <button className="wb-icon-btn danger" onClick={() => {
                          const newSkills = parseSkills(resumeData.skills);
                          newSkills.splice(idx, 1);
                          updateSkills(serializeSkills(newSkills));
                        }} title="Remove Category">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="tags-container">
                        {cat.tags.map((tag, tIdx) => (
                          <div key={tIdx} className="skill-tag">
                            {tag}
                            <button onClick={() => {
                              const newSkills = parseSkills(resumeData.skills);
                              newSkills[idx].tags.splice(tIdx, 1);
                              updateSkills(serializeSkills(newSkills));
                            }} title="Remove Skill">
                              &times;
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          placeholder="Add skill..."
                          className="skill-add-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const val = e.target.value.trim().replace(/,/g, '');
                              if (val) {
                                const newSkills = parseSkills(resumeData.skills);
                                newSkills[idx].tags.push(val);
                                updateSkills(serializeSkills(newSkills));
                                e.target.value = '';
                              }
                            } else if (e.key === 'Backspace' && !e.target.value && cat.tags.length > 0) {
                              e.preventDefault();
                              const newSkills = parseSkills(resumeData.skills);
                              newSkills[idx].tags.pop();
                              updateSkills(serializeSkills(newSkills));
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button className="wb-add-link" onClick={() => {
                    const newSkills = parseSkills(resumeData.skills || '');
                    newSkills.push({ category: 'New Category', tags: [] });
                    updateSkills(serializeSkills(newSkills));
                  }}><Plus size={16} /> Add Category</button>
                </div>
              </div>
            )}

            {/* Summary (Objective) Step */}
            {activeStep === 2 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Professional Summary</h2>
                  <input type="text" value={resumeData.sectionTitles?.objective || ''} onChange={e => updateSectionTitle('objective', e.target.value)} placeholder="e.g. OBJECTIVE" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                </div>
                <p className="wb-subtitle">Highlight your career goals, strengths, and the value you can bring to a potential employer.</p>
                <div className="form-group">
                  <textarea rows={6} value={resumeData.summary} onChange={e => updateSummary(e.target.value)} placeholder="Brief summary of your professional background..." />
                </div>
              </div>
            )}

            {/* Projects Step */}
            {activeStep === 5 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Projects</h2>
                    <input type="text" value={resumeData.sectionTitles?.projects || ''} onChange={e => updateSectionTitle('projects', e.target.value)} placeholder="e.g. PROJECTS" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                  </div>
                  <div className="wb-chip">Project tips <ChevronDown size={14} /></div>
                </div>
                <p className="wb-subtitle">Highlight your best projects that showcase your technical skills and problem-solving abilities.</p>

                <div className="wb-accordion-list">
                  {resumeData.projects.map(proj => {
                    const isExpanded = expandedProjId === proj.id;
                    return (
                      <div key={proj.id} className={`wb-accordion-item ${isExpanded ? 'active' : ''}`}>
                        <div className="wb-acc-header" onClick={() => setExpandedProjId(isExpanded ? null : proj.id)}>
                          <div className="wb-acc-title-area">
                            <GripVertical size={16} color="#cbd5e0" className="drag-handle" />
                            <div>
                              <div className="wb-acc-title">{proj.title || '(Not specified)'}</div>
                              <div className="wb-acc-sub">{proj.startDate} {proj.startDate && proj.endDate ? '-' : ''} {proj.endDate}</div>
                            </div>
                          </div>
                          <div className="wb-acc-actions">
                            <button className="wb-icon-btn" onClick={(e) => { e.stopPropagation(); setExpandedProjId(isExpanded ? null : proj.id); }}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button className="wb-icon-btn danger" onClick={(e) => { e.stopPropagation(); removeProject(proj.id); }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="wb-acc-body" onClick={e => e.stopPropagation()}>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Project Name</label>
                                <div className="wb-input-with-icon">
                                  <input type="text" value={proj.title} onChange={e => updateProject(proj.id, 'title', e.target.value)} />
                                </div>
                              </div>
                              <div className="form-group">
                                <label>Project Link / Tech Stack</label>
                                <input type="text" value={proj.location} onChange={e => updateProject(proj.id, 'location', e.target.value)} placeholder="e.g. github.com/username/project or React, Node.js" />
                              </div>
                            </div>
                            <div className="form-row" style={{ alignItems: 'flex-end' }}>
                              <div className="form-group" style={{ flex: 0.5 }}>
                                <label>Start date</label>
                                <input type="text" value={proj.startDate} onChange={e => updateProject(proj.id, 'startDate', e.target.value)} />
                              </div>
                              <div className="form-group" style={{ flex: 0.5 }}>
                                <label>End date</label>
                                <input type="text" value={proj.endDate} onChange={e => updateProject(proj.id, 'endDate', e.target.value)} />
                              </div>
                            </div>
                            <div className="form-group">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label>Description</label>
                                <button
                                  className="btn btn-magic"
                                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}
                                  onClick={() => enhanceDescription(proj.id, proj.title, proj.description)}
                                  disabled={aiLoading === proj.id || !proj.title}
                                >
                                  <Wand2 size={14} /> {aiLoading === proj.id ? 'Enhancing...' : 'Generate with AI'}
                                </button>
                              </div>
                              <div className="wb-wysiwyg-toolbar">
                                <b>B</b> <i>I</i> <u>U</u> <s>S</s> <span>🔗</span> <span>≡</span> <span>↑</span> <span>↩</span>
                              </div>
                              <textarea rows={5} value={proj.description} onChange={e => updateProject(proj.id, 'description', e.target.value)} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button className="wb-add-link" onClick={addProject}><Plus size={16} /> Add project</button>
              </div>
            )}


            {/* Certifications Step */}
            {activeStep === 7 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Certifications</h2>
                  <input type="text" value={resumeData.sectionTitles?.certifications || ''} onChange={e => updateSectionTitle('certifications', e.target.value)} placeholder="e.g. CERTIFICATIONS" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                </div>
                <p className="wb-subtitle">Add your relevant certifications and their valid links.</p>

                <div className="wb-accordion-list">
                  {resumeData.certifications?.map(cert => {
                    const isExpanded = expandedCertId === cert.id;
                    return (
                      <div key={cert.id} className={`wb-accordion-item ${isExpanded ? 'active' : ''}`}>
                        <div className="wb-acc-header" onClick={() => setExpandedCertId(isExpanded ? null : cert.id)}>
                          <div className="wb-acc-title-area">
                            <GripVertical size={16} color="#cbd5e0" className="drag-handle" />
                            <div>
                              <div className="wb-acc-title">{cert.name || '(Not specified)'}</div>
                            </div>
                          </div>
                          <div className="wb-acc-actions">
                            <button className="wb-icon-btn" onClick={(e) => { e.stopPropagation(); setExpandedCertId(isExpanded ? null : cert.id); }}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button className="wb-icon-btn danger" onClick={(e) => { e.stopPropagation(); removeCertification(cert.id); }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="wb-acc-body" onClick={e => e.stopPropagation()}>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Certification Name</label>
                                <div className="wb-input-with-icon">
                                  <input type="text" value={cert.name} onChange={e => updateCertification(cert.id, 'name', e.target.value)} placeholder="e.g. AWS Certified Solutions Architect" />
                                </div>
                              </div>
                              <div className="form-group">
                                <label>Link</label>
                                <input type="text" value={cert.link} onChange={e => updateCertification(cert.id, 'link', e.target.value)} placeholder="e.g. https://coursera.org/share/..." />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button className="wb-add-link" onClick={addCertification}><Plus size={16} /> Add certification</button>
              </div>
            )}


            {/* Availability Step */}
            {activeStep === 8 && (
              <div className="wb-step-content fading-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>Availability</h2>
                  <input type="text" value={resumeData.sectionTitles?.availability || ''} onChange={e => updateSectionTitle('availability', e.target.value)} placeholder="e.g. AVAILABILITY" className="wb-section-title-input" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, color: '#4a5568', width: '150px' }} />
                </div>
                <p className="wb-subtitle">Detail your availability and work preferences (specific to the LaTeX template).</p>
                <div className="form-group wb-floating-group">
                  <label>Internship/Job Type</label>
                  <input type="text" value={resumeData.availability?.internshipType || ''} onChange={e => updateAvailability('internshipType', e.target.value)} placeholder="e.g. Software Engineering Intern (Explore Program)" />
                </div>
                <div className="form-group wb-floating-group">
                  <label>Start Date</label>
                  <input type="text" value={resumeData.availability?.startDate || ''} onChange={e => updateAvailability('startDate', e.target.value)} placeholder="e.g. As per program schedule" />
                </div>
                <div className="form-group wb-floating-group">
                  <label>Work Mode</label>
                  <input type="text" value={resumeData.availability?.workMode || ''} onChange={e => updateAvailability('workMode', e.target.value)} placeholder="e.g. On-site / Hybrid (as required)" />
                </div>
              </div>
            )}

            {/* Finalize Step */}
            {activeStep === 9 && (
              <div className="wb-step-content fading-in" style={{ paddingTop: '2rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>You're almost done!</h2>
                <p className="wb-subtitle" style={{ marginBottom: '2rem', textAlign: 'center' }}>Review your resume preview on the right. Check your ATS score to see how well it performs.</p>

                {/* Check ATS Score button */}
                {!atsResult && !atsLoading && (
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <button
                      className="wb-btn-next"
                      onClick={analyzeAts}
                      style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Wand2 size={20} /> Check ATS Score
                    </button>
                    {atsError && <p style={{ color: '#e53e3e', marginTop: '1rem', fontSize: '0.9rem' }}>{atsError}</p>}
                  </div>
                )}

                {/* Loading state */}
                {atsLoading && (
                  <div className="wb-ats-loading-container">
                    <div className="wb-resume-scanner">
                      <div className="wb-scanner-line" />
                      <div className="wb-scanner-skeleton-line" />
                      <div className="wb-scanner-skeleton-line" />
                      <div className="wb-scanner-skeleton-line" />
                      <div className="wb-scanner-skeleton-line" />
                      <div className="wb-scanner-skeleton-line" />
                    </div>
                    <p className="wb-ats-loading-text">{LOADING_STATUSES[atsLoadingStep]}</p>
                    <p className="wb-ats-loading-subtext">This will only take a moment</p>
                  </div>
                )}

                {/* ATS Result */}
                {atsResult && !atsLoading && (
                  <div>
                    {/* Score display */}
                    <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', fontSize: '1.25rem' }}>
                        {atsResult.score >= 80 ? <CheckCircle size={24} color="#10b981" /> : <AlertTriangle size={24} color={atsResult.score >= 50 ? '#f59e0b' : '#ef4444'} />}
                        ATS Score: <span style={{ color: atsResult.score >= 80 ? '#10b981' : atsResult.score >= 50 ? '#f59e0b' : '#ef4444', fontSize: '1.5rem', fontWeight: 700 }}>{atsResult.score} / 100</span>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {atsResult.suggestions && atsResult.suggestions.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d3748', marginBottom: '0.75rem' }}>Suggestions</h3>
                        {atsResult.suggestions.map((sug, i) => {
                          const isExpanded = expandedSuggestion === i;
                          const isApplied = appliedSuggestions.has(i);
                          return (
                            <div key={i} style={{
                              background: isApplied ? '#f8fafc' : '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                              marginBottom: '0.75rem',
                              overflow: 'hidden',
                              opacity: isApplied ? 0.7 : 1
                            }}>
                              <div
                                onClick={() => !isApplied && setExpandedSuggestion(isExpanded ? null : i)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  gap: '0.75rem', padding: '1rem', cursor: isApplied ? 'default' : 'pointer'
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: '0.9rem', color: '#4a5568', margin: 0 }}>{sug.issue}</p>
                                </div>
                                {isApplied ? (
                                  <span style={{ color: '#10b981', fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                                    <Check size={14} /> Applied
                                  </span>
                                ) : (
                                  <ChevronDown size={16} color="#a0aec0" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                )}
                              </div>
                              {isExpanded && !isApplied && (
                                <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #edf2f7' }}>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, margin: '0.75rem 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proposed change for {sug.field}:</div>
                                  <div style={{
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
                                    padding: '0.75rem', fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.5,
                                    maxHeight: '120px', overflowY: 'auto', marginBottom: '1rem'
                                  }}>
                                    {sug.replacement}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); applySuggestion(sug, i); setExpandedSuggestion(null); }}
                                    style={{
                                      background: '#0f172a', color: '#f8fafc', border: 'none', borderRadius: '6px',
                                      padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500,
                                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    Apply this change
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {atsResult.suggestions && atsResult.suggestions.length === 0 && (
                      <p style={{ textAlign: 'center', color: '#48bb78', fontWeight: 600, margin: '1rem 0' }}>
                        <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                        Your resume looks great — no suggestions needed!
                      </p>
                    )}

                    {/* Re-check button */}
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button
                        onClick={analyzeAts}
                        style={{
                          background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '6px',
                          padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        Re-evaluate Score
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Stepper Footer Nav */}
          <div className="wb-footer">
            {activeStep > 0 ? (
              <button className="wb-btn-back" onClick={() => setActiveStep(activeStep - 1)}>Back</button>
            ) : <div />}

            {activeStep < STEPS.length - 1 && (
              <button className="wb-btn-next" onClick={() => setActiveStep(activeStep + 1)}>
                Next
              </button>
            )}

            {activeStep === STEPS.length - 1 && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }} onClick={saveResume} disabled={saving}>
                  <Save size={16} style={{ marginRight: '0.4rem' }} /> {saving ? 'Saving...' : 'Save Online'}
                </button>
                <button className="wb-btn-next" onClick={openDownloadModal}>
                  <Download size={16} style={{ marginRight: '0.4rem' }} /> Download PDF
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Preview Panel (No major structural changes here aside from translating new granular personal fields) */}
      <div className="preview-panel" style={activeTemplate === 'latex' ? { padding: 0 } : {}}>
        {activeTemplate !== 'latex' && (
          <div className="preview-header" style={{ marginBottom: '1rem' }}>
          </div>
        )}



        {activeTemplate === 'moderncv' ? (
          <div className="resume-document template-moderncv" ref={printRef}>
            <div className="r-header">
              <div className="r-name">{getFullName()}</div>
              {resumeData.personal.desiredJobTitle && <div className="r-jobtitle">{resumeData.personal.desiredJobTitle}</div>}

              <div className="r-contact">
                {resumeData.personal.city && <span><MapPin size={12} /> {resumeData.personal.city}{resumeData.personal.country ? `, ${resumeData.personal.country}` : ''}</span>}
                {resumeData.personal.email && <span><Mail size={12} /> {resumeData.personal.email}</span>}
                {resumeData.personal.phone && <span><Phone size={12} /> {resumeData.personal.phone}</span>}
                {resumeData.personal.linkedin && <span><Link size={12} /> {resumeData.personal.linkedin}</span>}
              </div>
            </div>

            <div className="r-body">
              {resumeData.summary && (
                <div className="r-section">
                  <div className="r-section-left"></div>
                  <div className="r-section-right">
                    <div className="r-section-title">Summary</div>
                    <p className="r-desc">{resumeData.summary}</p>
                  </div>
                </div>
              )}

              {resumeData.education.length > 0 && (
                <div className="r-section">
                  <div className="r-section-left"></div>
                  <div className="r-section-right"><div className="r-section-title">Education</div></div>
                  {resumeData.education.map(ed => (
                    <div className="r-item" key={ed.id}>
                      <div className="r-item-left">
                        {ed.startDate} – {ed.endDate}
                      </div>
                      <div className="r-item-right">
                        <div className="r-item-header">
                          <span className="r-title">{ed.school}</span>
                          {ed.cgpa ? (
                            <span className="r-location">CGPA: {ed.cgpa}</span>
                          ) : ed.location ? (
                            <span className="r-location">{ed.location}</span>
                          ) : null}
                        </div>
                        <div className="r-item-sub">
                          <span>{ed.degree}</span>
                        </div>
                        {ed.description && (
                          <div className="r-desc">
                            {ed.description.split('\n').map((line, i) => (
                              line.trim() ? <div key={i} className="r-bullet">{line.trim().startsWith('•') ? line : `• ${line}`}</div> : null
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resumeData.experience.length > 0 && (
                <div className="r-section">
                  <div className="r-section-left"></div>
                  <div className="r-section-right"><div className="r-section-title">Experience</div></div>
                  {resumeData.experience.map(exp => (
                    <div className="r-item" key={exp.id}>
                      <div className="r-item-left">
                        {exp.startDate} – {exp.endDate}
                      </div>
                      <div className="r-item-right">
                        <div className="r-item-header">
                          <span className="r-title">{exp.title}</span>
                          {exp.location && <span className="r-location">{exp.location}</span>}
                        </div>
                        <div className="r-item-sub">
                          <span>{exp.company}</span>
                        </div>
                        <div className="r-desc">
                          {exp.description.split('\n').map((line, i) => (
                            line.trim() ? <div key={i} className="r-bullet">{line.trim().startsWith('•') ? line : `• ${line}`}</div> : null
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resumeData.projects && resumeData.projects.length > 0 && (
                <div className="r-section">
                  <div className="r-section-left"></div>
                  <div className="r-section-right"><div className="r-section-title">Projects</div></div>
                  {resumeData.projects.map(proj => (
                    <div className="r-item" key={proj.id}>
                      <div className="r-item-left">
                        {proj.startDate} {proj.startDate && proj.endDate ? '–' : ''} {proj.endDate}
                      </div>
                      <div className="r-item-right">
                        <div className="r-item-header">
                          <span className="r-title">{proj.title}</span>
                          {proj.location && (
                            <span className="r-location">
                              {(proj.location.startsWith('http') || proj.location.includes('.com') || proj.location.includes('.org') || proj.location.includes('github.com')) ? (
                                <a href={proj.location.startsWith('http') ? proj.location : `https://${proj.location}`} target="_blank" rel="noreferrer">{proj.location}</a>
                              ) : proj.location}
                            </span>
                          )}
                        </div>
                        <div className="r-desc">
                          {proj.description && proj.description.split('\n').map((line, i) => (
                            line.trim() ? <div key={i} className="r-bullet">{line.trim().startsWith('•') ? line : `• ${line}`}</div> : null
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resumeData.skills && (
                <div className="r-section">
                  <div className="r-section-left"></div>
                  <div className="r-section-right">
                    <div className="r-section-title">Skills</div>
                    <p className="r-desc">{resumeData.skills}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTemplate === 'latex' ? (
          <div className="template-latex-iframe" style={{ width: '100%', height: '100%', flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {isCompilingLatex && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 5, zIndex: 10 }}>
                <Loader2 size={14} className="animate-spin" /> Compiling LaTeX...
              </div>
            )}
            {latexError && (
              <div style={{ padding: 20, color: 'red', textAlign: 'center' }}>
                <strong>Error:</strong> {latexError}
              </div>
            )}
            {latexPdfUrl ? (
              <iframe src={`${latexPdfUrl}#toolbar=0&navpanes=0`} style={{ width: '100%', height: '100%', border: 'none' }} title="LaTeX PDF Preview" />
            ) : !latexError ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                Generating initial preview...
              </div>
            ) : null}
          </div>
        ) : (
          <div className={`resume-document template-${activeTemplate}`} ref={printRef}>
            <div className="r-header">
              <div className="r-name">{getFullName()}</div>
              {resumeData.personal.desiredJobTitle && <div className="r-jobtitle">{resumeData.personal.desiredJobTitle}</div>}

              <div className="r-contact">
                {['classic', 'professional', 'scizor'].includes(activeTemplate) ? (
                  <>
                    {resumeData.personal.city && <span><MapPin size={11} /> {resumeData.personal.city}{resumeData.personal.country ? `, ${resumeData.personal.country}` : ''}</span>}
                    {resumeData.personal.email && <span><Mail size={11} /> {resumeData.personal.email}</span>}
                    {resumeData.personal.phone && <span><Phone size={11} /> {resumeData.personal.phone}</span>}
                    {resumeData.personal.linkedin && <span><Link size={11} /> {resumeData.personal.linkedin}</span>}
                  </>
                ) : (
                  <>
                    {resumeData.personal.email && <span>{resumeData.personal.email}</span>}
                    {resumeData.personal.phone && <span>{resumeData.personal.phone}</span>}
                    {[resumeData.personal.city, resumeData.personal.country].filter(Boolean).length > 0 && <span>{[resumeData.personal.city, resumeData.personal.country].filter(Boolean).join(', ')}</span>}
                    {resumeData.personal.linkedin && <span>{resumeData.personal.linkedin}</span>}
                  </>
                )}
              </div>
            </div>

            {resumeData.summary && (
              <div className="r-section">
                <div className="r-section-title"><span>Summary</span></div>
                <p className="r-desc">{resumeData.summary}</p>
              </div>
            )}

            {resumeData.education.length > 0 && (
              <div className="r-section">
                <div className="r-section-title"><span>Education</span></div>
                {resumeData.education.map(ed => (
                  <div className="r-item" key={ed.id}>
                    <div className="r-item-header">
                      <span className="r-title">{ed.school}</span>
                      <span className="r-date">{ed.startDate} {ed.startDate && ed.endDate ? '–' : ''} {ed.endDate}</span>
                    </div>
                    <div className="r-item-sub">
                      <span className="r-subtitle">{ed.degree}</span>
                      <span className="r-location">{ed.cgpa ? `CGPA: ${ed.cgpa}` : ed.location}</span>
                    </div>
                    {ed.description && (
                      <div className="r-desc">
                        {ed.description.split('\n').map((line, i) => (
                          line.trim() ? <div key={i} className="r-bullet">{line.trim().startsWith('•') ? line : `• ${line}`}</div> : null
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {resumeData.experience.length > 0 && (
              <div className="r-section">
                <div className="r-section-title"><span>Experience</span></div>
                {resumeData.experience.map(exp => (
                  <div className="r-item" key={exp.id}>
                    <div className="r-item-header">
                      <span className="r-title">{exp.title}{exp.company ? `, ${exp.company}` : ''}</span>
                      <span className="r-date">{exp.startDate} {exp.startDate && exp.endDate ? '–' : ''} {exp.endDate}</span>
                    </div>
                    <div className="r-item-sub">
                      {activeTemplate !== 'harvard' && activeTemplate !== 'classic' && <span className="r-subtitle">{exp.company}</span>}
                      <span className="r-location">{exp.location}</span>
                    </div>
                    <div className="r-desc">
                      {exp.description.split('\n').map((line, i) => (
                        line.trim() ? <div key={i} className="r-bullet">{line.trim().startsWith('•') ? line : `• ${line}`}</div> : null
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resumeData.projects && resumeData.projects.length > 0 && (
              <div className="r-section">
                <div className="r-section-title"><span>Projects</span></div>
                {resumeData.projects.map(proj => (
                  <div className="r-item" key={proj.id}>
                    <div className="r-item-header">
                      <span className="r-title">{proj.title}</span>
                      <span className="r-date">{proj.startDate} {proj.startDate && proj.endDate ? '–' : ''} {proj.endDate}</span>
                    </div>
                    <div className="r-item-sub">
                      {proj.location && (
                        <span className="r-subtitle">
                          {(proj.location.startsWith('http') || proj.location.includes('.com') || proj.location.includes('.org') || proj.location.includes('github.com')) ? (
                            <a href={proj.location.startsWith('http') ? proj.location : `https://${proj.location}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{proj.location}</a>
                          ) : proj.location}
                        </span>
                      )}
                    </div>
                    <div className="r-desc">
                      {proj.description && proj.description.split('\n').map((line, i) => (
                        line.trim() ? <div key={i} className="r-bullet">{line.trim().startsWith('•') ? line : `• ${line}`}</div> : null
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resumeData.skills && (
              <div className="r-section">
                <div className="r-section-title"><span>Skills</span></div>
                {activeTemplate === 'classic' ? (
                  <ul className="r-skills-grid">
                    {resumeData.skills.split(',').map((skill, i) => (
                      <li key={i}>{skill.trim()}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="r-desc">{resumeData.skills}</p>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="wb-step-content" style={{ padding: '2rem', width: '400px', background: 'hsl(var(--card))', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Save Resume</h3>
            
            {saveStatus === 'idle' || saveStatus === 'saving' ? (
              <>
                <div className="form-group">
                  <label>Resume Name</label>
                  <input
                    type="text"
                    value={tempProjectName}
                    onChange={(e) => setTempProjectName(e.target.value)}
                    placeholder="Enter resume name"
                    autoFocus
                  />
                </div>
                {saveStatus === 'saving' && <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Saving...</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-outline" onClick={() => setShowSaveModal(false)} disabled={saveStatus === 'saving'} style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveConfirm} disabled={!tempProjectName.trim() || saveStatus === 'saving'} style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                    {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : saveStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Check size={24} />
                </div>
                <h4 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: 'hsl(var(--foreground))' }}>Resume saved successfully!</h4>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Your resume "{projectName}" has been saved.</p>
                <button className="btn btn-primary" onClick={() => setShowSaveModal(false)} style={{ width: '100%', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>OK</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <AlertTriangle size={24} />
                </div>
                <h4 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: 'hsl(var(--foreground))' }}>Failed to save</h4>
                <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Please try again later.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button className="btn btn-outline" onClick={() => setShowSaveModal(false)} style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>Close</button>
                  <button className="btn btn-primary" onClick={() => setSaveStatus('idle')} style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>Try Again</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="wb-step-content" style={{ padding: '2rem', width: '400px', background: 'hsl(var(--card))', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Download Resume</h3>
            
            <div className="form-group">
              <label>File Name</label>
              <input
                type="text"
                value={tempDownloadName}
                onChange={(e) => setTempDownloadName(e.target.value)}
                placeholder="Enter file name (e.g. rohit_resume)"
                autoFocus
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowDownloadModal(false)} style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDownloadConfirm} disabled={!tempDownloadName.trim()} style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
