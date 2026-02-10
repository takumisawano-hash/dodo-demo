// ========================================
// DoDo App - AI Chat Edge Function
// Supabase Edge Function for secure AI API calls
// ========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Claude Models
const CLAUDE_MODELS = {
  HAIKU: "claude-3-haiku-20240307",
  SONNET: "claude-3-5-sonnet-20241022",
};

// メッセージの複雑さに応じてモデルを自動選択
function selectModel(userMessage: string, historyLength: number): string {
  const messageLength = userMessage.length;
  
  const isComplex = 
    messageLength > 300 ||
    historyLength > 8 ||
    /計画|プラン|分析|詳し|教えて.*方法|どうすれば|なぜ|理由/i.test(userMessage) ||
    /plan|analyze|explain|how.*should|why|detail/i.test(userMessage);
  
  return isComplex ? CLAUDE_MODELS.SONNET : CLAUDE_MODELS.HAIKU;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  coachId: string;
  message: string;
  history?: ChatMessage[];
  systemPrompt?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get API key from environment
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Parse request
    const { coachId, message, history = [], systemPrompt }: RequestBody = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    // Select model based on complexity
    const model = selectModel(message, history.length);
    console.log(`[Chat] Using model: ${model} for coach: ${coachId}`);

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: systemPrompt || "You are a helpful AI coach.",
        messages: [
          ...history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", error);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || "";
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    return new Response(
      JSON.stringify({
        success: true,
        content,
        model,
        tokensUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
