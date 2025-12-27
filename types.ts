export enum SkillType {
  TECHNICAL = 'Technical',
  SOFT = 'Soft',
  DOMAIN = 'Domain'
}

export interface Skill {
  name: string;
  score: number; // 0-100
  type: SkillType;
}

export interface AnalysisResult {
  professionalSummary: string;
  topSkills: Skill[];
  keywords: string[];
  keyInsights: string[];
  matchAnalysis: string;
}

export interface InputData {
  mimeType: string; // 'text/plain' or 'application/pdf'
  data: string; // raw text string OR base64 encoded string
  fileName?: string;
}

export interface DocumentInput {
  resume: string;
  coverLetter: string;
}

export interface JobLink {
  title: string;
  uri: string;
}

export interface ApplicationData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    website: string;
  };
  responses: {
    coverLetter: string;
    whyThisRole: string;
    relevantExperience: string;
    salaryExpectation: string;
  };
}

export enum AnalysisStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  SUCCESS = 'success',
  ERROR = 'error'
}