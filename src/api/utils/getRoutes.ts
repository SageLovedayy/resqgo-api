import type { Application, RequestHandler } from "express";

type RouteInfo = {
  method: string;
  path: string;
};

export function getRoutes(app: Application): RouteInfo[] {
  const routes: RouteInfo[] = [];

  const stack = (app as any)._router?.stack;
  if (!stack) return routes;

  for (const layer of stack) {
    if (layer.route) {
      // Direct route on app
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods);

      for (const method of methods) {
        routes.push({
          method: method.toUpperCase(),
          path,
        });
      }
    } else if (layer.name === "router" && layer.handle?.stack) {
      // Router mounted with app.use()
      const basePath = layer.regexp
        ?.toString()
        .replace(/^\/\^/, "")
        .replace(/\\\/\?\(\?\=\\\/\|\$\)\/i$/, "")
        .replace(/\\\//g, "/");

      for (const handler of layer.handle.stack) {
        if (!handler.route) continue;

        const routePath = handler.route.path;
        const methods = Object.keys(handler.route.methods);

        for (const method of methods) {
          routes.push({
            method: method.toUpperCase(),
            path: `${basePath}${routePath}`.replace(/\/+/g, "/"),
          });
        }
      }
    }
  }

  return routes;
}
