import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

let ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'default' });

async function initAI() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'GEMINI_API_KEY').single();
      if (data && data.value) {
        process.env.GEMINI_API_KEY = data.value;
      }
    } catch (err) {
      console.log('Could not fetch key from Supabase (table might not exist yet).');
    }
  }
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}
initAI();

// Serve frontend static files
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/admin/update-key', async (req, res) => {
  const { password, apiKey } = req.body;
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid password' });
  }
  if (!apiKey) {
    return res.status(400).json({ error: 'API Key is required' });
  }

  try {
    if (supabase) {
      const { error } = await supabase.from('app_settings').upsert({ key: 'GEMINI_API_KEY', value: apiKey });
      if (error) throw new Error('Supabase error: ' + error.message);
    }

    ai = new GoogleGenAI({ apiKey });
    process.env.GEMINI_API_KEY = apiKey;

    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${apiKey}`;
      }
      fs.writeFileSync(envPath, envContent);
    }

    res.json({ success: true, message: 'API Key updated successfully (saved to DB if configured)!' });
  } catch (err) {
    console.error('Error updating API key:', err);
    res.status(500).json({ error: 'Failed to update API key: ' + err.message });
  }
});

app.post('/api/compile-latex', upload.none(), async (req, res) => {
  try {
    const { filecontents } = req.body;
    if (!filecontents) {
      return res.status(400).json({ error: 'No LaTeX code provided' });
    }

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const body = `--${boundary}\r\n` +
                 `Content-Disposition: form-data; name="filecontents[]"\r\n\r\n` +
                 `${filecontents}\r\n` +
                 `--${boundary}\r\n` +
                 `Content-Disposition: form-data; name="filename[]"\r\n\r\n` +
                 `document.tex\r\n` +
                 `--${boundary}\r\n` +
                 `Content-Disposition: form-data; name="engine"\r\n\r\n` +
                 `pdflatex\r\n` +
                 `--${boundary}\r\n` +
                 `Content-Disposition: form-data; name="return"\r\n\r\n` +
                 `pdf\r\n` +
                 `--${boundary}--\r\n`;

    const response = await fetch('https://texlive.net/cgi-bin/latexcgi', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: body
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const buffer = await response.arrayBuffer();
      if (contentType.includes('application/pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(buffer));
      } else {
        // texlive.net returns 200 even for errors, but with text/plain content-type
        const text = Buffer.from(buffer).toString('utf8');
        console.error('LaTeX compilation error:', text.substring(0, 200));
        res.status(500).json({ error: 'LaTeX compilation failed', log: text });
      }
    } else {
      const text = await response.text();
      res.status(500).send(text);
    }
  } catch (error) {
    console.error('Error compiling LaTeX:', error);
    res.status(500).json({ error: 'Failed to compile LaTeX' });
  }
});

app.post('/api/generate-bullet', async (req, res) => {
  try {
    const { role, description, skills } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const prompt = `You are an expert resume writer. Generate 3 professional, ATS-friendly bullet points for a ${role} role. 
    Context/Description: ${description || 'Not provided'}
    Skills to highlight: ${skills || 'Not provided'}
    Make them impactful, highlighting achievements. 
    Format as a plain text list separated by newlines, with no markdown styling and no bullet symbols (just the text).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // 1. Text extraction
    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    const text = pdfData.text;

    // 2. Gemini mapping
    const prompt = `You are an AI resume parser. Extract information from the following resume text and format it STRICTLY as a JSON object matching this EXACT schema:
    {
      "personal": {"firstName": "", "lastName": "", "email": "", "phone": "", "linkedin": "", "github": ""},
      "summary": "",
      "experience": [{"title": "", "company": "", "location": "", "startDate": "", "endDate": "", "description": ""}],
      "projects": [{"title": "", "location": "", "startDate": "", "endDate": "", "description": ""}],
      "education": [{"school": "", "degree": "", "cgpa": "", "startDate": "", "endDate": ""}],
      "skills": ["category: skill1, skill2, skill3"],
      "availability": {"internshipType": "", "startDate": "", "workMode": ""}
    }
    Rules:
    - CRITICAL: You are a PARSER, not a writer. Extract ONLY text that actually exists in the resume. Do NOT generate, embellish, add, or rephrase any content.
    - For "summary": copy the objective/summary/profile section EXACTLY as written in the resume. If no objective or summary section exists in the resume, leave it as an empty string "".
    - "firstName" is the first name only, "lastName" is the rest of the name.
    - "linkedin" is the LinkedIn URL if found, "github" is the GitHub URL if found.
    - For education: "startDate" and "endDate" are the start and end years (e.g. "2022", "2026"). "cgpa" is the CGPA/GPA/percentage if mentioned.
    - For experience: "title" is the job title/role. "startDate" and "endDate" are date strings (e.g. "Oct 2023", "Sep 2024"). Leave "endDate" empty if it is current/present.
    - For projects: separate personal projects from work experience. Use "location" for tech stack or project link if available.
    - For skills: format each entry as "Category: skill1, skill2, skill3" (e.g. "Languages: Python, Java, JavaScript").
    - For descriptions: copy them exactly as they appear in the resume. Do NOT rewrite or expand them.
    - For availability: extract if the resume mentions internship/job type being sought, availability start date, or work mode preference (on-site/remote/hybrid). If not found, leave fields as empty strings.
    - Return ONLY pure JSON. No markdown backticks, no explanations.
    Resume Text:
    ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let resultText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(resultText);

    res.json({ result: parsedData });
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

app.post('/api/analyze-ats', async (req, res) => {
  try {
    const { resumeData } = req.body;
    if (!resumeData) {
      return res.status(400).json({ error: 'No resume data provided' });
    }

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `You are an ATS (Applicant Tracking System) resume analyst. Today's date is ${currentDate}. Analyze this resume and provide a fair ATS compatibility score from 0-100.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Return a JSON object with this EXACT schema:
{
  "score": <number 0-100>,
  "suggestions": [
    {
      "field": "<field path like 'summary' or 'experience.0.description' or 'skills'>",
      "issue": "<brief 1-line explanation>",
      "replacement": "<the improved text>"
    }
  ]
}

Rules:
- Today is ${currentDate}. Do NOT flag any dates in 2025 or earlier as "future dates". They are in the past.
- Do NOT suggest changes to dates, company names, school names, or personal info. Those are facts.
- Score fairly based on: contact info, summary quality, action verbs, quantifiable metrics, skills, and education.
- ONLY suggest changes that will make a real difference for ATS parsing. Skip minor tweaks.
- Maximum 2 suggestions. If the resume is good, return an EMPTY suggestions array [].
- For "field": use exact paths like "summary", "experience.0.description", "skills".
- For "replacement": provide the complete replacement text for that field.
- Return ONLY pure JSON. No markdown, no explanations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let resultText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(resultText);

    res.json(result);
  } catch (error) {
    console.error('Error analyzing ATS:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
