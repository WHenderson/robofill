# Running a local HTTPS Server

The local HTTPs Server requires certificates which can be a real pain to setup etc
Two scripts are provided here, but you'll need OpenSSL installed.
OpenSSL may already be on your system, especially if you have something like Git installed.
On my system OpenSSL is found at `C:\Program Files\Git\usr\bin\openssl.exe`

## Generating certificates

1. Start *Power Shell* as an Administrator 
2. Navigate to `./server/setup`
3. Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Unrestricted`
4. Accept the change (Y)
5. Run `cert-create.ps1`
6. Open a command shell
7. Run `cert-convert.cmd`.
   Note: Password is `abc`
   Note: If 'openssl' is not found, you will likely have a copy already install in program files/git

You should now have the following files:
* `./server/certificates/cert.pfx` : Certificate + Key encoded using PKCS12 
* `./server/certificates/cert.pem` : Certificate only, used by HTTPS server
* `./server/certificates/key.pem`  : Key only, used by HTTPS server

## Running the HTTPS Server

1. Start a command shell
2. Navigate to `./server`
3. Run `serve.cmd`
4. Browse to `https://localhost:8080`

## Uninstalling certificate

1. Open *Manage computer certificates*
2. Navigate to `/Certificates - Local Computer/Trusted Root Certification Authorities/Certificates`
3. Locate the certificate with friendly name `Local HTTPS Development Server` issued to `localhost`