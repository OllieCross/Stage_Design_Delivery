import { NextRequest } from "next/server";
import { serveFile } from "@/server/serve-file";

// Same as ../raw, but with a real filename/extension in the URL. drei's HDRI
// loader picks RGBELoader vs EXRLoader from the URL's file extension alone,
// so an extensionless URL can't be used for an environment map; [filename]
// itself is unused here, it's only there for the URL to end in ".hdr"/".exr".
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return serveFile(id, "inline");
}
