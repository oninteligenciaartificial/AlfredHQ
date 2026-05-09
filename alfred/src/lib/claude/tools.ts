export const agentTools = [
  {
    name: 'schedule_post',
    description: 'Programa una publicación en una o varias redes sociales',
    input_schema: {
      type: 'object' as const,
      properties: {
        caption: { type: 'string', description: 'Texto de la publicación' },
        media_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'URLs de los archivos de media',
        },
        networks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['instagram', 'tiktok', 'linkedin'],
          },
          description: 'Redes sociales destino',
        },
        scheduled_at: {
          type: 'string',
          description: 'Fecha y hora en formato ISO',
        },
      },
      required: ['caption', 'networks', 'scheduled_at'],
    },
  },
  {
    name: 'create_draft',
    description: 'Crea un borrador de publicación sin programar',
    input_schema: {
      type: 'object' as const,
      properties: {
        caption: { type: 'string', description: 'Texto del borrador' },
        networks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Redes sociales destino',
        },
        notes: { type: 'string', description: 'Notas adicionales' },
      },
      required: ['caption', 'networks'],
    },
  },
  {
    name: 'get_analytics',
    description: 'Obtiene métricas de un período para una o todas las redes',
    input_schema: {
      type: 'object' as const,
      properties: {
        network: {
          type: 'string',
          description: 'Red específica o null para todas',
          nullable: true,
        },
        days: {
          type: 'number',
          enum: [7, 30, 90],
          description: 'Días a consultar',
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'complete_task',
    description: 'Marca una tarea diaria como completada',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'ID de la tarea' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'reply_comment',
    description: 'Responde un comentario en Instagram',
    input_schema: {
      type: 'object' as const,
      properties: {
        network: { type: 'string', description: 'Red social' },
        comment_id: { type: 'string', description: 'ID del comentario' },
        reply_text: { type: 'string', description: 'Texto de la respuesta' },
      },
      required: ['network', 'comment_id', 'reply_text'],
    },
  },
  {
    name: 'generate_content_ideas',
    description: 'Genera ideas de contenido basadas en métricas y objetivos',
    input_schema: {
      type: 'object' as const,
      properties: {
        network: { type: 'string', description: 'Red específica o null para todas' },
        count: { type: 'number', description: 'Cantidad de ideas', default: 5 },
        content_type: {
          type: 'string',
          enum: ['post', 'reel', 'carousel'],
          description: 'Tipo de contenido',
        },
      },
    },
  },
]
