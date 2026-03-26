# Agentic Document Analyzer (React + Groq)

A real-world responsive document analyzer built with React and Vite.
It accepts document text, understands the requested output format (summary, abstract, table, chart-ready data, etc.), and generates responses using Groq.

## Features

- Desktop and mobile responsive UI
- Multiple output modes: Classification (paper field detection), Summary, Abstract, Introduction, Conclusion, Key Points, Explanation, Section Wise, Table, Graph/Chart, Q&A, and Custom
- Groq API integration
- Structured output panel for clean reading
- Error handling for missing API key and API response issues

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
copy .env.example .env
```

3. Open `.env` and set your Groq API key:

```env
VITE_GROQ_API_KEY=your_actual_key
```

4. Run development server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- This app calls the Groq API directly from the frontend using the key from `VITE_GROQ_API_KEY`.
- For production, consider moving API calls to a backend service to avoid exposing keys in client environments.
