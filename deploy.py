#!/usr/bin/env python3
"""Deploy Kisher.Shop frontend and backend to Hostinger via SFTP."""

import paramiko
import os
import stat
import tempfile
import time

# Updated 2026-07-16: site migrated US → India. Live server now 145.79.211.206
# (kisher.shop DNS points here). The old US box 157.173.209.175 still accepts
# the SSH password but its shell is /sbin/nologin, so SFTP silently fails and
# uploads there never reach the live site. See memory: server-migration-india.
HOST = "145.79.211.206"
PORT = 65002
USER = "u954364410"
PASSWORD = "R=s0^Y*H8"

# Server paths (absolute from SFTP root)
REMOTE_FRONTEND = "domains/kisher.shop/public_html"
REMOTE_BACKEND = "domains/kisher.shop"

# Local paths
LOCAL_DIST = r"E:\kishershop\frontend\dist"
LOCAL_BACKEND = r"E:\kishershop\backend"

# Backend files to upload (relative to backend root)
BACKEND_FILES = [
    "app/Models/Coupon.php",
    "app/Models/ProductGroup.php",
    "app/Models/Transaction.php",
    "app/Models/User.php",
    "app/Http/Controllers/CouponController.php",
    "app/Http/Controllers/AdminController.php",
    "app/Http/Controllers/ProductGroupController.php",
    "app/Http/Controllers/Auth/CustomerAuthController.php",
    "app/Models/Product.php",
    "app/Models/Setting.php",
    "app/Mail/SendVerificationCode.php",
    "app/Mail/TradeStatusNotification.php",
    "routes/api.php",
    "routes/web.php",
    "bootstrap/app.php",
    "resources/views/mail/verification-code.blade.php",
    "resources/views/mail/verification-code-text.blade.php",
    "resources/views/mail/trade-status.blade.php",
    "resources/views/mail/trade-status-text.blade.php",
    "database/seeders/SettingSeeder.php",
    "database/seeders/AdminSeeder.php",
]

NEW_MIGRATIONS = [
    "2026_07_12_000010_add_verification_code_to_users_table.php",
    "2026_07_14_000004_add_gateway_to_transactions.php",
    "2026_07_14_000005_add_discount_percentage_to_products.php",
    "2026_07_14_000006_add_is_banned_to_users.php",
    "2026_07_14_000007_add_description_to_products.php",
    "2026_07_14_000008_add_classification_to_product_groups.php",
    "2026_07_16_000001_make_original_price_nullable_on_products.php",
]


def connect(retries=5, backoff=4):
    """Connect SSH+SFTP, retrying on transient 'EOF during negotiation'.

    The SFTP subsystem on this Hostinger box occasionally drops the channel
    right after SSH auth succeeds (paramiko raises `EOF during negotiation`).
    Re-dialing SSH usually clears it, so retry a few times with backoff.
    """
    last_err = None
    for attempt in range(1, retries + 1):
        transport = None
        try:
            transport = paramiko.Transport((HOST, PORT))
            transport.connect(username=USER, password=PASSWORD)
            transport.set_keepalive(30)
            sftp = paramiko.SFTPClient.from_transport(transport)
            return sftp, transport
        except Exception as e:
            last_err = e
            if transport is not None:
                try:
                    transport.close()
                except Exception:
                    pass
            print(f"  connect attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise last_err


def mkdir_p(sftp, remote_dir):
    """Create directory recursively, ignoring already-exists."""
    if not remote_dir or remote_dir == "/":
        return
    dirs = []
    d = remote_dir
    while d and d != "/":
        dirs.append(d)
        d = "/".join(d.split("/")[:-1]) or "/"
    dirs.reverse()
    for d in dirs:
        try:
            sftp.mkdir(d)
        except (IOError, OSError):
            pass  # already exists


def upload_dir(sftp, local_dir, remote_dir):
    """Upload a directory recursively."""
    mkdir_p(sftp, remote_dir)
    for name in os.listdir(local_dir):
        local_path = os.path.join(local_dir, name)
        remote_path = f"{remote_dir}/{name}"
        if os.path.isfile(local_path):
            print(f"  {remote_path}")
            sftp.put(local_path, remote_path)
            sftp.chmod(remote_path, 0o644)
        elif os.path.isdir(local_path):
            upload_dir(sftp, local_path, remote_path)


def rmtree_sftp(sftp, remote_dir, keep=None):
    """Remove remote directory contents, optionally keeping some files."""
    if keep is None:
        keep = set()
    try:
        for name in sftp.listdir(remote_dir):
            if name in keep:
                continue
            path = f"{remote_dir}/{name}"
            try:
                attrs = sftp.stat(path)
                if attrs.st_mode & stat.S_IFDIR:
                    rmtree_sftp(sftp, path)
                    try:
                        sftp.rmdir(path)
                    except Exception:
                        pass
                else:
                    try:
                        sftp.remove(path)
                    except Exception:
                        pass
            except Exception as e:
                print(f"  Skip {path}: {e}")
    except Exception as e:
        print(f"  Skip listing {remote_dir}: {e}")


def ssh_run(transport, command, timeout=60):
    """Run a command via SSH and return output."""
    ssh = paramiko.SSHClient()
    ssh._transport = transport
    print(f"  $ {command}")
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(f"    {out.strip()}")
    if err.strip():
        print(f"    [stderr] {err.strip()}")
    # Don't close — transport is shared with SFTP
    return exit_code, out, err


def main():
    print("=== Kisher.Shop Deploy ===")
    print("Connecting to Hostinger (port 65002)...")
    sftp, transport = connect()
    print("Connected!\n")

    # ─── FRONTEND ───
    print("--- Frontend: Cleaning old files ---")
    rmtree_sftp(sftp, REMOTE_FRONTEND, keep={".htaccess", ".user.ini", "cgi-bin", "storage"})
    print("  Done.\n")

    print("--- Frontend: Uploading dist/ ---")
    upload_dir(sftp, LOCAL_DIST, REMOTE_FRONTEND)
    print("  Frontend upload complete!\n")

    # Ensure .htaccess exists for SPA routing
    htaccess_content = """<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Route API requests to Laravel backend
  RewriteRule ^api(/.*)?$ index.php [L,QSA]

  # Route Laravel health check
  RewriteRule ^up$ index.php [L,QSA]

  # Route dynamic sitemap to Laravel (generated from DB categories)
  RewriteRule ^sitemap\\.xml$ index.php [L,QSA]

  # SPA: serve index.html for all other non-file/dir requests
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
"""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.htaccess') as f:
        f.write(htaccess_content)
        f.flush()
        htaccess_local = f.name
    try:
        sftp.put(htaccess_local, f"{REMOTE_FRONTEND}/.htaccess")
        sftp.chmod(f"{REMOTE_FRONTEND}/.htaccess", 0o644)
        print("  .htaccess updated\n")
    finally:
        os.unlink(htaccess_local)

    # Ensure Laravel front controller (index.php) exists in public_html
    print("--- Ensuring Laravel index.php ---")
    index_php_content = """<?php

use Illuminate\\Http\\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../bootstrap/app.php')
    ->handleRequest(Request::capture());
"""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.php') as f:
        f.write(index_php_content)
        f.flush()
        idx_local = f.name
    try:
        sftp.put(idx_local, f"{REMOTE_FRONTEND}/index.php")
        sftp.chmod(f"{REMOTE_FRONTEND}/index.php", 0o644)
        print("  index.php created in public_html\n")
    finally:
        os.unlink(idx_local)

    # Ensure storage symlink for uploaded images
    print("--- Ensuring storage symlink ---")
    cmd = f"cd {REMOTE_BACKEND} && ln -sfn ../storage/app/public public_html/storage 2>&1"
    ssh_run(transport, cmd, timeout=10)
    print("  Done.\n")

    # ─── BACKEND ───
    print("--- Backend: Uploading files ---")
    for rel_path in BACKEND_FILES:
        local = os.path.join(LOCAL_BACKEND, rel_path)
        remote = f"{REMOTE_BACKEND}/{rel_path}"
        if os.path.isfile(local):
            mkdir_p(sftp, os.path.dirname(remote))
            print(f"  {remote}")
            sftp.put(local, remote)
            sftp.chmod(remote, 0o644)
        else:
            print(f"  MISSING: {local}")

    # Upload new migrations
    for m in NEW_MIGRATIONS:
        local = os.path.join(LOCAL_BACKEND, "database/migrations", m)
        remote = f"{REMOTE_BACKEND}/database/migrations/{m}"
        if os.path.isfile(local):
            print(f"  {remote}")
            sftp.put(local, remote)
            sftp.chmod(remote, 0o644)
        else:
            print(f"  MISSING: {local}")
    print("  Backend upload complete!\n")

    # ─── MIGRATIONS ───
    print("--- Running migrations ---")
    # Find PHP binary
    php = None
    which_ec, which_out, _ = ssh_run(transport, "which php 2>/dev/null || echo NOTFOUND", timeout=10)
    which_out = which_out.strip()
    if which_out and which_out != "NOTFOUND":
        php = which_out.split("\n")[0].strip()
    else:
        # Try common paths
        for maybe in ["/usr/bin/php", "/usr/local/bin/php"]:
            ec, out, _ = ssh_run(transport, f"test -x {maybe} && echo FOUND || true", timeout=5)
            if "FOUND" in out:
                php = maybe
                break
        if not php:
            php = "php"  # fallback to PATH

    print(f"  Using PHP: {php}")
    cmd = f"cd {REMOTE_BACKEND} && {php} artisan migrate --force 2>&1"
    ec, out, err = ssh_run(transport, cmd, timeout=120)
    if ec == 0:
        print("  Migrations OK!")
    else:
        print(f"  Migrations exit {ec}")
        # Try without --force
        cmd2 = f"cd {REMOTE_BACKEND} && {php} artisan migrate 2>&1"
        ec2, out2, err2 = ssh_run(transport, cmd2, timeout=120)

    # Route cache
    print("\n--- Caching routes ---")
    cmd = f"cd {REMOTE_BACKEND} && {php} artisan route:cache 2>&1"
    ssh_run(transport, cmd, timeout=30)

    # Clean up
    sftp.close()
    transport.close()

    print("\n=== Deployment Complete! ===")
    print("Frontend: https://kisher.shop")
    print("Backend API: https://kisher.shop/api")


if __name__ == "__main__":
    main()
