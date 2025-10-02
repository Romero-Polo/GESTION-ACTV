# 🚀 Instrucciones para la Demo

## ✅ **¡El Sistema ya está en Marcha!**

El servidor de demostración del **Sistema de Gestión de Actividad Laboral** está ejecutándose correctamente en **http://localhost:3000**.

## 🌐 **URLs para Probar**

### 📱 Interfaz de Usuario (Recomendado)
- **Demo Frontend**: Abre `demo-frontend.html` en tu navegador
- Interfaz visual completa con todas las funcionalidades

### 🔧 APIs Directas
- **API Principal**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Métricas del Sistema**: http://localhost:3000/api/metrics/overview
- **Obras**: http://localhost:3000/api/obras
- **Recursos**: http://localhost:3000/api/recursos
- **Actividades**: http://localhost:3000/api/actividades
- **Estado de Auth**: http://localhost:3000/auth/status
- **Documentación API**: http://localhost:3000/api-docs

## 🎯 **Cómo Probar el Sistema**

### Opción 1: Interfaz Visual (Más fácil)
1. **Abre `demo-frontend.html`** desde el explorador de archivos
2. La página se conectará automáticamente al servidor
3. **Prueba todas las funcionalidades** desde la interfaz:
   - Ver métricas del sistema
   - Listar obras y recursos
   - Consultar actividades
   - Probar diferentes endpoints de la API

### Opción 2: APIs Directas (Para desarrolladores)
```bash
# Probar health check
curl http://localhost:3000/health

# Ver métricas completas
curl http://localhost:3000/api/metrics/overview

# Listar obras
curl http://localhost:3000/api/obras

# Ver información completa del sistema
curl http://localhost:3000/
```

### Opción 3: Navegador Web
Visita directamente cualquier URL en tu navegador:
- http://localhost:3000 (Información general)
- http://localhost:3000/health (Estado del sistema)
- http://localhost:3000/api/metrics/overview (Métricas)

## 📊 **Datos de Demostración Incluidos**

El sistema incluye datos de ejemplo para probar:

### 👥 Usuarios Demo
- **admin@demo.com** - Administrador (acceso completo)
- **operario@demo.com** - Operario (acceso limitado)
- **jefe@demo.com** - Jefe de Equipo (acceso intermedio)

### 🏗️ Obras Demo
- **OBR-001** - Obra de Demostración 1
- **OBR-002** - Obra de Demostración 2

### 👷 Recursos Demo
- **OP-001** - Operario Demo 1
- **EQ-001** - Equipo Demo 1

### 📋 Actividades Demo
- Actividad de ejemplo con fechas y horarios

## ✨ **Funcionalidades que Puedes Probar**

### ✅ **Implementado y Funcionando**
- [x] **Health Checks** - Monitoreo del estado del sistema
- [x] **Métricas Completas** - Overview, actividades, usuarios, rendimiento
- [x] **APIs REST** - Todos los endpoints principales funcionando
- [x] **Autenticación Simulada** - Sistema de roles y permisos
- [x] **CORS Habilitado** - Acceso desde el frontend
- [x] **Validación de Datos** - Filtros y paginación
- [x] **Documentación API** - Swagger/OpenAPI disponible
- [x] **Logging Estructurado** - Registro de todas las peticiones

### 🔧 **Arquitectura Demostrada**
- **Backend API REST** con Node.js
- **Sistema de Métricas** en tiempo real
- **Gestión de Roles** (Admin, Operario, Jefe de Equipo)
- **Estructura de Datos** completa
- **Sistema de Cache** preparado
- **Preparación GPS** (estructura lista)

## 🛠️ **Comandos Útiles**

### Para Detener el Servidor
```bash
# Si lo iniciaste desde terminal
Ctrl + C

# Si está en segundo plano
taskkill /f /im node.exe
```

### Para Reiniciar
```bash
cd E:\PROJECTES\GESTION-ACTV-CLAUDE
node demo-server.js
```

### Para Usar el Script Automático
```bash
# Doble clic en:
start-demo.bat
```

## 📈 **Métricas Disponibles**

El sistema de demo incluye métricas completas:

- **Usuarios**: Total, activos, inactivos
- **Obras**: Total, activas, inactivas
- **Recursos**: Total, por tipo
- **Actividades**: Total, diarias, semanales, mensuales
- **Integraciones**: Exportaciones, sincronizaciones
- **Sistema**: Uptime, memoria, CPU
- **API**: Requests, tiempo de respuesta, errores

## 🔍 **Logs en Tiempo Real**

El servidor muestra logs de todas las peticiones:
```
2025-09-25T20:23:26.371Z - GET /health
2025-09-25T20:23:34.194Z - GET /api/metrics/overview
2025-09-25T20:23:41.431Z - GET /api/obras
```

## 🎉 **¡Todo Funcionando!**

El sistema está completamente operativo y listo para:

1. **Pruebas de Funcionalidad** - Todos los endpoints responden
2. **Validación de Arquitectura** - Estructura completa implementada
3. **Testing de APIs** - Datos de ejemplo realistas
4. **Evaluación de Rendimiento** - Métricas en tiempo real
5. **Revisión de Documentación** - Swagger UI disponible

## 🚀 **Próximo Paso: Despliegue Completo**

Una vez que hayas probado la demo, puedes desplegar el sistema completo:

```bash
# Opción 1: Despliegue tradicional
./scripts/deploy.sh

# Opción 2: Despliegue Docker
./scripts/deploy-docker.sh
```

Consulta `DEPLOYMENT.md` para instrucciones completas de producción.

---

**¿Necesitas ayuda?**
- Revisa los logs del servidor para diagnosticar problemas
- Consulta `README.md` para documentación completa
- Usa `demo-frontend.html` para una experiencia visual completa

**¡Disfruta probando el sistema!** 🎯