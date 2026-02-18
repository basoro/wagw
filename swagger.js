
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Gateway API',
      version: '1.0.0',
      description: 'API Documentation for WhatsApp Gateway Multi-Device',
      contact: {
        name: 'WAGW Support',
      },
    },
    servers: [
      {
        url: 'https://localhost:10000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./routes.js'], // files containing annotations as above
};

module.exports = swaggerJsdoc(options);
