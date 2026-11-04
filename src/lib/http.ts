import { ZodError } from "zod";
import { AppError } from "./errors";
import { captureException } from "./log";

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  }
  if (error instanceof AppError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  void captureException(error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
