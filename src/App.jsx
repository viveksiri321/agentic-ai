import { useState } from 'react'
import mammoth from 'mammoth/mammoth.browser'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './App.css'

GlobalWorkerOptions.workerSrc = pdfWorker

const REQUEST_TEMPLATES = [
  {
    label: 'Agentic',
    prompt: 'Use an agentic multi-step workflow with planning, step-by-step execution, and final reflection.',
  },
]


const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
])

const SYSTEM_RULES = `You are an advanced Agentic AI Document Analyzer.

Rules:
1. Always base your answer strictly on the content of the document.
2. Analyze user intent and generate the appropriate output.
3. Follow requested output formats: summary, abstract, introduction, conclusion, key points, explanation, table, graph/chart, or question answering.
4. If asked something not directly present, infer logically from the document.
5. Produce structured and clean responses.
6. Never hallucinate facts outside the document.`

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length

const fetchGroqText = async ({
  apiKey,
  prompt,
  maxOutputTokens = 1400,
  messages,
  model = 'llama-3.3-70b-versatile',
  temperature = 0.2,
}) => {
  const requestMessages = messages ?? [{ role: 'user', content: prompt }]

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: requestMessages,
        temperature,
        top_p: 0.9,
        max_tokens: maxOutputTokens,
      }),
    },
  )

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const message = errData?.error?.message ?? 'Groq API request failed.'
    throw new Error(message)
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content?.trim() ?? ''

  if (!text) {
    throw new Error('No response text received from Groq.')
  }

  return text
}

const runAgenticWorkflow = async ({
  apiKey,
  documentText,
  userRequest,
  setAgenticSteps,
  setAgenticResults,
  setOutput,
  setError,
  setLoading,
}) => {
  try {
    setLoading(true)
    setAgenticResults([])
    setAgenticSteps([])
    setOutput('')

    const results = []

    // Step 0: Planning
    console.log('[Agentic] Step 0: Create step-by-step plan based on user request...')
    const planStep = 'Step 0: Create step-by-step execution plan based on user request'
    setAgenticSteps([planStep, 'Step 1: Choose analysis type (summarization, keyword extraction, or deep analysis)', 'Step 2: Analyze document and extract insights', 'Step 3: Synthesize findings', 'Step 4: Iterative review for quality assurance'])

    const planPrompt = `You are a strategic planning AI.

User Request: ${userRequest}

Document length: ${documentText.length} characters

Create a detailed step-by-step execution plan:
1. What is the core objective?
2. What analysis type is most suitable?
3. What sections of the document are most relevant?
4. What quality criteria should the final answer meet?

Be concise and actionable.`

    const executionPlan = await fetchGroqText({
      apiKey,
      prompt: planPrompt,
      maxOutputTokens: 600,
      temperature: 0.3,
    })

    results.push({
      stepNum: 0,
      step: planStep,
      result: executionPlan,
    })
    setAgenticResults([...results])

    // Step 1: Choose Analysis Type
    console.log('[Agentic] Step 1: Choose analysis type...')
    const analysisTypePrompt = `You are an analysis optimizer.

User Request: ${userRequest}

Execution Plan:
${executionPlan}

Based on the request and plan, choose the best analysis approach:
1. SUMMARIZATION - for condensing key information
2. KEYWORD EXTRACTION - for identifying main topics/entities
3. DEEP ANALYSIS - for comprehensive investigation and insights

Output ONLY the chosen type and brief justification (one sentence).`

    const chosenAnalysisType = await fetchGroqText({
      apiKey,
      prompt: analysisTypePrompt,
      maxOutputTokens: 300,
      temperature: 0.3,
    })

    results.push({
      stepNum: 1,
      step: 'Step 1: Choose analysis type (summarization, keyword extraction, or deep analysis)',
      result: chosenAnalysisType,
    })
    setAgenticResults([...results])

    // Step 2: Document Analysis
    console.log('[Agentic] Step 2: Analyze document...')
    const analysisPrompt = `You are an expert document analyst.

User Request: ${userRequest}

Execution Plan:
${executionPlan}

Analysis Approach:
${chosenAnalysisType}

Document:
${documentText}

Perform the chosen analysis:
1. Identify the most relevant sections
2. Extract critical insights that address the user request
3. Note important patterns, gaps, or contradictions
4. Provide clear, actionable findings

Be thorough and precise.`

    const documentAnalysis = await fetchGroqText({
      apiKey,
      prompt: analysisPrompt,
      maxOutputTokens: 1200,
      temperature: 0.4,
    })

    results.push({
      stepNum: 2,
      step: 'Step 2: Analyze document and extract insights',
      result: documentAnalysis,
    })
    setAgenticResults([...results])

    // Step 3: Synthesis
    console.log('[Agentic] Step 3: Synthesize findings...')
    const synthesisPrompt = `You are an AI assistant refining the analysis into final deliverables.

User Request:
${userRequest}

Analysis:
${documentAnalysis}

Synthesize the analysis into:
1. 2-3 key points
2. 2-3 actionable recommendations
3. Clear final conclusion

Format:

Key Points:
- 

Recommendations:
- 

Final Conclusion:`

    const synthesizedOutput = await fetchGroqText({
      apiKey,
      prompt: synthesisPrompt,
      maxOutputTokens: 1000,
      temperature: 0.3,
    })

    results.push({
      stepNum: 3,
      step: 'Step 3: Synthesize findings',
      result: synthesizedOutput,
    })
    setAgenticResults([...results])

    // Step 4: Iterative Review for Quality
    console.log('[Agentic] Step 4: Iterative review for quality assurance...')
    let finalReviewedOutput = synthesizedOutput
    let reviewIteration = 1
    const maxReviewIterations = 2

    while (reviewIteration <= maxReviewIterations) {
      const reviewPrompt = `You are a quality reviewer AI. Review iteration ${reviewIteration}.

Check the following answer:
${finalReviewedOutput}

Document reference:
${documentText}

Verify:
1. Is it fully based on the document and user request?
2. Are there any incorrect or missing points?
3. Is clarity adequate? Any ambiguities?
4. Does it meet professional quality standards?

If quality is high, output: "QUALITY: APPROVED" followed by the answer unchanged.
If improvements needed, output: "QUALITY: NEEDS IMPROVEMENT" followed by the improved version.`

      const reviewResult = await fetchGroqText({
        apiKey,
        prompt: reviewPrompt,
        maxOutputTokens: 1000,
        temperature: 0.2,
      })

      if (reviewResult.includes('QUALITY: APPROVED') || reviewIteration >= maxReviewIterations) {
        finalReviewedOutput = reviewResult.replace('QUALITY: APPROVED', '').trim()
        console.log(`[Agentic] Review complete at iteration ${reviewIteration}`)
        break
      } else {
        finalReviewedOutput = reviewResult.replace('QUALITY: NEEDS IMPROVEMENT', '').trim()
        reviewIteration += 1
      }
    }

    results.push({
      stepNum: 4,
      step: 'Step 4: Iterative review for quality assurance',
      result: `Review iterations completed: ${reviewIteration}`,
    })
    setAgenticResults([...results])
    setOutput(finalReviewedOutput)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Agentic workflow failed.')
    console.error('[Agentic Error]', err)
  } finally {
    setLoading(false)
  }
}

function App() {
  const [documentText, setDocumentText] = useState('')
  const [_uploadedFileName, setUploadedFileName] = useState('')
  const [customRequest, setCustomRequest] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agenticSteps, setAgenticSteps] = useState([])
  const [agenticResults, setAgenticResults] = useState([])

  const templatePrompt = REQUEST_TEMPLATES[0].prompt ?? ''

  const handleRequestTypeChange = (event) => {
    setCustomRequest('')
    setError('')
    setOutput('')
  }

  const extractPdfText = async (arrayBuffer) => {
    const pdf = await getDocument({ data: arrayBuffer }).promise
    const pages = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (pageText) {
        pages.push(`Page ${pageNumber}: ${pageText}`)
      }
    }

    return pages.join('\n\n')
  }

  const extractDocxText = async (arrayBuffer) => {
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  }

  const handleFileUpload = async (event) => {
    setError('')

    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

    const isTextLike =
      file.type.startsWith('text/') ||
      ['application/json', 'application/xml', 'text/csv'].includes(file.type) ||
      /\.(txt|md|csv|json|xml)$/i.test(file.name)

    const isPdf = file.type === 'application/pdf' || extension === 'pdf'
    const isDocx =
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === 'docx'

    if (!isTextLike && !isPdf && !isDocx) {
      setError(
        'Unsupported file type. Please upload .txt, .md, .csv, .json, .xml, .pdf, or .docx files.',
      )
      return
    }

    try {
      let text = ''

      if (isPdf || isDocx) {
        const arrayBuffer = await file.arrayBuffer()
        if (isPdf) {
          text = await extractPdfText(arrayBuffer)
        } else {
          text = await extractDocxText(arrayBuffer)
        }
      } else {
        text = await file.text()
      }

      if (!text.trim()) {
        setError('No readable text found in this file.')
        return
      }

      setDocumentText(text)
      setUploadedFileName(file.name)
    } catch {
      setError('Could not read this file. Try another supported file.')
    }
  }

  const runAnalysis = async () => {
    setError('')
    setOutput('')
    setAgenticSteps([])
    setAgenticResults([])

    if (!documentText.trim()) {
      setError('Please upload the document text before analyzing.')
      return
    }

    if (!customRequest.trim()) {
      setError('Please enter your task description for Agentic mode.')
      return
    }

    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) {
      setError('Missing API key. Add VITE_GROQ_API_KEY in your .env file and restart the app.')
      return
    }

    await runAgenticWorkflow({
      apiKey,
      documentText,
      userRequest: customRequest,
      setAgenticSteps,
      setAgenticResults,
      setOutput,
      setError,
      setLoading,
    })
  }

  const handleCustomQuestionKeyDown = (event) => {
    if (loading) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      runAnalysis()
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Groq Powered</p>
        <h1>Agentic Document Analyzer</h1>
        <p className="subtitle">
          Paste any document, choose the output style, and get structured insights optimized for
          real-world desktop and mobile workflows.
        </p>
      </header>

      <section className="grid">
        <article className="panel input-panel">
          <h2>Input</h2>
          <label htmlFor="documentUpload">Upload document</label>
          <input
            id="documentUpload"
            type="file"
            accept=".txt,.md,.csv,.json,.xml,.pdf,.docx,text/plain,text/markdown,text/csv,application/json,application/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
          />

          <div className="row">
            <div>
              <label htmlFor="customRequest">Task description</label>
              <input
                id="customRequest"
                type="text"
                value={customRequest}
                onChange={(event) => setCustomRequest(event.target.value)}
                onKeyDown={handleCustomQuestionKeyDown}
                placeholder="Example: create a detailed analysis plan, execute it step-by-step, and summarize findings"
              />
            </div>
          </div>

          <button type="button" className="analyze-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? 'Processing...' : 'Run Agentic Processing'}
          </button>

          {error && <p className="message error">{error}</p>}
        </article>

        <article className="panel output-panel">
          <div className="panel-head">
            <h2>Output</h2>
            <span className="badge">Agentic Analysis</span>
          </div>

          {output && (
            <div style={{ marginBottom: '1rem' }}>
              <p className="message success">Analysis finished. Output is shown below.</p>
            </div>
          )}

          {!output && !loading && (
            <p className="placeholder">
              {'Upload a document and enter a task description to begin agentic analysis.'}
            </p>
          )}

          {agenticSteps.length > 0 && (
            <div className="agentic-section">
              <h3>📋 Execution Plan</h3>
              <ul className="agentic-steps-list">
                {agenticSteps.map((step, idx) => (
                  <li key={idx} className="agentic-step-item">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {agenticResults.length > 0 && (
            <div className="agentic-section">
              <h3>⚙️ Step-by-Step Results</h3>
              {agenticResults.map((result) => (
                <div key={`step-${result.stepNum}`} className="agentic-result">
                  <p className="agentic-result-step">{result.step}</p>
                  <pre className="agentic-result-content">{result.result}</pre>
                </div>
              ))}
            </div>
          )}

          {output && (
            <div className="agentic-section">
              <h3>🎯 Final Summary & Recommendations</h3>
              <pre className="agentic-final-output">{output}</pre>
            </div>
          )}

          {error && <p className="message error">{error}</p>}
        </article>
      </section>
    </main>
  )
}

export default App
