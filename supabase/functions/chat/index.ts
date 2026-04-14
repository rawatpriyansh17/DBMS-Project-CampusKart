// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  message: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

interface ChatResponse {
  reply: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables for chat function.");
}

if (!geminiApiKey) {
  throw new Error("Missing GEMINI_API_KEY for chat function.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, history = [] }: RequestBody = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          reply: "Please provide a valid message.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: supabaseAnonKey,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          reply: "Please sign in again to use the assistant.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const [profileResult, listingsResult, cartResult, ordersResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, location")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("listings")
        .select("title, price, category, condition, location, status, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("carts")
        .select("quantity")
        .eq("user_id", user.id),
      supabase
        .from("orders")
        .select("total_amount, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const activeListings = listingsResult.data ?? [];
    const categorySummary = activeListings.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});

    const userCartItems = cartResult.data ?? [];
    const userOrders = ordersResult.data ?? [];

    const marketplaceContext = {
      user: {
        id: user.id,
        full_name: profileResult.data?.full_name ?? null,
        location: profileResult.data?.location ?? null,
        cart_items_count: userCartItems.reduce((sum, row) => sum + row.quantity, 0),
        recent_orders_count: userOrders.length,
      },
      listings: {
        active_count: activeListings.length,
        categories: categorySummary,
        latest: activeListings.slice(0, 8),
      },
      recent_orders: userOrders,
      warnings: [
        profileResult.error?.message,
        listingsResult.error?.message,
        cartResult.error?.message,
        ordersResult.error?.message,
      ].filter(Boolean),
    };

    const recentConversation = history
      .slice(-8)
      .map((item) => `${item.role}: ${item.content}`)
      .join("\n");

    const prompt = `You are CampusKart assistant for a college marketplace.

Use the database context below to answer accurately. Mention specific categories and current marketplace availability when useful.
If user asks for data that is not in the context, say you do not have enough data.
Keep responses concise, practical, and student-friendly.

DATABASE CONTEXT (JSON):
${JSON.stringify(marketplaceContext)}

RECENT CHAT HISTORY:
${recentConversation || "(no prior context)"}

USER MESSAGE:
${message}`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 500,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const rawError = await geminiRes.text();
      console.error("Gemini API error", rawError);
      throw new Error(`Gemini request failed with status ${geminiRes.status}`);
    }

    const geminiData = (await geminiRes.json()) as GeminiResponse;
    const reply = geminiData.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();

    const finalReply =
      reply && reply.length > 0
        ? reply
        : "I could not generate a response right now. Please try asking again.";

    const response: ChatResponse = {
      reply: finalReply,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);

    return new Response(
      JSON.stringify({
        reply: "Sorry, I encountered an error processing your message. Please try again.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
