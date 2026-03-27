"""
FormCheck HTTPS Server
Generates a self-signed certificate and serves the app over HTTPS
so your phone's browser allows camera access.

Usage: python server.py
Then open https://<your-laptop-ip>:8443 on your phone
"""

import http.server
import ssl
import os
import subprocess
import socket
import sys

PORT = 8443
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CERT_FILE = os.path.join(SCRIPT_DIR, "cert.pem")
KEY_FILE = os.path.join(SCRIPT_DIR, "key.pem")

def get_local_ip():
    """Get the local network IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

def generate_cert_python():
    """Generate a self-signed certificate using Python's cryptography library."""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime

        print("  Generating certificate with Python cryptography library...")

        # Generate private key
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

        # Build certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, "FormCheck Local Server"),
        ])

        local_ip = get_local_ip()

        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.utcnow())
            .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.IPAddress(ipaddress.ip_address(local_ip)),
                    x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
                ]),
                critical=False,
            )
            .sign(key, hashes.SHA256())
        )

        # Write key file
        with open(KEY_FILE, "wb") as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            ))

        # Write cert file
        with open(CERT_FILE, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        print("  Certificate created successfully.")
        return True

    except ImportError:
        return False
    except Exception as e:
        print(f"  Python cryptography error: {e}")
        return False

def generate_cert_openssl():
    """Generate a self-signed certificate using the openssl CLI tool."""
    try:
        print("  Trying OpenSSL CLI...")
        subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", KEY_FILE,
            "-out", CERT_FILE,
            "-days", "365",
            "-nodes",
            "-subj", "/CN=FormCheck Local Server"
        ], check=True, capture_output=True)
        print("  Certificate created successfully.")
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False

def install_cryptography():
    """Try to pip install cryptography."""
    print("  Installing 'cryptography' package (one-time setup)...")
    print()
    try:
        # Try py launcher first, then python, then python3
        for cmd in ["py", "python", "python3"]:
            try:
                result = subprocess.run(
                    [cmd, "-m", "pip", "install", "cryptography"],
                    capture_output=True, text=True, timeout=120
                )
                if result.returncode == 0:
                    print("  Package installed successfully!")
                    return True
            except FileNotFoundError:
                continue
        return False
    except Exception as e:
        print(f"  Install error: {e}")
        return False

def generate_cert():
    """Generate a self-signed certificate, trying multiple methods."""
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        print("  Using existing certificate.")
        return True

    print("  Generating self-signed SSL certificate...")
    print()

    # Method 1: Python cryptography library (best)
    if generate_cert_python():
        return True

    # Method 2: OpenSSL CLI
    if generate_cert_openssl():
        return True

    # Method 3: Install cryptography and retry
    print()
    print("  Neither the 'cryptography' Python package nor OpenSSL CLI were found.")
    print("  I'll install the Python package for you now...")
    print()

    if install_cryptography():
        # Retry after install
        if generate_cert_python():
            return True

    # Nothing worked
    print()
    print("  ERROR: Could not generate SSL certificate.")
    print()
    print("  Please try one of these manually:")
    print("    pip install cryptography")
    print("    -- or --")
    print("    winget install ShiningLight.OpenSSL.Light")
    print()
    return False

def main():
    print()
    print("  FormCheck - HTTPS Server")
    print("  ========================")
    print()

    # Change to the script's directory so it serves index.html
    os.chdir(SCRIPT_DIR)

    # Need ipaddress module for cert generation
    global ipaddress
    import ipaddress

    if not generate_cert():
        input("  Press Enter to close...")
        sys.exit(1)

    local_ip = get_local_ip()

    # Create HTTPS server
    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.HTTPServer(("0.0.0.0", PORT), handler)

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(CERT_FILE, KEY_FILE)
    server.socket = context.wrap_socket(server.socket, server_side=True)

    print()
    print(f"  Your laptop IP: {local_ip}")
    print()
    print(f"  Laptop:  https://localhost:{PORT}")
    print(f"  Phone:   https://{local_ip}:{PORT}")
    print()
    print("  ----------------------------------------")
    print("  PHONE SETUP (one time):")
    print(f"  1. Open Chrome on your phone")
    print(f"  2. Go to: https://{local_ip}:{PORT}")
    print(f"  3. Tap 'Advanced' > 'Proceed' on the warning")
    print(f"  4. Allow camera access when prompted")
    print("  ----------------------------------------")
    print()
    print("  Press Ctrl+C to stop.")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()

if __name__ == "__main__":
    main()
