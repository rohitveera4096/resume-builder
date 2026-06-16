/**
 * Generate LaTeX code that exactly matches the main.tex template structure.
 * 
 * IMPORTANT: This generator outputs raw LaTeX. Only user-entered free text
 * is sanitized. Structural LaTeX commands are NOT escaped.
 */
export const generateLatex = (resumeData) => {
  // Only sanitize user text that shouldn't contain LaTeX commands
  const esc = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_');
  };

  const name = `${resumeData.personal.firstName || ''} ${resumeData.personal.lastName || ''}`.trim();
  const email = resumeData.personal.email || '';
  const phone = resumeData.personal.phone || '';

  // Parse linkedin and github fields
  let githubUser = 'rohitveera';
  let githubUrl = 'https://github.com/rohitveera4096';
  let linkedinName = 'Rohit Veera';
  let linkedinUrl = 'https://www.linkedin.com/in/rohitveera4096/';

  // Handle explicit GitHub field
  if (resumeData.personal.github) {
    const val = resumeData.personal.github.trim();
    if (val) {
      githubUrl = val.startsWith('http') ? val : `https://${val}`;
      githubUser = val.split('/').filter(Boolean).pop() || val;
    } else {
      githubUser = '';
      githubUrl = '';
    }
  } else {
    githubUser = '';
    githubUrl = '';
  }

  // Handle explicit or combined LinkedIn field
  if (resumeData.personal.linkedin) {
    const val = resumeData.personal.linkedin.trim();
    if (val) {
      // If it contains a pipe and github wasn't explicitly provided, parse both
      if (val.includes('|') && !resumeData.personal.github) {
        const parts = val.split('|').map(p => p.trim());
        parts.forEach(p => {
          if (p.toLowerCase().includes('github.com')) {
            githubUrl = p.startsWith('http') ? p : `https://${p}`;
            githubUser = p.split('/').filter(Boolean).pop() || p;
          } else if (p.toLowerCase().includes('linkedin.com')) {
            linkedinUrl = p.startsWith('http') ? p : `https://${p}`;
            linkedinName = p.split('/').filter(Boolean).pop() || p;
          }
        });
      } else {
        linkedinUrl = val.startsWith('http') ? val : `https://${val}`;
        linkedinName = val.split('/').filter(Boolean).pop() || val;
      }
    } else {
      linkedinName = '';
      linkedinUrl = '';
    }
  } else {
    linkedinName = '';
    linkedinUrl = '';
  }

  const titles = resumeData.sectionTitles || {
    objective: 'OBJECTIVE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    projects: 'PROJECTS',
    experience: 'EXPERIENCE',
    availability: 'AVAILABILITY'
  };

  let headerParts = [];
  if (githubUser) {
    headerParts.push(`\\href{${githubUrl}}{\\raisebox{-0.05\\height}\\faGithub\\ ${esc(githubUser)}}`);
  }
  if (linkedinName) {
    headerParts.push(`\\href{${linkedinUrl}}{\\raisebox{-0.05\\height}\\faLinkedin\\ ${esc(linkedinName)}}`);
  }
  if (email) {
    headerParts.push(`\\href{mailto:${email}}{\\raisebox{-0.05\\height}\\faEnvelope \\ ${esc(email)}}`);
  }
  if (phone) {
    headerParts.push(`\\href{tel:${phone.replace(/\\s/g, '')}}{\\raisebox{-0.05\\height}\\faMobile \\ ${esc(phone)}}`);
  }

  let tex = `%----------------------------------------------------------------------------------------
% DOCUMENT DEFINITION
%----------------------------------------------------------------------------------------
\\documentclass[a4paper,12pt]{article}

%----------------------------------------------------------------------------------------
% PACKAGES
%----------------------------------------------------------------------------------------
\\usepackage{url}
\\usepackage{parskip}  

\\RequirePackage{color}
\\RequirePackage{graphicx}
\\usepackage[usenames,dvipsnames]{xcolor}
\\usepackage[scale=0.9]{geometry}

\\usepackage{tabularx}
\\usepackage{enumitem}

\\newcolumntype{C}{>{\\centering\\arraybackslash}X} 

\\usepackage{supertabular}
\\usepackage{tabularx}
\\newlength{\\fullcollw}
\\setlength{\\fullcollw}{0.47\\textwidth}

\\usepackage{titlesec}    
\\usepackage{multicol}
\\usepackage{multirow}

\\titleformat{\\section}{\\Large\\scshape\\raggedright}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{10pt}{10pt}

\\usepackage[style=authoryear,sorting=ynt, maxbibnames=2]{biblatex}

\\usepackage[unicode, draft=false]{hyperref}
\\definecolor{linkcolour}{rgb}{0,0.2,0.6}
\\hypersetup{colorlinks,breaklinks,urlcolor=linkcolour,linkcolor=linkcolour}
\\setlength\\bibitemsep{1em}

\\usepackage{fontawesome5}

%----------------------------------------------------------------------------------------
% BEGIN DOCUMENT
%----------------------------------------------------------------------------------------
\\begin{document}

\\pagestyle{empty} 

%----------------------------------------------------------------------------------------
% TITLE
%----------------------------------------------------------------------------------------

\\begin{tabularx}{\\linewidth}{@{} C @{}}
\\Huge{${esc(name)}}\\\\[7.5pt]
${headerParts.join(' \\ $|$ \\ ')}\\\\
\\end{tabularx}

`;


  const legacyProjects = (resumeData.experience || []).filter(e => !e.company || e.company === 'Project');
  const projectsList = [...(resumeData.projects || []), ...legacyProjects];
  const experiencesList = (resumeData.experience || []).filter(e => e.company && e.company !== 'Project');

  const sectionGenerators = {
    objective: () => {
      if (!resumeData.summary) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.objective.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.objective)}}\n`;
      out += `\\begin{tabularx}{\\linewidth}{@{}l X@{}} \n`;
      out += `\\multicolumn{2}{@{}X@{}}{${esc(resumeData.summary)}}\n\n\n`;
      out += `\\end{tabularx}\n\n`;
      return out;
    },
    education: () => {
      if (!resumeData.education || resumeData.education.length === 0) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.education.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.education)}}\n`;
      out += `\\begin{tabularx}{\\linewidth}{@{}l X@{}} \n`;
      resumeData.education.forEach(ed => {
        const dates = ed.startDate && ed.endDate 
          ? `${esc(ed.startDate)}-${esc(ed.endDate)}` 
          : esc(ed.startDate || ed.endDate || '');
        const cgpaVal = ed.cgpa ? `CGPA: ${ed.cgpa}` : (ed.description ? ed.description.replace(/^•\s*/, '') : '');
        const cgpa = cgpaVal ? ` \\hfill ${esc(cgpaVal)}` : '';
        out += `${dates} & ${esc(ed.degree)} at \\textbf{${esc(ed.school)}}${cgpa} \\\\\n\n`;
      });
      out += `\\end{tabularx}\n\n`;
      return out;
    },
    skills: () => {
      if (!resumeData.skills) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.skills.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.skills)}}\n`;
      out += `\\begin{tabularx}{\\linewidth}{@{}l X@{}}\n`;
      
      const skillLines = resumeData.skills.split('\n').filter(l => l.trim());
      let hasCategories = false;
      
      skillLines.forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 25) {
          hasCategories = true;
          const category = line.substring(0, colonIdx).trim();
          const values = line.substring(colonIdx + 1).trim();
          out += `${esc(category)}&  \\normalsize{${esc(values)}}\\\\\n`;
        }
      });
      
      if (!hasCategories) {
        out += `\\multicolumn{2}{@{}X@{}}{${esc(resumeData.skills)}}\\\\\n`;
      }
      
      out += `\\end{tabularx}\n\n`;
      return out;
    },
    projects: () => {
      if (projectsList.length === 0) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.projects.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.projects)}}\n`;
      projectsList.forEach(proj => {
        const dates = proj.startDate && proj.endDate 
          ? `${esc(proj.startDate)} -- ${esc(proj.endDate)}` 
          : esc(proj.startDate || proj.endDate || '');
        const title = esc(proj.title || '');
        const url = proj.location || '';
        
        let techStackOrLink = '';
        if (url) {
          if (url.startsWith('http') || url.startsWith('www') || url.includes('.com') || url.includes('.org') || url.includes('github.com')) {
            const href = url.startsWith('http') ? url : `https://${url}`;
            techStackOrLink = ` $|$ \\href{${href}}{${esc(url)}}`;
          } else {
            techStackOrLink = ` $|$ \\textit{${esc(url)}}`;
          }
        }

        out += `\\begin{tabularx}{\\linewidth}{ @{}l r@{} }\n`;
        out += `\\textbf{${title}}${techStackOrLink} & \\hfill ${dates} \\\\[3.75pt]\n`;
        if (proj.description) {
          const desc = esc(proj.description.replace(/^•\s*/gm, '').trim());
          out += `\\multicolumn{2}{@{}X@{}}{${desc}}\n`;
        }
        out += `\\end{tabularx}\n\n`;
      });
      return out;
    },
    experience: () => {
      if (experiencesList.length === 0) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.experience.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.experience)}}\n\n`;
      experiencesList.forEach(exp => {
        const dates = exp.startDate && exp.endDate 
          ? `${esc(exp.startDate)} -- ${esc(exp.endDate)}` 
          : esc(exp.startDate || exp.endDate || '');
        const title = exp.company 
          ? `${esc(exp.title)} — ${esc(exp.company)}` 
          : esc(exp.title || '');
        
        out += `\\begin{tabularx}{\\linewidth}{ @{}l r@{} }\n`;
        out += `\\textbf{${title}} & \\hfill ${dates} \\\\[3.75pt]\n`;
        if (exp.description) {
          const desc = esc(exp.description.replace(/^•\s*/gm, '').trim());
          out += `\\multicolumn{2}{@{}X@{}}{${desc}}  \\\\\n`;
        }
        out += `\\end{tabularx}\n\n`;
      });
      return out;
    },
    certifications: () => {
      if (!resumeData.certifications || resumeData.certifications.length === 0) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.certifications.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.certifications)}}\n`;
      resumeData.certifications.forEach(cert => {
        const name = esc(cert.name || '');
        const link = cert.link || '';
        
        let linkText = '';
        if (link) {
          const href = link.startsWith('http') ? link : `https://${link}`;
          linkText = ` & \\hfill \\href{${href}}{view}`;
        } else {
          linkText = ` & \\hfill`;
        }

        out += `\\begin{tabularx}{\\linewidth}{ @{}l r@{} }\n`;
        out += `{${name}}${linkText} \\\\[3.75pt] \n`;
        out += `\\end{tabularx}\n`;
      });
      out += `\n`;
      return out;
    },
    availability: () => {
      if (!resumeData.availability || (!resumeData.availability.internshipType && !resumeData.availability.startDate && !resumeData.availability.workMode)) return '';
      let out = `%----------------------------------------------------------------------------------------\n`;
      out += `% ${titles.availability.toUpperCase()}\n`;
      out += `%----------------------------------------------------------------------------------------\n`;
      out += `\\section{${esc(titles.availability)}}\n`;
      out += `\\begin{tabularx}{\\linewidth}{@{}l X@{}}\n`;
      if (resumeData.availability.internshipType) {
        out += `\\textbf{Internship Type:} & ${esc(resumeData.availability.internshipType)} \\\\\n`;
      }
      if (resumeData.availability.startDate) {
        out += `\\textbf{Start Date:} & ${esc(resumeData.availability.startDate)} \\\\\n`;
      }
      if (resumeData.availability.workMode) {
        out += `\\textbf{Work Mode:} & ${esc(resumeData.availability.workMode)}\n`;
      } else {
        out = out.replace(/ \\\\\n$/, '\n');
      }
      out += `\\end{tabularx}\n\n`;
      return out;
    }
  };

  const order = resumeData.sectionOrder || ['objective', 'education', 'skills', 'projects', 'experience', 'certifications', 'availability'];
  const visibility = resumeData.sectionVisibility || {};

  order.forEach(secId => {
    if (visibility[secId] !== false && sectionGenerators[secId]) {
      tex += sectionGenerators[secId]();
    }
  });

  tex += `%----------------------------------------------------------------------------------------

\\end{document}`;

  return tex;
};
