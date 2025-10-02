# Despliegue Directo en Proxmox (Sin Docker en Windows)

Esta guía te permite desplegar la aplicación directamente en un container Proxmox, sin necesidad de usar Docker en Windows.

## 📋 Requisitos Previos

1. **Servidor Proxmox** funcionando
2. **SQL Server** en 192.168.0.30:1433 accesible
3. **Credenciales de Azure AD** (Client ID, Secret, Tenant ID)
4. **Acceso SSH** al servidor Proxmox

## 🚀 Pasos de Despliegue

### Paso 1: Crear Container LXC en Proxmox

1. **Accede a la interfaz web de Proxmox** (https://tu-ip-proxmox:8006)

2. **Crea un nuevo container LXC:**
   - Click en "Create CT"
   - **General:**
     - Hostname: `gestion-actividad`
     - Password: (elige una contraseña segura)
     - ✅ Unprivileged container

   - **Template:**
     - Storage: local
     - Template: `ubuntu-22.04-standard`

   - **Disks:**
     - Disk size: `40 GB`

   - **CPU:**
     - Cores: `2`

   - **Memory:**
     - Memory: `4096 MB`
     - Swap: `2048 MB`

   - **Network:**
     - Bridge: `vmbr0`
     - IPv4: `DHCP` o static (anota la IP)
     - ✅ Firewall

3. **Configura características especiales:**
   - En las opciones del container, ve a "Options"
   - Edit "Features"
   - Activa:
     - ✅ `nesting=1` (necesario para Docker)
     - ✅ `keyctl=1`

4. **Inicia el container**

### Paso 2: Conectarse al Container

```bash
# Desde Windows con SSH o desde la consola de Proxmox
ssh root@IP-DEL-CONTAINER
```

O usa la consola web de Proxmox.

### Paso 3: Transferir el Script de Deploy

**Opción A: Usando Git (Recomendado)**

El script clonará automáticamente el repositorio, solo necesitas ejecutar:

```bash
# Dentro del container Proxmox
curl -o deploy.sh https://raw.githubusercontent.com/Romero-Polo/GESTION-ACTV/main/deploy-to-proxmox.sh
chmod +x deploy.sh
./deploy.sh
```

**Opción B: Transferir manualmente desde Windows**

```powershell
# Desde Windows (PowerShell)
scp deploy-to-proxmox.sh root@IP-CONTAINER:/root/deploy.sh
```

Luego en el container:
```bash
chmod +x /root/deploy.sh
/root/deploy.sh
```

**Opción C: Copiar y pegar**

```bash
# En el container
nano deploy.sh
# Pega el contenido del archivo deploy-to-proxmox.sh
# Ctrl+X, Y, Enter para guardar

chmod +x deploy.sh
./deploy.sh
```

### Paso 4: Ejecutar el Script

El script te pedirá la siguiente información:

1. **Contraseña de SQL Server** (rp-gestorjornadas)
2. **Azure AD Client ID**
3. **Azure AD Client Secret**
4. **Azure AD Tenant ID**
5. **n8n API Key** (opcional, presiona Enter para saltar)
6. **Confirmación de IP** del container

El script automáticamente:
- ✅ Instala Docker y Docker Compose
- ✅ Clona el repositorio desde GitHub
- ✅ Crea los secretos y configuración
- ✅ Configura el firewall
- ✅ Construye las imágenes Docker
- ✅ Inicia los servicios
- ✅ Configura backups automáticos

### Paso 5: Verificar el Despliegue

```bash
# Verificar que los containers están corriendo
cd /opt/gestion-actividad
docker compose ps

# Ver logs
docker compose logs -f

# Verificar salud de los servicios
./healthcheck.sh
```

### Paso 6: Acceder a la Aplicación

1. **Aplicación Principal:**
   - URL: `http://IP-CONTAINER:8080`

2. **Documentación API:**
   - URL: `http://IP-CONTAINER:3000/api-docs`

3. **Grafana (opcional):**
   - URL: `http://IP-CONTAINER:3001`
   - Usuario: `admin`
   - Password: Ver `secrets/grafana_admin_password.txt`

### Paso 7: Configurar Azure AD

Actualiza la URL de redirección en Azure AD:

1. Ve a [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations
3. Selecciona tu aplicación
4. Authentication → Redirect URIs
5. Añade: `http://IP-CONTAINER:3000/auth/callback`

## 🔧 Comandos Útiles

```bash
# Ir al directorio del proyecto
cd /opt/gestion-actividad

# Ver estado de los servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar todos los servicios
docker compose restart

# Reiniciar un servicio específico
docker compose restart backend

# Detener servicios
docker compose down

# Iniciar servicios
docker compose up -d

# Reconstruir imágenes
docker compose build

# Actualizar desde GitHub
git pull
docker compose build
docker compose up -d

# Ver uso de recursos
docker stats

# Backup manual
cd /opt/gestion-actividad
tar -czf backups/manual_backup_$(date +%Y%m%d_%H%M%S).tar.gz data/ uploads/
```

## 🔒 Seguridad Post-Despliegue

1. **Cambiar contraseña de root:**
   ```bash
   passwd
   ```

2. **Configurar SSH con claves (recomendado):**
   ```bash
   # En tu máquina local
   ssh-keygen -t rsa -b 4096
   ssh-copy-id root@IP-CONTAINER

   # En el container, deshabilitar password auth
   nano /etc/ssh/sshd_config
   # PasswordAuthentication no
   systemctl restart sshd
   ```

3. **Actualizar el sistema regularmente:**
   ```bash
   apt update && apt upgrade -y
   ```

## 📊 Monitoreo

Si habilitaste Grafana:

1. Accede a `http://IP-CONTAINER:3001`
2. Usuario: `admin`
3. Password: `cat /opt/gestion-actividad/secrets/grafana_admin_password.txt`
4. Los dashboards están preconfigurados

## 🔄 Actualización de la Aplicación

```bash
cd /opt/gestion-actividad

# 1. Hacer backup
tar -czf backups/pre_update_$(date +%Y%m%d_%H%M%S).tar.gz data/ uploads/

# 2. Detener servicios
docker compose down

# 3. Actualizar código
git pull

# 4. Reconstruir imágenes
docker compose build

# 5. Iniciar servicios
docker compose up -d

# 6. Verificar
docker compose ps
docker compose logs -f
```

## ❌ Rollback (en caso de problemas)

```bash
cd /opt/gestion-actividad

# 1. Detener servicios
docker compose down

# 2. Volver al commit anterior
git log --oneline  # Ver commits
git checkout COMMIT_HASH

# 3. Reconstruir
docker compose build
docker compose up -d
```

## 🐛 Troubleshooting

### Los containers no inician

```bash
# Ver logs detallados
docker compose logs

# Verificar estado
docker compose ps -a

# Verificar recursos
docker stats
free -h
df -h
```

### No se puede conectar a SQL Server

```bash
# Probar conectividad
apt install -y telnet
telnet 192.168.0.30 1433

# Si no responde, verificar firewall en SQL Server
```

### Error de permisos

```bash
# Verificar permisos de directorios
chown -R root:root /opt/gestion-actividad
chmod -R 755 /opt/gestion-actividad
chmod 600 /opt/gestion-actividad/secrets/*
```

### El frontend muestra error de API

```bash
# Verificar que backend está corriendo
docker compose ps
docker compose logs backend

# Verificar variables de entorno
cat .env.production
```

## 📱 Acceso desde Dispositivos Móviles

La aplicación es responsive y puede accederse desde:
- Navegadores móviles: `http://IP-CONTAINER:8080`
- Tablets y smartphones en la misma red

## 🔐 Backup y Restauración

### Backup Automático
- Se ejecuta diariamente vía cron
- Se guardan en `/opt/gestion-actividad/backups/`
- Se mantienen los últimos 7 días

### Backup Manual
```bash
cd /opt/gestion-actividad
tar -czf backups/manual_$(date +%Y%m%d_%H%M%S).tar.gz data/ uploads/
```

### Restauración
```bash
cd /opt/gestion-actividad
docker compose down
tar -xzf backups/backup_FECHA.tar.gz
docker compose up -d
```

## 📞 Soporte

Para problemas:
1. Revisa los logs: `docker compose logs`
2. Verifica configuración: `cat .env.production`
3. Comprueba conectividad a SQL Server
4. Revisa el estado de los containers: `docker compose ps`

## ✅ Checklist Final

- [ ] Container Proxmox creado con características correctas (nesting, keyctl)
- [ ] Script ejecutado sin errores
- [ ] Todos los containers están en estado "Up"
- [ ] Aplicación accesible en `http://IP:8080`
- [ ] API Docs accesible en `http://IP:3000/api-docs`
- [ ] Login con Azure AD funciona
- [ ] Azure AD redirect URI actualizada
- [ ] SQL Server conecta correctamente
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Auto-start habilitado

## 🎉 ¡Despliegue Completado!

Tu aplicación está ahora corriendo en Proxmox de forma segura y eficiente.
