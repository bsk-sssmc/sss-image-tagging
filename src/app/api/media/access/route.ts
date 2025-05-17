// src/app/api/media/access/route.ts
export async function POST(req: Request) {
    // You can add real access logic here if needed
    return new Response(JSON.stringify({ access: true }), { status: 200 });
  }