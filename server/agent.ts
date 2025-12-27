import { BrowserUseClient } from "browser-use-sdk";

export async function runAgent(url: string, candidateData: any, apiKey: string) {
  console.log(`[Agent] Initializing BrowserUseClient for ${url}...`);

  const client = new BrowserUseClient({ apiKey: apiKey });

  const prompt = `
    GOAL: Fill the job application form at the URL below.
    URL: ${url}

    CANDIDATE DATA:
    - Full Name: ${candidateData.fullName}
    - Email: ${candidateData.email}
    - Phone: ${candidateData.phone}
    - LinkedIn: ${candidateData.linkedin}
    - Website: ${candidateData.website}
    
    RESPONSES:
    - "Why do you want this job?": ${candidateData.responses?.whyThisRole || ''}
    - "Relevant Experience": ${candidateData.responses?.relevantExperience || ''}
    - "Salary Expectations": ${candidateData.responses?.salaryExpectation || ''}
    - "Cover Letter": ${candidateData.responses?.coverLetter || ''}

    INSTRUCTIONS:
    1. Navigate to the URL.
    2. Detect form fields corresponding to the Candidate Data.
    3. Fill in the fields with the provided data.
    4. If a field is not explicitly provided, leave it blank or select 'Decline to self-identify' if required.
    5. Do NOT submit the form. Just fill it out so the user can review.
    6. Return a summary of which fields were successfully filled.
  `;

  try {
    const task = await client.tasks.createTask({
      task: prompt,
      llm: "browser-use-llm"
    });

    console.log(`[Agent] Task created: ${task.id}. Executing...`);
    const result = await task.complete();
    console.log(`[Agent] Task complete.`);
    
    return result;
  } catch (error) {
    console.error("[Agent] Execution failed:", error);
    throw error;
  }
}