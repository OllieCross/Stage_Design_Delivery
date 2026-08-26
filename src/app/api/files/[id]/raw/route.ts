import { NextRequest } from "next/server";
import { serveFile } from "@/server/serve-file";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return serveFile(id, "inline");
}
