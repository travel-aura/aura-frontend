export async function GET() {
  return Response.json({ token: process.env.MAPBOX_TOKEN ?? "" });
}
