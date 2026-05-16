import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;

  try {
    const result = await query(
      `DELETE FROM custom_layers WHERE id = $1 RETURNING id`,
      [id],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[/api/custom-layers/[id] DELETE]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
