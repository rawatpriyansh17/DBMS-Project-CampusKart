import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  message: string;
}

interface ChatResponse {
  reply: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message }: RequestBody = await req.json();

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

    const reply = generateResponse(message.toLowerCase());

    const response: ChatResponse = {
      reply,
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

function generateResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Greeting responses
  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey")
  ) {
    return "Hello! 👋 Welcome to CampusKart. How can I help you today? You can ask me about browsing items, creating listings, managing your cart, or using any features.";
  }

  // Browse/Search related
  if (
    lowerMessage.includes("browse") ||
    lowerMessage.includes("search") ||
    lowerMessage.includes("find items")
  ) {
    return "Great question! To browse items, click the 'Browse' button in the navigation bar. You can search by keyword, filter by category (Electronics, Books, Furniture, etc.), condition (New, Like New, Good, Fair), and price range. Just type in the search box and adjust the filters to find exactly what you're looking for!";
  }

  // Selling/Creating listings
  if (
    lowerMessage.includes("sell") ||
    lowerMessage.includes("create listing") ||
    lowerMessage.includes("post item")
  ) {
    return "Ready to sell? Click the 'Sell' button in the navigation. Fill in the item details:\n• Title and description\n• Price and category\n• Condition and your location\n• Add an image URL (optional)\nYour listing will be live immediately and visible to all students!";
  }

  // Cart related
  if (
    lowerMessage.includes("cart") ||
    lowerMessage.includes("add to cart") ||
    lowerMessage.includes("checkout")
  ) {
    return "You can add items to your cart by viewing a product and clicking 'Add to Cart'. View your cart by clicking the cart icon in the nav bar. Adjust quantities, remove items, and when ready, click 'Proceed to Checkout'. Your order will be created and you can view it in your Order History!";
  }

  // Order history
  if (
    lowerMessage.includes("order") ||
    lowerMessage.includes("history") ||
    lowerMessage.includes("purchase")
  ) {
    return "Click the 'Orders' button in the navigation to view your complete order history. You can see all your past purchases with details like order dates, items, quantities, and totals. Each order shows exactly what you bought and when!";
  }

  // Profile management
  if (
    lowerMessage.includes("profile") ||
    lowerMessage.includes("edit profile") ||
    lowerMessage.includes("account")
  ) {
    return "Visit your Profile page by clicking the profile icon in the nav. Here you can:\n• Edit your full name and location\n• Add/update your phone number\n• View all your listings\n• See your order history\nJust click 'Edit' to modify your information!";
  }

  // Categories
  if (lowerMessage.includes("categor")) {
    return "We have the following categories:\n• Electronics (phones, laptops, etc.)\n• Books (textbooks, novels, etc.)\n• Furniture (desks, chairs, etc.)\n• Clothing (apparel, accessories)\n• Sports (equipment, gear)\n• Other (miscellaneous items)\nUse filters to browse by category!";
  }

  // Pricing questions
  if (
    lowerMessage.includes("price") ||
    lowerMessage.includes("cost") ||
    lowerMessage.includes("how much")
  ) {
    return "Prices are set by individual sellers on CampusKart. You can filter items by price range in the search page. Items can be anything from free to any price the seller sets. Use the Min/Max price filters to find items in your budget!";
  }

  // Location related
  if (
    lowerMessage.includes("location") ||
    lowerMessage.includes("meeting") ||
    lowerMessage.includes("pickup")
  ) {
    return "Each item listing shows the seller's location on campus. When you're interested in an item, you can see where the seller is located. The specific meeting/pickup arrangements are usually made directly between buyer and seller through contact info!";
  }

  // Payment
  if (
    lowerMessage.includes("payment") ||
    lowerMessage.includes("pay") ||
    lowerMessage.includes("money")
  ) {
    return "CampusKart currently supports direct transactions. When you checkout, your order is recorded in your Order History. Payment arrangements between buyer and seller are typically handled directly (cash, Venmo, etc.). Always meet in safe, public locations on campus!";
  }

  // Help with features
  if (lowerMessage.includes("how do i") || lowerMessage.includes("how to")) {
    return "I can help you with:\n• Searching and browsing items\n• Creating and managing listings\n• Using the shopping cart\n• Checking orders and history\n• Managing your profile\n\nJust ask me about any of these features!";
  }

  // General help
  if (
    lowerMessage.includes("help") ||
    lowerMessage.includes("support") ||
    lowerMessage.includes("what can you do")
  ) {
    return "I'm your CampusKart assistant! I can help you with:\n✓ Browsing and searching for items\n✓ Creating and posting listings\n✓ Managing your shopping cart\n✓ Viewing order history\n✓ Profile management\n✓ General platform questions\n\nWhat would you like to know?";
  }

  // Default response
  return "That's a great question! I'm here to help with CampusKart features like browsing, selling, shopping, and managing your account. Feel free to ask me anything specific about how to use the platform!";
}
