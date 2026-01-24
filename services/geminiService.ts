import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, SkillType, InputData, JobLink, ApplicationData } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API Key is missing. " +
      "If running locally, ensure process.env.API_KEY is defined in your environment or .env file. " +
      "If in AI Studio, ensure a key is selected or configured for the project."
    );
  }
  return new GoogleGenAI({ apiKey });
};

// Helper function to check for Gemini API errors
const checkForGeminiError = (error: any): boolean => {
  if (error && error.message && typeof error.message === 'string') {
    const msg = error.message;
    return msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || msg.includes("API Key is missing") || msg.includes("API_KEY_INVALID");
  }
  if (typeof error === 'string') {
    return error.includes("RESOURCE_EXHAUSTED") || error.includes("429") || error.includes("API Key is missing");
  }
  return false;
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
    if (checkForGeminiError(error)) {
      throw new Error(`API Error: ${error.message || "Quota exceeded or key invalid. Check billing/limits."}`);
    }
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

const getRootDomain = (url: string): string => {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return url;
  }
};

export const findRelevantJobs = async (
  keywords: string[], 
  targetUrl: string | null, 
  limit: number = 3
): Promise<{ text: string, links: JobLink[] }> => {
  const ai = getClient();
  const searchKeywords = keywords.slice(0, 5).map(k => `"${k}"`).join(" OR ");
  
  let prompt = "";
  let rootDomain = "";

  if (targetUrl) {
    rootDomain = getRootDomain(targetUrl);
    prompt = `
      User Target Collection URL: "${targetUrl}"
      Target Root Domain: "${rootDomain}"
      Candidate Keywords: ${searchKeywords}

      **OBJECTIVE**: Find exactly ${limit} distinct "Leaf Page" job postings for the company "${rootDomain}".
      **STRATEGY**:
      1. Search specifically for job pages on "site:${rootDomain}".
      2. If results are low, expand to third-party sites (LinkedIn, Indeed).
      3. Focus on pages describing a single role (/job/, /career/details/, etc).
      **OUTPUT**: Return Google Search grounding metadata.
    `;
  } else {
    prompt = `
      Candidate Keywords: ${searchKeywords}
      **OBJECTIVE**: Find ${limit} distinct "Leaf Page" job postings that match the candidate keywords.
      **STRATEGY**: Search broadly across major boards (LinkedIn, Indeed) and career pages.
      **OUTPUT**: Return Google Search grounding metadata.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Search completed.";
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

    const badTitlePatterns = [/not found/i, /error/i, /404/i, /job closed/i, /search results/i];
    const atsDomains = ['greenhouse.io', 'lever.co', 'workday', 'ashby', 'smartrecruiters', 'taleo'];
    const normalize = (u: string) => u.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '');
    const normalizedTarget = targetUrl ? normalize(targetUrl) : "";

    const scoredLinks = links.map(link => {
       const linkUrlStr = link.uri;
       let linkUrl: URL;
       try { linkUrl = new URL(linkUrlStr); } catch { return { link, score: -1, valid: false }; }

       const title = link.title.trim();
       if (badTitlePatterns.some(pattern => pattern.test(title))) {
          if (title.toLowerCase().includes('search results')) return { link, score: -1, valid: false };
       }

       if (targetUrl) {
         const normalizedLink = normalize(linkUrlStr);
         if (normalizedLink === normalizedTarget) return { link, score: -1, valid: false };
       }

       let score = 0;
       const linkHost = linkUrl.hostname;

       if (targetUrl) {
         const isRootMatch = linkHost.includes(rootDomain);
         const isAts = atsDomains.some(d => linkHost.includes(d));
         if (isRootMatch) score += 100;
         else if (isAts) score += 80;
         else score += 10;
       } else {
         const isAts = atsDomains.some(d => linkHost.includes(d));
         score = isAts ? 80 : 50;
       }

       return { link, score, valid: true };
    });

    const uniqueLinks: JobLink[] = [];
    const seen = new Set<string>();
    scoredLinks
      .filter(item => item.valid)
      .sort((a, b) => b.score - a.score)
      .forEach(item => {
        if (!seen.has(item.link.uri) && uniqueLinks.length < limit) {
          seen.add(item.link.uri);
          uniqueLinks.push({ title: item.link.title, uri: item.link.uri });
        }
      });

    return { text, links: uniqueLinks };
  } catch (error) {
    if (checkForGeminiError(error)) {
      throw new Error(`Search Error: ${error.message || "Quota/Billing error during search."}`);
    }
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
    applyUrl: { type: Type.STRING, description: "The direct URL to the application form page." }
  },
  required: ["personalInfo", "responses"]
};

export const generateApplicationData = async (resume: InputData, jobTitle: string, jobUri: string): Promise<ApplicationData> => {
  const ai = getClient();
  const prompt = `
    Prepare job application content for: "${jobTitle}" at ${jobUri}.
    Analyze the job requirements and match against the candidate's resume below.
    Generate a tailored cover letter, role motivations, and experience summary.
    Output must be JSON.
  `;

  const parts: any[] = [{ text: prompt }, { text: "\n\nCANDIDATE RESUME:" }];
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
    if (checkForGeminiError(error)) {
      throw new Error(`Drafting Error: ${error.message || "Quota/Billing error during content generation."}`);
    }
    console.error("Application Gen Error:", error);
    throw error;
  }
};