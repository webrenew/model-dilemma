import { createOpenAI } from 'ai/openai'
import { createAnthropic } from 'ai/anthropic'
import { createGoogleGenerativeAI } from 'ai/google'
import { createMistral } from 'ai/mistral'
import { createCohere } from 'ai/cohere'
import { type experimental_Provider } from 'ai'

// Model provider configurations
export const providers = {
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  google: createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
  }),
  mistral: createMistral({
    apiKey: process.env.MISTRAL_API_KEY,
  }),
  cohere: createCohere({
    apiKey: process.env.COHERE_API_KEY,
  }),
  // Add more providers as needed
}

// Model definitions with provider mapping
export const AVAILABLE_MODELS = [
  // OpenAI Models
  { id: 'openai/gpt-4o', provider: 'openai', name: 'GPT-4o', cost_per_1k_input: 0.005, cost_per_1k_output: 0.015 },
  { id: 'openai/gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', cost_per_1k_input: 0.00015, cost_per_1k_output: 0.0006 },
  { id: 'openai/gpt-4-turbo', provider: 'openai', name: 'GPT-4 Turbo', cost_per_1k_input: 0.01, cost_per_1k_output: 0.03 },
  { id: 'openai/gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo', cost_per_1k_input: 0.0005, cost_per_1k_output: 0.0015 },
  
  // Anthropic Models
  { id: 'anthropic/claude-3-5-sonnet-20241022', provider: 'anthropic', name: 'Claude 3.5 Sonnet', cost_per_1k_input: 0.003, cost_per_1k_output: 0.015 },
  { id: 'anthropic/claude-3-opus-20240229', provider: 'anthropic', name: 'Claude 3 Opus', cost_per_1k_input: 0.015, cost_per_1k_output: 0.075 },
  { id: 'anthropic/claude-3-sonnet-20240229', provider: 'anthropic', name: 'Claude 3 Sonnet', cost_per_1k_input: 0.003, cost_per_1k_output: 0.015 },
  { id: 'anthropic/claude-3-haiku-20240307', provider: 'anthropic', name: 'Claude 3 Haiku', cost_per_1k_input: 0.00025, cost_per_1k_output: 0.00125 },
  
  // Google Models
  { id: 'google/gemini-1.5-pro', provider: 'google', name: 'Gemini 1.5 Pro', cost_per_1k_input: 0.00125, cost_per_1k_output: 0.005 },
  { id: 'google/gemini-1.5-flash', provider: 'google', name: 'Gemini 1.5 Flash', cost_per_1k_input: 0.000075, cost_per_1k_output: 0.0003 },
  { id: 'google/gemini-pro', provider: 'google', name: 'Gemini Pro', cost_per_1k_input: 0.0005, cost_per_1k_output: 0.0015 },
  
  // Mistral Models
  { id: 'mistral/mistral-large-latest', provider: 'mistral', name: 'Mistral Large', cost_per_1k_input: 0.003, cost_per_1k_output: 0.009 },
  { id: 'mistral/mistral-medium-latest', provider: 'mistral', name: 'Mistral Medium', cost_per_1k_input: 0.0015, cost_per_1k_output: 0.0045 },
  { id: 'mistral/mistral-small-latest', provider: 'mistral', name: 'Mistral Small', cost_per_1k_input: 0.0002, cost_per_1k_output: 0.0006 },
  { id: 'mistral/mistral-7b-instruct', provider: 'mistral', name: 'Mistral 7B', cost_per_1k_input: 0.00015, cost_per_1k_output: 0.00015 },
  { id: 'mistral/mixtral-8x7b-instruct', provider: 'mistral', name: 'Mixtral 8x7B', cost_per_1k_input: 0.0007, cost_per_1k_output: 0.0007 },
  
  // Cohere Models
  { id: 'cohere/command-r-plus', provider: 'cohere', name: 'Command R+', cost_per_1k_input: 0.003, cost_per_1k_output: 0.015 },
  { id: 'cohere/command-r', provider: 'cohere', name: 'Command R', cost_per_1k_input: 0.0005, cost_per_1k_output: 0.0015 },
  { id: 'cohere/command', provider: 'cohere', name: 'Command', cost_per_1k_input: 0.001, cost_per_1k_output: 0.002 },
  
  // Meta Llama Models (via Together AI, Replicate, or other providers)
  { id: 'meta/llama-3.1-405b-instruct', provider: 'together', name: 'Llama 3.1 405B', cost_per_1k_input: 0.009, cost_per_1k_output: 0.009 },
  { id: 'meta/llama-3.1-70b-instruct', provider: 'together', name: 'Llama 3.1 70B', cost_per_1k_input: 0.00088, cost_per_1k_output: 0.00088 },
  { id: 'meta/llama-3.1-8b-instruct', provider: 'together', name: 'Llama 3.1 8B', cost_per_1k_input: 0.00018, cost_per_1k_output: 0.00018 },
  { id: 'meta/llama-3-70b-instruct', provider: 'together', name: 'Llama 3 70B', cost_per_1k_input: 0.0009, cost_per_1k_output: 0.0009 },
  { id: 'meta/llama-3-8b-instruct', provider: 'together', name: 'Llama 3 8B', cost_per_1k_input: 0.0002, cost_per_1k_output: 0.0002 },
  
  // DeepSeek Models
  { id: 'deepseek/deepseek-chat', provider: 'deepseek', name: 'DeepSeek Chat', cost_per_1k_input: 0.00014, cost_per_1k_output: 0.00028 },
  { id: 'deepseek/deepseek-coder', provider: 'deepseek', name: 'DeepSeek Coder', cost_per_1k_input: 0.00014, cost_per_1k_output: 0.00028 },
  
  // xAI Models
  { id: 'xai/grok-beta', provider: 'xai', name: 'Grok Beta', cost_per_1k_input: 0.005, cost_per_1k_output: 0.015 },
  
  // Additional open models via Together AI
  { id: 'together/mixtral-8x22b-instruct', provider: 'together', name: 'Mixtral 8x22B', cost_per_1k_input: 0.00108, cost_per_1k_output: 0.00108 },
  { id: 'together/qwen-2-72b-instruct', provider: 'together', name: 'Qwen 2 72B', cost_per_1k_input: 0.0009, cost_per_1k_output: 0.0009 },
  { id: 'together/nous-hermes-2-mixtral-8x7b', provider: 'together', name: 'Nous Hermes 2 Mixtral', cost_per_1k_input: 0.0006, cost_per_1k_output: 0.0006 },
] as const

export type ModelId = typeof AVAILABLE_MODELS[number]['id']
export type ProviderId = typeof AVAILABLE_MODELS[number]['provider']

// Get model info by ID
export function getModelInfo(modelId: string) {
  return AVAILABLE_MODELS.find(m => m.id === modelId)
}

// Calculate cost for a model
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelInfo(modelId)
  if (!model) return 0
  
  const inputCost = (inputTokens / 1000) * model.cost_per_1k_input
  const outputCost = (outputTokens / 1000) * model.cost_per_1k_output
  
  return inputCost + outputCost
}

// Get provider for a model
export function getProvider(modelId: string): experimental_Provider | null {
  const model = getModelInfo(modelId)
  if (!model) return null
  
  const providerName = model.provider as keyof typeof providers
  return providers[providerName] || null
}

// Fallback chains for each provider
export const FALLBACK_CHAINS: Record<string, string[]> = {
  'anthropic/claude-3-5-sonnet-20241022': ['anthropic/claude-3-sonnet-20240229', 'anthropic/claude-3-haiku-20240307'],
  'anthropic/claude-3-opus-20240229': ['anthropic/claude-3-5-sonnet-20241022', 'anthropic/claude-3-haiku-20240307'],
  'openai/gpt-4o': ['openai/gpt-4o-mini', 'openai/gpt-3.5-turbo'],
  'openai/gpt-4-turbo': ['openai/gpt-4o', 'openai/gpt-3.5-turbo'],
  'google/gemini-1.5-pro': ['google/gemini-1.5-flash', 'google/gemini-pro'],
  'mistral/mistral-large-latest': ['mistral/mistral-medium-latest', 'mistral/mistral-small-latest'],
  'cohere/command-r-plus': ['cohere/command-r', 'cohere/command'],
  'meta/llama-3.1-405b-instruct': ['meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct'],
}