import type { OpenApiRegistry } from '../../../http/openapi';

/** Registers the auth module's OpenAPI operations and shared schemas. */
export function registerAuthOpenApi(registry: OpenApiRegistry): void {
  registry.registerSchema('AuthTokens', {
    type: 'object',
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      tokenType: { type: 'string', example: 'Bearer' },
      expiresIn: { type: 'integer', example: 900 },
    },
  });

  registry.registerSchema('UserProfile', {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      displayName: { type: 'string', nullable: true },
      status: { type: 'string' },
      emailVerified: { type: 'boolean' },
      roles: { type: 'array', items: { type: 'string' } },
      permissions: { type: 'array', items: { type: 'string' } },
    },
  });

  const authResult = {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/UserProfile' },
      tokens: { $ref: '#/components/schemas/AuthTokens' },
    },
  };

  registry.registerPath('/auth/register', 'post', {
    tags: ['Auth'],
    summary: 'Register a new account',
    security: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      '201': { description: 'Registered', content: { 'application/json': { schema: authResult } } },
      '409': { description: 'Email already in use' },
    },
  });

  registry.registerPath('/auth/login', 'post', {
    tags: ['Auth'],
    summary: 'Authenticate and receive tokens',
    security: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      '200': { description: 'Authenticated', content: { 'application/json': { schema: authResult } } },
      '401': { description: 'Invalid credentials' },
    },
  });

  registry.registerPath('/auth/me', 'get', {
    tags: ['Auth'],
    summary: 'Get the current user profile',
    responses: {
      '200': {
        description: 'Current user',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } },
      },
      '401': { description: 'Unauthenticated' },
    },
  });
}
