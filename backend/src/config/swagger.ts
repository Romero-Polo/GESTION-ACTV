import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerOptions } from 'swagger-jsdoc';

const options: SwaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gestión Actividad Laboral API',
      version: '1.0.0',
      description: 'API para la gestión de actividades laborales con sincronización n8n y exportación ERP',
      contact: {
        name: 'API Support',
        email: 'support@gestion-actv.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.gestion-actv.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from Office365 authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error description'
            },
            error: {
              type: 'string',
              example: 'Detailed error information'
            }
          },
          required: ['success', 'message']
        },
        ExportFilters: {
          type: 'object',
          required: ['fechaInicio', 'fechaFin'],
          properties: {
            fechaInicio: {
              type: 'string',
              format: 'date',
              description: 'Start date in YYYY-MM-DD format',
              example: '2024-01-01'
            },
            fechaFin: {
              type: 'string',
              format: 'date',
              description: 'End date in YYYY-MM-DD format (max 90 days from start)',
              example: '2024-01-31'
            },
            empresa: {
              type: 'string',
              maxLength: 200,
              description: 'Company filter (partial match)',
              example: 'Constructora ABC'
            },
            tipoRecurso: {
              type: 'string',
              enum: ['operario', 'maquina'],
              description: 'Filter by resource type'
            },
            obraIds: {
              oneOf: [
                { type: 'integer' },
                {
                  type: 'array',
                  items: { type: 'integer', minimum: 1 }
                }
              ],
              description: 'Work IDs to filter by'
            },
            recursoIds: {
              oneOf: [
                { type: 'integer' },
                {
                  type: 'array',
                  items: { type: 'integer', minimum: 1 }
                }
              ],
              description: 'Resource IDs to filter by'
            },
            format: {
              type: 'string',
              enum: ['json', 'csv', 'xml'],
              default: 'json',
              description: 'Export format'
            }
          }
        },
        ERPExportItem: {
          type: 'object',
          properties: {
            fecha: {
              type: 'string',
              format: 'date',
              description: 'Activity date',
              example: '2024-01-15'
            },
            recurso: {
              type: 'string',
              description: 'Resource code and name',
              example: 'OP001 - Juan Pérez'
            },
            obra: {
              type: 'string',
              description: 'Work code and description',
              example: 'OBR001 - Construcción Edificio A'
            },
            cantidad: {
              type: 'number',
              format: 'float',
              description: 'Hours worked (aggregated)',
              example: 8.5
            },
            agr_coste: {
              type: 'string',
              description: 'Cost aggregation category',
              example: 'MANO_OBRA_DIRECTA'
            },
            actividad: {
              type: 'string',
              description: 'Activity type name',
              example: 'Hormigonado'
            },
            km_recorridos: {
              type: 'number',
              format: 'float',
              description: 'Kilometers traveled (for machinery)',
              example: 15.3
            }
          },
          required: ['fecha', 'recurso', 'obra', 'cantidad', 'agr_coste', 'actividad']
        },
        ExportPreview: {
          type: 'object',
          properties: {
            totalRecords: {
              type: 'integer',
              description: 'Total number of records that would be exported',
              example: 1250
            },
            dateRange: {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  format: 'date',
                  example: '2024-01-01'
                },
                end: {
                  type: 'string',
                  format: 'date',
                  example: '2024-01-31'
                },
                days: {
                  type: 'integer',
                  example: 31
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                totalHours: {
                  type: 'number',
                  format: 'float',
                  description: 'Total aggregated hours',
                  example: 2540.5
                },
                totalActivities: {
                  type: 'integer',
                  description: 'Number of distinct activities',
                  example: 1250
                },
                uniqueObras: {
                  type: 'integer',
                  description: 'Number of unique works',
                  example: 15
                },
                uniqueRecursos: {
                  type: 'integer',
                  description: 'Number of unique resources',
                  example: 42
                },
                operariosCount: {
                  type: 'integer',
                  description: 'Number of operator activities',
                  example: 980
                },
                maquinasCount: {
                  type: 'integer',
                  description: 'Number of machinery activities',
                  example: 270
                }
              }
            },
            sampleData: {
              type: 'array',
              items: { $ref: '#/components/schemas/ERPExportItem' },
              description: 'First 10 records as preview'
            }
          }
        },
        ExportLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Export log ID',
              example: 123
            },
            format: {
              type: 'string',
              enum: ['json', 'csv', 'xml'],
              example: 'json'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'completed'
            },
            fechaInicio: {
              type: 'string',
              format: 'date',
              example: '2024-01-01'
            },
            fechaFin: {
              type: 'string',
              format: 'date',
              example: '2024-01-31'
            },
            empresa: {
              type: 'string',
              nullable: true,
              example: 'Constructora ABC'
            },
            tipoRecurso: {
              type: 'string',
              nullable: true,
              enum: ['operario', 'maquina'],
              example: 'operario'
            },
            recordsCount: {
              type: 'integer',
              description: 'Number of records exported',
              example: 1250
            },
            fileSizeBytes: {
              type: 'integer',
              nullable: true,
              description: 'File size in bytes',
              example: 458723
            },
            fileName: {
              type: 'string',
              nullable: true,
              example: 'export_erp_20240101_20240131_2024-02-01T10-30-00.json'
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-02-01T10:30:00Z'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-02-01T10:30:15Z'
            },
            durationMs: {
              type: 'integer',
              nullable: true,
              description: 'Export duration in milliseconds',
              example: 15000
            },
            errorMessage: {
              type: 'string',
              nullable: true,
              example: 'Database connection timeout'
            },
            fechaCreacion: {
              type: 'string',
              format: 'date-time',
              example: '2024-02-01T10:30:00Z'
            }
          }
        },
        SyncLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 456
            },
            type: {
              type: 'string',
              enum: ['obras', 'recursos'],
              example: 'obras'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'completed'
            },
            triggeredBy: {
              type: 'string',
              example: 'manual'
            },
            totalRecords: {
              type: 'integer',
              example: 50
            },
            processedRecords: {
              type: 'integer',
              example: 48
            },
            createdRecords: {
              type: 'integer',
              example: 5
            },
            updatedRecords: {
              type: 'integer',
              example: 43
            },
            skippedRecords: {
              type: 'integer',
              example: 2
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            errorMessage: {
              type: 'string',
              nullable: true
            },
            fechaCreacion: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      message: {
                        example: 'Usuario no autenticado'
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      message: {
                        example: 'Acceso denegado'
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      message: {
                        example: 'Datos de entrada inválidos'
                      },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            message: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      message: {
                        example: 'Límite de peticiones excedido. Intente nuevamente más tarde.'
                      },
                      retryAfter: {
                        type: 'integer',
                        description: 'Seconds to wait before retrying'
                      }
                    }
                  }
                ]
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': {
              description: 'Request limit per time window',
              schema: { type: 'integer' }
            },
            'X-RateLimit-Remaining': {
              description: 'Remaining requests in current window',
              schema: { type: 'integer' }
            },
            'X-RateLimit-Reset': {
              description: 'Time when the rate limit resets',
              schema: { type: 'string', format: 'date-time' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    properties: {
                      message: {
                        example: 'Error interno del servidor'
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Export',
        description: 'ERP export operations - Export activity data in various formats for ERP integration'
      },
      {
        name: 'Sync',
        description: 'n8n synchronization operations - Sync data with external systems via n8n workflows'
      },
      {
        name: 'Auth',
        description: 'Authentication endpoints - Office365 OAuth integration'
      },
      {
        name: 'Activities',
        description: 'Activity management - CRUD operations for labor activities'
      },
      {
        name: 'Works',
        description: 'Work management - Construction works and projects'
      },
      {
        name: 'Resources',
        description: 'Resource management - Workers and machinery'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
};

export const specs = swaggerJsdoc(options);