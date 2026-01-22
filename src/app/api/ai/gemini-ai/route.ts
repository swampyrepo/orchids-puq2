import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEYS = [
  "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",
  "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",
  "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",
  "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",
  "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",
];

let currentKeyIndex = 0;

function getNextApiKey(): string {
  const key = GROQ_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
  return key;
}

const GEMINI_SYSTEM_PROMPT = `You are Gemini, a large language model created by Google. You are helpful, harmless, and honest. You can assist with a wide variety of tasks including:
- Answering questions and providing information
- Creative writing and brainstorming
- Code assistance and debugging
- Analysis and problem-solving
- Language translation
- Math and calculations

Always be respectful, accurate, and provide detailed responses when appropriate. If you're unsure about something, acknowledge it honestly.`;

async function callGroqAPI(prompt: string, apiKey: string, conversationHistory?: Array<{ role: string; content: string }>) {
  const messages = [
    { role: "system", content: GEMINI_SYSTEM_PROMPT },
    ...(conversationHistory || []),
    { role: "user", content: prompt }
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

async function callWithRetry(prompt: string, conversationHistory?: Array<{ role: string; content: string }>, maxRetries = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextApiKey();
    
    try {
      const result = await callGroqAPI(prompt, apiKey, conversationHistory);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt + 1} failed with key index ${(currentKeyIndex - 1 + GROQ_API_KEYS.length) % GROQ_API_KEYS.length}:`, error);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error("All API attempts failed");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get("prompt");
    const history = searchParams.get("history");

    if (!prompt) {
      return new Response(JSON.stringify({
        status: false,
        creator: "Vallzx",
        error: "Parameter 'prompt' is required",
        usage: {
          endpoint: "/api/ai/gemini-ai",
          params: {
            prompt: "Your question or message (required)",
            history: "JSON array of previous messages (optional)"
          },
          example: "/api/ai/gemini-ai?prompt=Hello, how are you?"
        }
      }, null, 2), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let conversationHistory: Array<{ role: string; content: string }> | undefined;
    
    if (history) {
      try {
        conversationHistory = JSON.parse(history);
      } catch {
        return new Response(JSON.stringify({
          status: false,
          creator: "Vallzx",
          error: {
            message: "Invalid 'history' parameter. Must be a valid JSON array.",
            type: "invalid_request_error",
            code: "INVALID_HISTORY"
          }
        }, null, 2), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const result = await callWithRetry(prompt, conversationHistory);
    
    const responseText = result.choices?.[0]?.message?.content || "";
    
    return new Response(JSON.stringify({
      status: true,
      creator: "Vallzx",
      model: "gemini-3-pro",
      data: {
        response: responseText,
        prompt: prompt,
        usage: {
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0
        },
        finish_reason: result.choices?.[0]?.finish_reason || "stop"
      }
    }, null, 2), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Gemini AI Error:", error);
    
    return new Response(JSON.stringify({
      status: false,
      creator: "Vallzx",
      error: {
        message: error instanceof Error ? error.message : "Internal server error",
        type: "api_error",
        code: "GEMINI_AI_ERROR"
      }
    }, null, 2), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return new Response(JSON.stringify({
        status: false,
        creator: "Vallzx",
        error: {
          message: "Invalid JSON body. Please provide a valid JSON request body.",
          type: "invalid_request_error",
          code: "INVALID_JSON"
        }
      }, null, 2), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const { prompt, history } = body;

    if (!prompt) {
      return new Response(JSON.stringify({
        status: false,
        creator: "Vallzx",
        error: {
          message: "Parameter 'prompt' is required in request body",
          type: "invalid_request_error",
          code: "MISSING_PARAMETER"
        },
        usage: {
          endpoint: "/api/ai/gemini-ai",
          method: "POST",
          body: {
            prompt: "Your question or message (required)",
            history: "Array of previous messages (optional)"
          }
        }
      }, null, 2), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await callWithRetry(prompt, history);
    
    const responseText = result.choices?.[0]?.message?.content || "";
    
    return new Response(JSON.stringify({
      status: true,
      creator: "Vallzx",
      model: "gemini-3-pro",
      data: {
        response: responseText,
        prompt: prompt,
        usage: {
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0
        },
        finish_reason: result.choices?.[0]?.finish_reason || "stop"
      }
    }, null, 2), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Gemini AI Error:", error);
    
    return new Response(JSON.stringify({
      status: false,
      creator: "Vallzx",
      error: {
        message: error instanceof Error ? error.message : "Internal server error",
        type: "api_error",
        code: "GEMINI_AI_ERROR"
      }
    }, null, 2), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
