import { Router, RequestHandler } from "express";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

// Express 4 does not forward a rejected promise from an async route handler
// to the error-handling middleware — it becomes an unhandled rejection that
// crashes the whole process (taking down every student's session, not just
// the one bad request). This wraps every handler registered on a router so
// a thrown/rejected error is always routed to `next(err)` instead.
export function wrapAsync(router: Router): Router {
  for (const method of METHODS) {
    const original = router[method].bind(router);
    (router as any)[method] = (path: string, ...handlers: RequestHandler[]) => {
      const wrapped = handlers.map(
        (handler): RequestHandler =>
          (req, res, next) => {
            Promise.resolve(handler(req, res, next)).catch(next);
          }
      );
      return original(path, ...wrapped);
    };
  }
  return router;
}
