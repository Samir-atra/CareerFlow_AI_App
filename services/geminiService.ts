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

export const findRelevantJobs = async (keywords: string[], targetUrl: string, limit: number = 3): Promise<{ text: string, links: JobLink[] }> => {
  const ai = getClient();
  
  // 1. Prepare URL data for filtering
  let targetHost = '';
  let fullPath = '';
  
  try {
    const urlStr = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const urlObj = new URL(urlStr);
    // Hostname for strict domain filtering (e.g., 'linkedin.com')
    targetHost = urlObj.hostname.replace(/^www\./, ''); 
    fullPath = urlStr;
  } catch (e) {
    console.warn("Could not parse target URL", e);
    // Fallback: simple split
    targetHost = targetUrl.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    fullPath = targetUrl;
  }

  // Use a richer set of keywords for context
  const contextKeywords = keywords.slice(0, 8).join(', '); // Reduced count slightly to focus on most important
  
  // Refined prompt to be more agentic and robust, specifically targeting LEAF pages
  const prompt = `
    User Target URL (Collection Page): "${fullPath}"
    Target Domain: "${targetHost}"
    Candidate Skills: ${contextKeywords}

    **OBJECTIVE**: Find exactly ${limit} distinct "Leaf Page" job postings.
    
    **DEFINITIONS**:
    - **Collection Page**: A list of jobs, search results, or a generic careers landing page (e.g., "greenhouse.io/airbnb", "linkedin.com/jobs").
    - **Leaf Page**: A specific URL for a SINGLE job role where the candidate can read the description and apply (e.g., "greenhouse.io/airbnb/jobs/4821234", "linkedin.com/jobs/view/99999").

    **INSTRUCTIONS**:
    1.  **Search Strategy**: Use Google Search. Look for URLs on the Target Domain that follow "leaf" patterns (containing IDs, "view", "position", "jobs/").
    2.  **Query Construction**: 
        - Use 'site:${targetHost}' AND ("job" OR "career") AND ("${keywords[0]}" OR "${keywords[1]}").
        - Exclude lists: -intitle:"Careers at" -intitle:"Jobs at" -inurl:search -inurl:categories.
    3.  **Validation**:
        - The title of the page must sound like a specific role (e.g., "Senior React Engineer") NOT a generic page (e.g., "Engineering Careers").
        - The URL must be distinct from the User Target URL.

    **OUTPUT**:
    - Return the Google Search grounding metadata for these specific job pages.
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

    // Define patterns for invalid or "not found" pages
    // Expanded to catch more "Collection" type pages that slip through
    const badTitlePatterns = [
      /not found/i,
      /error/i,
      /404/i,
      /job closed/i,
      /closed job/i,
      /expired/i,
      /no longer available/i,
      /job filled/i,
      /access denied/i,
      /login/i,
      /sign in/i,
      /privacy policy/i,
      /terms of service/i,
      /search results/i,
      /^jobs at/i, // Starts with "Jobs at" -> usually a landing page
      /^careers at/i, // Starts with "Careers at" -> usually a landing page
      /view all jobs/i,
      /open positions/i,
      /browse jobs/i
    ];

    // Helper to normalize URLs for comparison
    const normalize = (u: string) => u.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '');
    const normalizedFullPath = normalize(fullPath);

    // 3. Filter: Keep links that belong to the target host and pass title validation
    const filteredLinks = links.filter(link => {
       // A. Hostname Validation
       let hostMatch = false;
       if (!targetHost) {
         hostMatch = true;
       } else {
         try {
           const linkUrl = new URL(link.uri);
           const linkHost = linkUrl.hostname.replace(/^www\./, '');
           hostMatch = linkHost.includes(targetHost) || targetHost.includes(linkHost);
         } catch {
           hostMatch = false;
         }
       }
       if (!hostMatch) return false;

       // B. Title Validation
       if (badTitlePatterns.some(pattern => pattern.test(link.title))) {
         return false;
       }
       
       // C. Self-Reference / Collection Page Validation
       const normalizedLink = normalize(link.uri);
       if (normalizedLink === normalizedFullPath) return false;
       
       // Heuristic: Leaf pages usually have longer paths than the collection root (if under same domain)
       // This prevents returning the board root again.
       if (normalizedLink.startsWith(normalizedFullPath) && normalizedLink.length <= normalizedFullPath.length + 1) {
          return false;
       }

       return true;
    });

    // Deduplicate
    const uniqueLinks = Array.from(new Map(filteredLinks.map(item => [item.uri, item])).values());

    return { text, links: uniqueLinks.slice(0, limit) };
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
    }
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