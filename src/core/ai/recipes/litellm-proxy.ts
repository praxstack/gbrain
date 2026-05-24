import type { Recipe } from '../types.ts';

/**
 * LiteLLM proxy template. Users run LiteLLM in front of any provider
 * (Bedrock, Vertex, Azure, Fireworks, Together, DeepSeek, etc.) and point
 * gbrain at it via `LITELLM_BASE_URL`. The proxy normalizes to
 * OpenAI-compatible API.
 *
 * See docs/guides/litellm-proxy.md for the setup recipe.
 */
export const litellmProxy: Recipe = {
  id: 'litellm',
  name: 'LiteLLM Proxy (universal)',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'http://localhost:4000', // LiteLLM default
  auth_env: {
    required: [], // LITELLM_API_KEY is optional (users may run proxy unauthenticated locally)
    optional: ['LITELLM_BASE_URL', 'LITELLM_API_KEY'],
    setup_url: 'https://docs.litellm.ai/docs/proxy/quick_start',
  },
  touchpoints: {
    embedding: {
      // Models depend on the proxy's config; declare empties so wizard prompts user.
      models: [],
      user_provided_models: true, // v0.32 D8=A wire-through for the litellm hardcode
      default_dims: 0, // user must declare --embedding-dimensions explicitly
      cost_per_1m_tokens_usd: undefined,
      price_last_verified: '2026-04-20',
      // LiteLLM's batch capacity is determined by the backend it proxies;
      // no static cap to declare here. v0.32 (#779).
      no_batch_cap: true,
      // v0.34.1 (#875): LiteLLM can forward to multimodal providers (OpenAI,
      // Gemini, Voyage etc.). embedMultimodal routes openai-compatible
      // recipes through embedMultimodalOpenAICompat() — same /embeddings
      // endpoint as text, with content arrays carrying image_base64
      // entries. No multimodal_models allow-list: the user knows which of
      // their proxied models support multimodal; we trust the model id and
      // surface the provider's rejection (D12 dim-validation catches
      // mismatched-dim responses pre-storage).
      supports_multimodal: true,
    },
    // Prax custom 2026-05-24: chat touchpoint added to make brainstorm/lsd/think
    // reach LiteLLM-proxied chat completions (e.g. Bedrock Claude via LiteLLM
    // alias). LiteLLM's `/v1/chat/completions` endpoint is OpenAI-compatible
    // and forwards to whatever the user's litellm config.yaml maps each model
    // ID to (Bedrock, Vertex, OpenAI, Anthropic-direct, etc.). No model
    // whitelist: openai-compat tier accepts arbitrary IDs at runtime; the
    // proxy returns the actual model error if the ID is unknown.
    chat: {
      // Empty model list: LiteLLM's catalog is user-defined. Surface to the
      // wizard via user_provided_models; users pass `litellm:<their-alias>`.
      models: [],
      user_provided_models: true,
      supports_tools: true,
      // INFORMATIONAL: real gate is isAnthropicProvider() in
      // src/core/model-config.ts which hard-pins gbrain's subagent infra to
      // Anthropic-direct (stable tool_use_id across crashes/replays).
      // LiteLLM-proxied Anthropic is rejected at submit time regardless.
      supports_subagent_loop: false,
      // LiteLLM doesn't currently expose Anthropic prompt-caching headers
      // through the OpenAI-compat envelope (as of 2026-05). Conservative.
      supports_prompt_cache: false,
      // No max_context_tokens / cost_per_1m: depend entirely on which model
      // the user's LiteLLM is fronting. Let upstream errors surface.
      price_last_verified: '2026-05-24',
    },
  },
  setup_hint: 'Run LiteLLM (https://docs.litellm.ai) in front of any provider; set LITELLM_BASE_URL + pass --embedding-model litellm:<model> and --embedding-dimensions <N>.',
};
