import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

type RequestWithId = Request & {
  requestId?: string;
};

type ErrorBody = {
  code: string;
  message: string | string[];
  details?: unknown;
};

type ExceptionResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  [key: string]: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const error = this.normalizeError(exceptionResponse, status);

    response.status(status).json({
      success: false,
      error,
      meta: {
        requestId: request.requestId ?? "unknown",
        timestamp: new Date().toISOString(),
        path: request.path,
      },
    });
  }

  private normalizeError(
    exceptionResponse: string | object | undefined,
    status: number,
  ): ErrorBody {
    if (typeof exceptionResponse === "string") {
      return {
        code: this.statusToCode(status),
        message: exceptionResponse,
      };
    }

    if (exceptionResponse && "message" in exceptionResponse) {
      const body = exceptionResponse as ExceptionResponse;

      return {
        code: body.error ?? this.statusToCode(status),
        message: body.message ?? this.statusToCode(status),
        details: body,
      };
    }

    return {
      code: this.statusToCode(status),
      message:
        status === 500 ? "Internal server error" : this.statusToCode(status),
    };
  }

  private statusToCode(status: number): string {
    return HttpStatus[status] ?? "Error";
  }
}
