// import { auth } from "@/lib/auth";
// import { NextResponse } from "next/server";

// export async function GET() {
//   try {
//     const user = await auth.api.signUpEmail({
//       body: {
//         email: "admin@gmail.com",
//         password: "password_123456789",
//         name: "Admin",
//       },
//     });
//     return NextResponse.json({ message: "Admin yaratildi!", user });
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
