#!/bin/bash
# ===========================================
# Fix DNS in Proxmox Container
# ===========================================
# Run this script if you get DNS resolution errors during Docker builds

echo "==================================="
echo "Fixing DNS Configuration"
echo "==================================="

# Backup current resolv.conf
echo "Backing up /etc/resolv.conf..."
cp /etc/resolv.conf /etc/resolv.conf.backup

# Configure reliable DNS servers
echo "Configuring Google and Cloudflare DNS..."
cat > /etc/resolv.conf << EOF
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
nameserver 1.0.0.1
EOF

echo "DNS configuration updated:"
cat /etc/resolv.conf

# Test DNS resolution
echo ""
echo "Testing DNS resolution..."
if ping -c 2 registry.npmjs.org > /dev/null 2>&1; then
    echo "✓ DNS resolution working!"
else
    echo "✗ DNS still not working. Check network configuration."
    exit 1
fi

# Make resolv.conf immutable to prevent overwriting
echo ""
echo "Making resolv.conf immutable..."
chattr +i /etc/resolv.conf

echo ""
echo "✓ DNS fix completed!"
echo ""
echo "Now you can run: docker compose build"
