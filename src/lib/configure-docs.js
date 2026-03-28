import { swaggerUI } from '@hono/swagger-ui';
import { Scalar } from '@scalar/hono-api-reference';

export function configureDocs(app) {
  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Aniwatch API',
    },
  });

  app.get(
    '/doc',
    Scalar({
      url: '/openapi.json',
    })
  );
  app.get(
    '/scalar',
    Scalar({
      url: '/openapi.json',
    })
  );
  app.get(
    '/swagger',
    swaggerUI({
      url: '/openapi.json',
    })
  );
}
