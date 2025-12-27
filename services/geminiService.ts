import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, SkillType, InputData, JobLink, ApplicationData } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    professionalSummary: {
      type: Type.STRING,
      description: "A cohesive professional summary derived from merging insights from both the resume and cover letter.",
    },
    topSkills: {
      type: Type.ARRAY,
      description: "A list of the top 10-15 most relevant skills found across both documents.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          score: { 
            type: Type.INTEGER, 
            description: "A relevance or proficiency score from 1-100 based on context and emphasis in the text." 
          },
          type: { 
            type: Type.STRING, 
            enum: [SkillType.TECHNICAL, SkillType.SOFT, SkillType.DOMAIN],
            description: "Category of the skill."
          }
        },
        required: ["name", "score", "type"],
      },
    },
    keywords: {
      type: Type.ARRAY,
      description: "A list of 15-20 distinct, high-value keywords suitable for ATS optimization.",
      items: { type: Type.STRING },
    },
    keyInsights: {
      type: Type.ARRAY,
      description: "5-7 short bullet points highlighting specific strengths, achievements, or unique qualities found.",
      items: { type: Type.STRING },
    },
    matchAnalysis: {
      type: Type.STRING,
      description: "A brief analysis of how well the cover letter supports the resume. Do they align? Are there discrepancies?",
    }
  },
  required: ["professionalSummary", "topSkills", "keywords", "keyInsights", "matchAnalysis"],
};

export const analyzeDocuments = async (resume: InputData, coverLetter: InputData): Promise<AnalysisResult> => {
  const ai = getClient();
  
  const systemInstruction = `
    You are an expert HR Resume Analyst. 
    Analyze the provided Resume and Cover Letter. 
    Extract key information to build a comprehensive candidate profile.
    Please provide the output in strict JSON format matching the schema provided.
  `;

  // Construct the contents with multimodal support
  const parts: any[] = [];

  parts.push({ text: "Here is the RESUME:" });
  
  if (resume.mimeType === 'application/pdf') {
    parts.push({ 
      inlineData: { 
        mimeType: resume.mimeType, 
        data: resume.data 
      } 
    });
  } else {
    // Treat as text (including parsed docx)
    parts.push({ text: resume.data.slice(0, 30000) });
  }

  parts.push({ text: "\n\nHere is the COVER LETTER:" });

  if (coverLetter.mimeType === 'application/pdf') {
    parts.push({ 
      inlineData: { 
        mimeType: coverLetter.mimeType, 
        data: coverLetter.data 
      } 
    });
  } else {
    // Treat as text
    parts.push({ text: coverLetter.data.slice(0, 15000) });
  }

  parts.push({ text: "\n\nAnalyze these documents and produce the requested JSON." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

// Helper to extract root domain (e.g., 'microsoft.com' from 'apply.careers.microsoft.com')
const getRootDomain = (url: string): string => {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const parts = hostname.split('.');
    // Simple heuristic: if > 2 parts, take last 2. 
    // Works for microsoft.com, apple.com, google.com, x.ai (2 parts)
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return url;
  }
};

export const findRelevantJobs = async (keywords: string[], targetUrl: string, limit: number = 3): Promise<{ text: string, links: JobLink[] }> => {
  const ai = getClient();
  
  const rootDomain = getRootDomain(targetUrl);
  
  // Broaden keywords for search query - use OR to maximize recall
  const searchKeywords = keywords.slice(0, 5).map(k => `"${k}"`).join(" OR ");
  
  // Broad prompt strategy with Explicit Fallback
  const prompt = `
    User Target Collection URL: "${targetUrl}"
    Target Root Domain: "${rootDomain}"
    Candidate Keywords: ${searchKeywords}

    **OBJECTIVE**: Find exactly ${limit} distinct "Leaf Page" job postings for the company "${rootDomain}".

    **STRATEGY (Priority Order)**:
    1. **Primary**: Search specifically for job pages on "site:${rootDomain}" or common ATS platforms (Greenhouse, Lever, etc).
    2. **Fallback**: If finding sufficient specific pages on the official site is difficult, expand the search to find **ANY** valid job posting for "${rootDomain}" on reputable third-party sites (LinkedIn, Indeed, etc.).
    3. **Guarantee**: You must attempt to return ${limit} results.

    **LEAF PAGE DEFINITION**:
    - A page describing a single specific role.
    - URL often contains: /job/, /careers/details/, /position/, /req/, or a numeric ID.
    - Examples: 
      - "jobs.apple.com/en-us/details/200..." (Leaf) vs "jobs.apple.com/en-us/search" (Collection)
      - "google.com/about/careers/.../results/123" (Leaf) vs ".../results" (Collection)
      - "boards.greenhouse.io/xai/jobs/123" (Leaf)

    **OUTPUT**:
    - Return Google Search grounding metadata for these leaf pages.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Search completed.";
    
    // Extract grounding chunks
    const links: JobLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk: any) => {
      if (chunk.web && chunk.web.uri && chunk.web.title) {
        links.push({
          title: chunk.web.title,
          uri: chunk.web.uri
        });
      }
    });

    // Flexible filtering logic
    const badTitlePatterns = [
      /not found/i,
      /error/i,
      /404/i,
      /job closed/i,
      /closed job/i,
      /no longer available/i,
      /login/i,
      /sign in/i,
      /search results/i, // "Search Results" is almost always a collection
    ];

    const atsDomains = [
      'greenhouse.io', 'lever.co', 'workday', 'ashby', 'smartrecruiters', 
      'icims', 'jobvite', 'taleo', 'bamboohr', 'recruitee', 'workable'
    ];

    // Helper to normalize URLs
    const normalize = (u: string) => u.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '');
    const normalizedTarget = normalize(targetUrl);

    // Filter AND Score links
    // We do not discard non-domain links immediately anymore. We prioritize.
    const scoredLinks = links.map(link => {
       const linkUrlStr = link.uri;
       let linkUrl: URL;
       try {
         linkUrl = new URL(linkUrlStr);
       } catch {
         return { link, score: -1, valid: false };
       }

       const title = link.title.trim();
       
       // 1. Basic Validity Checks
       // Generic bad patterns in title
       if (badTitlePatterns.some(pattern => pattern.test(title))) {
          // If it's explicitly "Search Results", skip it.
          // But allow "Jobs at X" if we are in fallback mode (handled by score)
          if (title.toLowerCase().includes('search results')) return { link, score: -1, valid: false };
       }

       // Collection Page Loop Prevention
       const normalizedLink = normalize(linkUrlStr);
       if (normalizedLink === normalizedTarget) return { link, score: -1, valid: false };
       if (normalizedLink.startsWith(normalizedTarget) && normalizedLink.length < normalizedTarget.length + 5) {
         return { link, score: -1, valid: false };
       }

       // 2. Scoring
       let score = 0;
       const linkHost = linkUrl.hostname;
       const isRootMatch = linkHost.includes(rootDomain) || rootDomain.includes(linkHost);
       const isAts = atsDomains.some(d => linkHost.includes(d));
       const titleMentionsCompany = title.toLowerCase().includes(rootDomain.split('.')[0]);

       // Tier 1: Official Domain
       if (isRootMatch) {
         score += 100;
       } 
       // Tier 2: Known ATS
       else if (isAts) {
         score += 80;
       } 
       // Tier 3: Third Party but mentions company
       else if (titleMentionsCompany) {
         score += 50;
       }
       // Tier 4: Others (General fallback)
       else {
         score += 10;
       }

       // Specific penalty for "Jobs at" if it's not on the main domain (likely a directory)
       if (/^Jobs at /i.test(title) && !isRootMatch) {
         score -= 20;
       }

       return { link, score, valid: true };
    });

    // Filter invalid, Sort by Score, Deduplicate
    const validLinks = scoredLinks.filter(item => item.valid).sort((a, b) => b.score - a.score);
    
    const uniqueLinks: JobLink[] = [];
    const seen = new Set<string>();
    
    for (const item of validLinks) {
      if (!seen.has(item.link.uri)) {
        seen.add(item.link.uri);
        uniqueLinks.push(item.link);
      }
      if (uniqueLinks.length >= limit) break;
    }

    return { text, links: uniqueLinks };
  } catch (error) {
    console.error("Job Search Error:", error);
    throw error;
  }
};

const applicationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        linkedin: { type: Type.STRING },
        website: { type: Type.STRING },
      },
      required: ["fullName", "email", "phone"]
    },
    responses: {
      type: Type.OBJECT,
      properties: {
        coverLetter: { type: Type.STRING, description: "A tailored cover letter for this specific job." },
        whyThisRole: { type: Type.STRING, description: "Answer to 'Why do you want this job?'" },
        relevantExperience: { type: Type.STRING, description: "Answer to 'What is your relevant experience?'" },
        salaryExpectation: { type: Type.STRING, description: "A professional salary expectation statement." },
      },
      required: ["coverLetter", "whyThisRole", "relevantExperience", "salaryExpectation"]
    },
    applyUrl: { type: Type.STRING, description: "The direct URL to the application form page, if distinct from the job description page." }
  },
  required: ["personalInfo", "responses"]
};

export const generateApplicationData = async (resume: InputData, jobTitle: string, jobUri: string): Promise<ApplicationData> => {
  const ai = getClient();

  // Updated prompt to ensure it treats the input as a specific job
  const prompt = `
    Task: Prepare job application content for a specific position.
    
    Target Job: "${jobTitle}"
    Target URL: ${jobUri}
    
    1. **Research**: Use Google Search to analyze the specific job description at the provided URL. Understand the key requirements, company culture, and role responsibilities.
       - IMPORTANT: Also try to identify if there is a distinct "Apply" URL (a page with a form) that is different from the description page. If found, include it in the 'applyUrl' field.
    2. **Analyze Candidate**: Review the Candidate's Resume provided below.
    3. **Extract Info**: Get Candidate's Personal Info.
    4. **Draft Content**: 
       - Write a specific, passionate Cover Letter connecting the candidate's past projects to this specific role's requirements.
       - Answer "Why do you want this job?" using specific details found in the job description.
       - Summarize "Relevant Experience" by cherry-picking resume items that match the job description.
    
    Output must be valid JSON matching the schema.
  `;

  const parts: any[] = [];
  parts.push({ text: prompt });
  parts.push({ text: "\n\nCANDIDATE RESUME:" });
  
  if (resume.mimeType === 'application/pdf') {
    parts.push({ inlineData: { mimeType: resume.mimeType, data: resume.data } });
  } else {
    parts.push({ text: resume.data.slice(0, 30000) });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: applicationSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as ApplicationData;
  } catch (error) {
    console.error("Application Gen Error:", error);
    throw error;
  }
};