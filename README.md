# Gestión de Actividad Laboral

Webapp de Control y Registro de Actividad Laboral diseñada para trasladar las actividades de recursos (operarios y máquinas) a partes de trabajo por obra diarios.

## 🚀 Características

- **Backend**: API REST con Node.js, Express y TypeScript
- **Frontend**: React con TypeScript y Vite
- **Base de Datos**: SQL Server con TypeORM
- **Autenticación**: Integración con Office365
- **Testing**: Jest para backend y frontend
- **Estilos**: Tailwind CSS con diseño personalizado
- **Roles**: Operario, Jefe de Equipo, Técnico de Transporte, Administrador

## 🛠️ Tecnologías

### Backend
- Node.js + Express + TypeScript
- TypeORM para SQL Server
- Jest para testing
- JWT para autenticación
- Helmet, CORS para seguridad

### Frontend
- React 19 + TypeScript
- Vite como build tool
- React Router para routing
- Tailwind CSS para estilos
- Testing Library + Jest

## 📁 Estructura del Proyecto

```
gestion-actv-claude/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controladores de API
│   │   ├── models/          # Modelos de datos
│   │   ├── services/        # Lógica de negocio
│   │   ├── middleware/      # Middlewares
│   │   ├── routes/          # Definición de rutas
│   │   ├── tests/           # Tests del backend
│   │   └── utils/           # Utilidades
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── services/        # Servicios de API
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilidades
│   │   ├── types/           # Definiciones de tipos
│   │   └── tests/           # Tests del frontend
│   ├── package.json
│   └── vite.config.ts
└── package.json
```

## ⚙️ Configuración del Entorno

### Prerrequisitos
- Node.js 18+
- SQL Server (local o Azure)
- npm o yarn

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd gestion-actv-claude
   ```

2. **Instalar dependencias**
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno**
   ```bash
   cd backend
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. **Configurar base de datos**
   - Crear base de datos SQL Server
   - Actualizar credenciales en `.env`

### 🏃‍♂️ Ejecución

#### Desarrollo
```bash
# Ejecutar backend y frontend simultáneamente
npm run dev

# O ejecutar por separado:
npm run dev:backend    # Puerto 3000
npm run dev:frontend   # Puerto 5173
```

#### Testing
```bash
# Ejecutar todos los tests
npm test

# Tests por separado
npm run test:backend
npm run test:frontend
```

#### Build para producción
```bash
npm run build
```

## 🎨 Guía de Diseño

### Colores
- **Naranja principal**: `#FAA61A` - Botones de acción
- **Naranjas secundarios**: `#FBC976`, `#FDE4BB`
- **Grises**: `#555555`, `#9a9a9a`, `#dedede`

### Tipografía
- Fuente principal: Aller (fallback: Calibri, Arial)
- Botones con esquinas redondeadas
- Controles modernos estilo app móvil

## 🔐 Autenticación

El sistema utiliza Office365 para autenticación con los siguientes roles:

- **Operario**: Solo sus propias actividades
- **Jefe de Equipo**: Actividades de sus operarios + plantillas
- **Técnico de Transporte**: Mismo que Jefe de Equipo
- **Administrador**: Acceso completo

## 📊 Funcionalidades Principales

### Gestión de Actividades
- Registro de actividades por obra y recurso
- Validación de solapamientos
- Jornadas abiertas automáticas
- Auditoría completa de cambios

### Maestros
- Gestión de obras (sincronización con n8n)
- Gestión de recursos (operarios/máquinas)
- Tipos de actividad configurables

### Visualización
- Dashboard con calendario
- Vistas diaria/semanal/mensual
- Filtros avanzados
- Responsive design

### Integraciones
- Exportación a ERP (API JSON)
- Sincronización n8n para maestros
- Preparación para GPS futuro

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Coverage reports
npm run test:coverage
```

## 🚀 Deployment

### Variables de Entorno Producción
```env
NODE_ENV=production
DB_HOST=your-prod-db-host
DB_NAME=your-prod-db-name
JWT_SECRET=your-super-secure-secret
AZURE_CLIENT_ID=your-azure-client-id
# ... más variables
```

## 📝 API Documentation

La documentación de la API estará disponible en:
- Desarrollo: `http://localhost:3000/api-docs`
- Producción: `/api-docs`

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para reportar problemas o solicitar características:
- Issues: [GitHub Issues](https://github.com/your-repo/gestion-actividad-laboral/issues)
- Email: soporte@empresa.com

## 🔄 Versiones

- **1.0.0** - Versión inicial con funcionalidades básicas
- Próximamente: Integración GPS, notificaciones push