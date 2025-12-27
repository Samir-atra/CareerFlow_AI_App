# CareerFlow AI 🚀

**CareerFlow AI** is an intelligent, browser-based career assistant powered by Google's Gemini 3 Flash model. It streamlines the job application process by analyzing your credentials, finding relevant opportunities across major tech companies, and generating tailored application content instantly.

## 🌟 Key Features

### 1. **AI Document Analysis**
*   **Multi-format Support**: Upload Resumes and Cover Letters in PDF, DOCX, or plain text.
*   **Deep Insight**: Extracts professional summaries, technical/soft skills, and key achievements.
*   **Match Analysis**: Checks consistency between your resume and cover letter.
*   **Keyword Optimization**: Generates a list of high-value keywords for ATS optimization.

### 2. **Intelligent Job Search**
The app utilizes a "Waterfall" priority search engine to find the best roles for you:
1.  **User Target**: If you provide a specific career page URL (e.g., `jobs.netflix.com`), it scans that first.
2.  **Preset Giants**: Automatically searches **Google, Microsoft, Apple, and OpenAI** career pages.
3.  **Open Search**: Falls back to a broad search across the web using your unique skill keywords.

### 3. **Smart Actions**
*   **Instant Deep Links**: Generates one-click search links for LinkedIn, Google Jobs, and Indeed based on your analyzed profile.
*   **Application Drafting**: Click "Draft Responses" on any found job to generate a specific **Cover Letter**, **"Why This Role?"** answer, and **Experience Summary** tailored to that exact job description.

## 🛠️ Technology Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI Engine**: Google Gemini API (`gemini-3-flash-preview`)
*   **Visualization**: Recharts for skill data
*   **Document Parsing**: Mammoth.js (DOCX), Native PDF handling
*   **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
*   A valid **Google Gemini API Key**.
*   Node.js environment (if running locally) or a web server.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/careerflow-ai.git
    cd careerflow-ai
    ```

2.  **Environment Setup**:
    Ensure the `API_KEY` environment variable is accessible to the application process.

3.  **Run the Application**:
    The entry point is `index.html`. If using a bundler like Vite or Parcel:
    ```bash
    npm install
    npm start
    ```

## 💡 Usage Guide

1.  **Upload**: Paste text or upload your Resume and Cover Letter.
2.  **Target**: (Optional) Enter a specific company's career page URL.
3.  **Analyze**: Click "Analyze & Find Jobs".
4.  **Review**: Check your skill breakdown and the aggregated list of job openings.
5.  **Apply**: Use the "Draft Responses" button to generate copy-paste ready answers for application forms.

## 🔒 Privacy & Security

*   **Client-Side Processing**: Document text is processed in memory and sent directly to the Gemini API.
*   **No Database**: No personal data is stored persistently on any server.

---
*Built with ❤️ using Google Gemini.*