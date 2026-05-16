import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { CustomLayer } from "@/lib/customLayers";
import { DEFAULT_LAYER_COLOUR } from "@/lib/customLayers";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([], {
      headers: { "X-Aurora-Warning": "DATABASE_URL not configured" },
    });
  }

  try {
    const result = await query<CustomLayer>(
      `SELECT id, name, description, color, created_at, updated_at
       FROM custom_layers
       ORDER BY created_at ASC`,
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[/api/custom-layers GET]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  let body: { name?: string; description?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const color =
    typeof body.color === "string" && body.color.trim()
      ? body.color.trim()
      : DEFAULT_LAYER_COLOUR;

  try {
    const result = await query<CustomLayer>(
      `INSERT INTO custom_layers (name, description, color)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, color, created_at, updated_at`,
      [name, body.description ?? null, color],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("[/api/custom-layers POST]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
