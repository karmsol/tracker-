export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class AuthError extends AppError {
  constructor(message = "Sign in to continue") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to that") {
    super(message, 403, "forbidden");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We could not find that") {
    super(message, 404, "not_found");
  }
}

export class LimitError extends AppError {
  constructor(message: string) {
    super(message, 429, "rate_limited");
  }
}
