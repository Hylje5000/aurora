import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { id, fid } = await params;

  let body: {
    name?: string;
    description?: string;
    color?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (typeof body.name === "string") {
    updates.push(`name = $${idx++}`);
    values.push(body.name);
  }
  if (typeof body.description === "string") {
    updates.push(`description = $${idx++}`);
    values.push(body.description);
  }
  if (typeof body.color === "string" && body.color.trim()) {
    updates.push(`color = $${idx++}`);
    values.push(body.color.trim());
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(fid, id);

  try {
    const result = await query(
      `UPDATE custom_features
       SET ${updates.join(", ")}
       WHERE id = $${idx++} AND layer_id = $${idx}
       RETURNING id`,
      values,
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }
    return NextResponse.json({ id: result.rows[0].id });
  } catch (err) {
    console.error("[/api/custom-layers/[id]/features/[fid] PUT]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { id, fid } = await params;

  try {
    const result = await query(
      `DELETE FROM custom_features WHERE id = $1 AND layer_id = $2 RETURNING id`,
      [fid, id],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[/api/custom-layers/[id]/features/[fid] DELETE]", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}
