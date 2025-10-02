# Solución de Problemas DNS en Proxmox

## Problema: EAI_AGAIN o getaddrinfo errors

Si ves errores como:
```
npm error code EAI_AGAIN
npm error syscall getaddrinfo
npm error errno EAI_AGAIN
npm error request to https://registry.npmjs.org failed
```

Significa que el container de Proxmox no puede resolver DNS correctamente.

## Solución Rápida

### Opción 1: Usar el script automático

```bash
# Dentro del container Proxmox
cd /opt/gestion-actividad
bash fix-dns-proxmox.sh
```

### Opción 2: Manual

```bash
# 1. Editar resolv.conf
nano /etc/resolv.conf

# 2. Reemplazar todo el contenido con:
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1

# 3. Guardar (Ctrl+X, Y, Enter)

# 4. Hacer el archivo inmutable para que no se sobrescriba
chattr +i /etc/resolv.conf

# 5. Probar conectividad
ping -c 2 registry.npmjs.org
```

### Opción 3: Configurar DNS en Proxmox (Permanente)

En la interfaz web de Proxmox:

1. Selecciona tu container
2. Ve a **Options** → **DNS**
3. Configura:
   - DNS server 1: `8.8.8.8`
   - DNS server 2: `1.1.1.1`
4. Reinicia el container:
   ```bash
   pct stop <CTID>
   pct start <CTID>
   ```

## Verificación

Después de aplicar la solución, verifica:

```bash
# Debe mostrar las IPs del servidor DNS
cat /etc/resolv.conf

# Debe responder con éxito
ping -c 2 registry.npmjs.org
ping -c 2 google.com

# Debe resolver correctamente
nslookup registry.npmjs.org
```

## Reintentar el Build

Una vez corregido el DNS:

```bash
cd /opt/gestion-actividad
docker compose build --no-cache
docker compose up -d
```

## Notas

- Los Dockerfiles ya están configurados con reintentos automáticos (5 intentos)
- Los timeouts están aumentados para redes lentas
- Si el problema persiste, verifica el firewall del host Proxmox
