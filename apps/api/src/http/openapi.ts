import type { AppConfig } from '../shared/infrastructure/config';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** A single OpenAPI operation object (kept loosely typed to avoid a hard dep). */
export type OperationObject = Record<string, unknown>;
export type SchemaObject = Record<string, unknown>;

/**
 * A minimal, dependency-light OpenAPI 3.0 registry. Modules register their
 * operations and component schemas here (in Step 4); `build()` assembles the
 * final document served by Swagger UI at `/docs`.
 */
export class OpenApiRegistry {
  private readonly paths: Record<string, Record<string, OperationObject>> = {};
  private readonly schemas: Record<string, SchemaObject> = {};

  registerPath(path: string, method: HttpMethod, operation: OperationObject): void {
    this.paths[path] ??= {};
    this.paths[path][method] = operation;
  }

  registerSchema(name: string, schema: SchemaObject): void {
    this.schemas[name] = schema;
  }

  build(config: AppConfig): Record<string, unknown> {
    return {
      openapi: '3.0.3',
      info: {
        title: 'DEVQUANTIC AI Trading Analyst API',
        version: '0.1.0',
        description:
          'AI-powered trading **analysis** API. Signals are explained, never guaranteed. ' +
          'This service performs analysis and education only and is not investment advice.',
      },
      servers: [{ url: `${config.env.API_BASE_URL}/api/v1` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: this.schemas,
      },
      security: [{ bearerAuth: [] }],
      paths: this.paths,
      tags: [],
    };
  }
}
