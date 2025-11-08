# prompt_pages_api

## How The Project Works

It is a "monorepo" that holds two main parts: the Python backend and a Chrome Extension.

### 1. The Backend

The backend is an API built with **FastAPI**.

- **Tech Stack:** We're using FastAPI for the server, LangChain to organize the AI logic, Groq for the fast LLM, and Cohere plus FAISS for vector search.
- **What it Does:** The API has two main jobs:
  - **`/summary`:** When you ask for a summary, this endpoint gets the URL, scrapes all the text, and passes it to the Groq LLM to get a quick summary back.
  - **`/qa`:** This is where the real AI magic happens. When you ask a question, it performs **Retrieval-Augmented Generation (RAG)**. In plain English, it:
    1.  Scrapes the page's text.
    2.  "Embeds" the text into a searchable FAISS vector store using Cohere.
    3.  Finds the most relevant chunks of text from the page that match your question.
    4.  Feeds _only_ those relevant chunks (plus your question) to the Groq LLM to get a smart, focused answer.
- **Caching:** To make sure it's fast and we're not re-scraping the same page, the API has an in-memory cache (`_cache`) that stores the summaries and vector stores for each URL. This makes all future requests for that same URL almost instant.
- **Key Files:**
  - `main.py`: The FastAPI server where all this logic lives.
  - `requirements.txt`: A "frozen" list of all Python packages and their exact versions, ensuring identical deployments on any system (like Render).
  - `render.yaml`: The config file we use to deploy this API to Render.com.
  - `.gitignore`: Tells Git to ignore sensitive files like `.env` (which holds our API keys) and cache folders like `__pycache__`.

---

### 2. The Frontend (`Extension/`)

The frontend is a Manifest V3 Chrome Extension that gives the user a friendly interface to work with the backend.

- **Tech Stack:** It’s built with standard **HTML, CSS, and vanilla JavaScript**, using `marked.js` for Markdown rendering and `highlight.js` for code syntax highlighting.
- **What it Does:**
  - It creates the UI you see in the Chrome side panel (`panel.html`).
  - The `popup.js` file is the logic. It listens for button clicks and uses `fetch` to talk to our backend API's `/summary` and `/qa` endpoints.
  - It takes the (Markdown-formatted) answers from the API and uses `marked.js` to render them nicely in the side panel.
- **Key Files:**
  - `manifest.json`: The heart of the extension. It tells Chrome what the extension is, what permissions it needs (like `sidePanel`), and where to find its files.
  - `panel.html`: The HTML skeleton for the side panel UI.
  - `popup.js`: Where all the frontend logic lives—handling user input, calling the API, and updating the HTML.
  - `styles.css`: Makes it all look good!
  - `background.js`: A service worker that allows the extension to be opened from the side panel.
  - `lib/`: A folder containing our local JavaScript/CSS libraries (`marked.js`, `highlight.js`). We host them locally to comply with Manifest V3's strict Content Security Policy, which blocks scripts from external CDNs.
  - `configure_marked.js`: A small setup file that configures the `marked.js` library. This was moved from an inline `<script>` tag in `panel.html` to also comply with the Content Security Policy.
