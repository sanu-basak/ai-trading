/**
 * A use case (application service / interactor) executes a single unit of
 * application behaviour. Kept framework-agnostic — no HTTP concepts leak in.
 */
export interface UseCase<Request, Response> {
  execute(request: Request): Promise<Response> | Response;
}
