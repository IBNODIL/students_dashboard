import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import generator from "generate-password";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

async function getNextUserNumber(prisma: ReturnType<typeof getPrisma>, role: Role) {
  const counterFieldMap: Record<Role, string> = {
    SUPERADMIN: "nextSuperAdmin",
    ADMIN: "nextAdmin",
    TEACHER: "nextTeacher",
    STUDENT: "nextStudent",
  };

  const field = counterFieldMap[role];

  return prisma.$transaction(async (tx: { $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>; $queryRawUnsafe: <T>(query: string, ...args: unknown[]) => Promise<T>; systemCounter: { update: (args: unknown) => Promise<unknown> } }) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO "SystemCounter" ("id", "nextSuperAdmin", "nextAdmin", "nextTeacher", "nextStudent") VALUES (1, 10000001, 20000001, 30000001, 40000001) ON CONFLICT ("id") DO NOTHING`
    );

    const rows = await tx.$queryRawUnsafe<Array<{ value: number }>>(
      `SELECT "${field}" as "value" FROM "SystemCounter" WHERE "id" = 1 FOR UPDATE`
    );

    const currentValue = rows[0]?.value ?? 10000001;

    await tx.$executeRawUnsafe(
      `UPDATE "SystemCounter" SET "${field}" = ${currentValue + 1} WHERE "id" = 1`
    );

    return currentValue;
  });
}

interface CreateUserBody {
  email: string;
  name: string;
  role: Role;
  teacherId?: string;   // required when role === "TEACHER"
  studentId?: number;   // required when role === "STUDENT"
}


// ── Role permission matrix ────────────────────────────────────────────────────

const ALLOWED_TO_CREATE: Record<Role, Role[]> = {
  SUPERADMIN: ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"],
  ADMIN: ["TEACHER", "STUDENT"],
  TEACHER: [],
  STUDENT: [],
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma();

    // ── 1. Auth: get calling user's session ────────────────────────────────────
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Load caller's role from DB ──────────────────────────────────────────
    const caller = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          role: true,
        },
    });

    if (!caller) {
      return NextResponse.json({ error: "Caller not found" }, { status: 401 });
    }

    const callerRole = caller.role as Role;

    // ── 3. Parse + validate request body ──────────────────────────────────────
    let body: CreateUserBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, name, role, teacherId, studentId } = body;

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "email, name and role are required" },
        { status: 400 }
      );
    }

    const validRoles: Role[] = ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // ── 4. Permission check ────────────────────────────────────────────────────
    if (!ALLOWED_TO_CREATE[callerRole].includes(role)) {
      return NextResponse.json(
        {
          error: `A ${callerRole} cannot create a ${role} user. Allowed: ${ALLOWED_TO_CREATE[callerRole].join(", ") || "none"
            }`,
        },
        { status: 403 }
      );
    }

    // ── 5. Role-specific validation ────────────────────────────────────────────
    if (role === "TEACHER" && !teacherId) {
      return NextResponse.json(
        { error: "teacherId is required when creating a TEACHER user" },
        { status: 400 }
      );
    }

    if (role === "STUDENT" && studentId === undefined) {
      return NextResponse.json(
        { error: "studentId is required when creating a STUDENT user" },
        { status: 400 }
      );
    }

    // ── 6. Check linked records exist ─────────────────────────────────────────
    if (role === "TEACHER" && teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { id: true, user: { select: { id: true } } },
      });
      if (!teacher) {
        return NextResponse.json(
          { error: `Teacher with id "${teacherId}" not found` },
          { status: 404 }
        );
      }
      if (teacher.user) {
        return NextResponse.json(
          { error: `Teacher "${teacherId}" already has a linked user account` },
          { status: 409 }
        );
      }
    }

    if (role === "STUDENT" && studentId !== undefined) {
      const student = await prisma.student.findUnique({
        where: { studentId },
        select: { studentId: true, user: { select: { id: true } } },
      });
      if (!student) {
        return NextResponse.json(
          { error: `Student with id ${studentId} not found` },
          { status: 404 }
        );
      }
      if (student.user) {
        return NextResponse.json(
          { error: `Student ${studentId} already has a linked user account` },
          { status: 409 }
        );
      }
    }

    // ── 7. Check email is unique ───────────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: `Email "${email}" is already in use` },
        { status: 409 }
      );
    }

    // 8. Generate password
    const plainPassword = generator.generate({
      length: 12,
      numbers: true,
      uppercase: true,
      lowercase: true,
      symbols: true,
      strict: true,
    });

    // 9. Create the auth user using Better Auth
    const createdUser = await auth.api.signUpEmail({
      body: {
        email,
        password: plainPassword,
        name,
      },
    });

    // 10. Generate a unique user number safely
    const userNumber = await getNextUserNumber(prisma, role);

    // Update our extra fields
    const newUser = await prisma.user.update({
      where: {
        id: createdUser.user.id,
      },
      data: {
        role,
        active: true,
        userNumber,

        ...(role === "TEACHER"
          ? {
            teacherId,
          }
          : {}),

        ...(role === "STUDENT"
          ? {
            studentId,
          }
          : {}),
      },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        teacherId: true,
        studentId: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        targetUserId: newUser.id,
        action: "CREATE",

        description: `Created ${role} user ${newUser.userNumber} (${newUser.email})`,

        newData: {
          userNumber: newUser.userNumber,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          teacherId: newUser.teacherId,
          studentId: newUser.studentId,
        },

        ipAddress:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip"),

        userAgent: req.headers.get("user-agent"),
      },
    });

    // ── 10. Return new user + plain password (shown once only) ────────────────
    return NextResponse.json(
      {
        user: newUser,
        // ⚠️ Save this — it will NOT be retrievable again
        generatedPassword: plainPassword,
        message: "User created successfully. Share the generated password securely — it cannot be retrieved again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("FULL ERROR");
    console.dir(error, { depth: null });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ── GET: list users (SUPERADMIN sees all, ADMIN sees TEACHER/STUDENT only) ───

export async function GET(req: NextRequest) {
  const prisma = getPrisma();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const caller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
    },
  });

  if (!caller || (caller.role !== "SUPERADMIN" && caller.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const roleFilter = sp.get("role") as Role | null;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "20"));

  // ADMIN can only see TEACHER and STUDENT users
  const allowedRoles: Role[] =
    caller.role === "SUPERADMIN"
      ? ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"]
      : ["TEACHER", "STUDENT"];

  const roleWhere =
    roleFilter && allowedRoles.includes(roleFilter)
      ? [roleFilter]
      : allowedRoles;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: roleWhere } },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        active: true,
        deletedAt: true,
        deleteAfter: true,
        teacherId: true,
        studentId: true,
        createdAt: true,
        teacher: { select: { name: true } },
        student: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where: { role: { in: roleWhere } } }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  });
}
