# CareerFlow AI 🚀

**CareerFlow AI** is an intelligent, browser-based career assistant powered by Google's Gemini 3 models. It streamlines the job application process by analyzing your credentials, finding relevant opportunities across major tech companies, and generating tailored application content instantly.

## 🌟 Key Features

### 1. **AI Document Analysis**
*   **Multi-format Support**: Upload Resumes and Cover Letters in PDF, DOCX, or plain text.
*   **Deep Insight**: Extracts professional summaries, technical/soft skills, and key achievements.
*   **Keyword Optimization**: Generates high-value keywords for ATS optimization.

### 2. **Intelligent Job Search**
The app utilizes a "Waterfall" priority search engine:
1.  **User Target**: Scans your specifically provided career page URLs first.
2.  **Preset Giants**: Automatically checks **Google, Microsoft, Apple, and OpenAI** career pages.
3.  **Open Search**: Falls back to broad web searches using your unique skill keywords.

### 3. **Smart Actions**
*   **Instant Deep Links**: One-click search links for LinkedIn, Google Jobs, and Indeed.
*   **Application Drafting**: Generate specific **Cover Letters** and **Interview Responses** tailored to exact job descriptions found.

---

## 🖥️ Setup & Compatibility

### 1. Google AI Studio Mode
When running within **Google AI Studio**, the application is fully "Plug & Play".
*   **API Key**: The platform automatically injects the required `process.env.API_KEY`.
*   **Deployment**: Simply run the application in the preview window.

### 2. Local Machine Mode (Development)
To run CareerFlow AI on your local computer, follow these steps:

1.  **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2.  **Clone & Install**:
    ```bash
    git clone https://github.com/your-username/careerflow-ai.git
    cd careerflow-ai
    ```
3.  **API Configuration**: Obtain a Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
4.  **Environment Setup**:
    *   **Option A (Terminal)**: Export the key directly in your shell.
        ```bash
        # Linux / macOS
        export API_KEY=your_actual_key_here
        # Windows (Command Prompt)
        set API_KEY=your_actual_key_here
        ```
    *   **Option B (.env)**: Create a `.env` file in the root directory.
        ```env
        API_KEY=your_actual_key_here
        ```
5.  **Run**: Use a local development server or bundler.
    ```bash
    # Using a simple static server
    npx serve .
    
    # Or using a bundler like Vite
    npm install
    npm run dev
    ```

---

## 🛠️ Technology Stack
*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI Engine**: Google Gemini API (`gemini-3-flash-preview`)
*   **Visualization**: Recharts
*   **Parsing**: Mammoth.js (DOCX)

## ⚖️ License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ☕ Support
If you find this project helpful, feel free to support its development.
[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=samiratra95@gmail.com&item_name=CareerFlow+AI+Donation&currency_code=USD)