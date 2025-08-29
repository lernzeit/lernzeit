import { config, GEMINI_CONFIG, GENERATION_CONSTANTS } from "../config.ts";
import { logger } from "../utils/logger.ts";
import { getRandomSystemPrompt } from "../utils/curriculum.ts";
import { optimizeGeminiRequest } from "../utils/performance.ts";
import type { GenerationConfig, ProblemRequest } from "../types.ts";

export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.apiKey = config.geminiApiKey;
    this.baseUrl = GEMINI_CONFIG.BASE_URL;
  }

  // Generate problems using function calling for structured output
  async generateProblems(
    request: ProblemRequest,
    prompt: string,
    requestId: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const generationConfig = this.createGenerationConfig(request);
      const systemPrompt = getRandomSystemPrompt();
      
      logger.info('Starting Gemini API call', {
        requestId,
        category: request.category,
        grade: request.grade,
        count: request.count,
        temperature: generationConfig.temperature,
        seed: generationConfig.seed
      });

      const functionDeclaration = this.createFunctionDeclaration();
      const apiUrl = `${this.baseUrl}/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${this.apiKey}`;
      
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n${prompt}\n\nErstelle ${request.count} parametrisierte Aufgaben-Templates für ${request.category}, Klasse ${request.grade}.

ERFORDERLICHE TEMPLATE-AUSGABE pro Aufgabe:
- student_prompt: Fragetext mit {{parameter}} Platzhaltern
- parameter_definitions: {"param": {"type": "number|string", "range": [min,max], "values": ["opt1","opt2"]}}
- calculation_logic: Berechnungsformel (z.B. "{{a}} * {{b}}")  
- solution: Antwort-Struktur mit Einheiten
- distractors: Array typischer Schülerfehler
- explanation: Lösungsweg mit Parameter-Platzhaltern

Session ID: ${request.sessionId || 'unknown'}`
              }
            ]
          }
        ],
        tools: [
          {
            function_declarations: [functionDeclaration]
          }
        ],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: [GEMINI_CONFIG.FUNCTION_NAME]
          }
        },
        generation_config: {
          temperature: generationConfig.temperature,
          top_p: generationConfig.top_p,
          top_k: generationConfig.top_k,
          candidate_count: 1,
          max_output_tokens: generationConfig.max_output_tokens
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      };

      logger.debug('Gemini request body created', { requestId, bodySize: JSON.stringify(requestBody).length });

      // Add timeout to request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GENERATION_CONSTANTS.RESPONSE_TIMEOUT_MS);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error', {
          requestId,
          status: response.status,
          error: errorText,
          duration
        });
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.info('Gemini API response received', {
        requestId,
        duration,
        status: 'success'
      });

      return this.parseGeminiResponse(data, requestId);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Gemini API call failed', {
        requestId,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  // Create generation configuration with diversity parameters
  private createGenerationConfig(request: ProblemRequest): GenerationConfig {
    // Increase temperature and diversity based on excluded questions count
    const excludeCount = request.excludeQuestions?.length || 0;
    const baseTemperature = GENERATION_CONSTANTS.DEFAULT_TEMPERATURE;
    const temperatureBoost = Math.min(0.2, excludeCount * 0.02);
    
    return {
      temperature: Math.min(
        GENERATION_CONSTANTS.MAX_TEMPERATURE,
        baseTemperature + temperatureBoost
      ),
      top_p: GENERATION_CONSTANTS.DEFAULT_TOP_P + Math.min(0.05, excludeCount * 0.005),
      top_k: GENERATION_CONSTANTS.DEFAULT_TOP_K,
      candidate_count: 1,
      max_output_tokens: GENERATION_CONSTANTS.MAX_OUTPUT_TOKENS,
      seed: Math.floor(Math.random() * 1e9) // Random seed for diversity
    };
  }

  // Create function declaration for structured output
  private createFunctionDeclaration() {
    return {
      name: GEMINI_CONFIG.FUNCTION_NAME,
      description: "Generate educational problems with specific question types",
      parameters: {
        type: "object",
        properties: {
          problems: {
            type: "array",
            description: "Array of generated educational problems",
            items: {
              type: "object",
              properties: {
                questionType: {
                  type: "string",
                  enum: ["multiple-choice", "word-selection", "matching", "text-input"],
                  description: "Type of question for interactive learning"
                },
                question: {
                  type: "string",
                  description: "The main question text"
                },
                explanation: {
                  type: "string",
                  description: "Brief explanation of the correct answer"
                },
                // Parametrized template fields
                student_prompt: {
                  type: "string",
                  description: "Question text with {{parameter}} placeholders"
                },
                parameter_definitions: {
                  type: "object",
                  description: "Parameter definitions with types, ranges, and values"
                },
                calculation_logic: {
                  type: "string",  
                  description: "Mathematical formula for automatic answer calculation"
                },
                solution: {
                  type: "object",
                  description: "Expected answer structure with units"
                },
                distractors: {
                  type: "array",
                  items: { type: "string" },
                  description: "Common student errors as incorrect answers"
                },
                // Multiple choice specific  
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Answer options for multiple choice questions with units"
                },
                correctAnswer: {
                  type: "integer", 
                  description: "Index of correct answer for multiple choice (0-based)"
                },
                // Word selection specific
                sentence: {
                  type: "string",
                  description: "Sentence with selectable words"
                },
                selectableWords: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      word: { type: "string" },
                      isCorrect: { type: "boolean" },
                      index: { type: "integer" }
                    }
                  },
                  description: "Words that can be selected in the sentence"
                },
                // Matching specific
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      content: { type: "string" },
                      category: { type: "string" }
                    }
                  },
                  description: "Items to be matched"
                },
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      acceptsItems: {
                        type: "array",
                        items: { type: "string" }
                      }
                    }
                  },
                  description: "Categories for matching items"
                },
                // Text input specific
                answer: {
                  oneOf: [
                    { type: "string" },
                    { type: "number" }
                  ],
                  description: "Correct answer for text input questions"
                }
              },
              required: ["questionType", "question", "explanation", "student_prompt", "parameter_definitions", "calculation_logic"]
            }
          }
        },
        required: ["problems"]
      }
    };
  }

  // Parse Gemini response with function calling
  private parseGeminiResponse(data: any, requestId: string): any {
    try {
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error('No candidate in response');
      }

      // Check for function call response
      const functionCall = candidate.content?.parts?.[0]?.functionCall;
      if (functionCall && functionCall.name === GEMINI_CONFIG.FUNCTION_NAME) {
        logger.info('Function call response received', {
          requestId,
          functionName: functionCall.name
        });
        return functionCall.args;
      }

      // Fallback to text parsing if function calling fails
      const textContent = candidate.content?.parts?.[0]?.text;
      if (textContent) {
        logger.warn('Falling back to text parsing', { requestId });
        return this.parseTextResponse(textContent, requestId);
      }

      throw new Error('No usable content in response');

    } catch (error) {
      logger.error('Failed to parse Gemini response', {
        requestId,
        error: error.message
      });
      throw error;
    }
  }

  // Fallback text parsing method
  private parseTextResponse(content: string, requestId: string): any {
    try {
      // Remove markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Find JSON boundaries
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}') + 1;

      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd);
      }

      const parsed = JSON.parse(cleanContent);
      logger.info('Text parsing successful', {
        requestId,
        problemCount: parsed.problems?.length || 0
      });

      return parsed;

    } catch (error) {
      logger.error('Text parsing failed', {
        requestId,
        error: error.message,
        contentPreview: content.substring(0, 200)
      });
      return { problems: [] };
    }
  }

  // Retry mechanism for failed requests with performance optimization
  async generateProblemsWithRetry(
    request: ProblemRequest,
    prompt: string,
    requestId: string,
    maxRetries: number = GENERATION_CONSTANTS.MAX_RETRIES
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Generation attempt', { requestId, attempt, maxRetries });
        
        // Use optimized request for retries
        const result = await this.generateProblems(request, prompt, requestId);
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn('Generation attempt failed', {
          requestId,
          attempt,
          error: error.message
        });

        if (attempt < maxRetries) {
          // Shorter delay and jitter for faster recovery
          const baseDelay = Math.min(1000 * Math.pow(1.5, attempt - 1), 3000);
          const jitter = Math.random() * 500;
          const delay = baseDelay + jitter;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('All generation attempts failed', {
      requestId,
      attempts: maxRetries,
      finalError: lastError.message
    });

    throw lastError;
  }
}