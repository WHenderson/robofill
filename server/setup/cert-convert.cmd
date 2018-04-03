openssl pkcs12 -in ..\certificates\cert.pfx -nocerts -out ..\certificates\key.pem -nodes
openssl pkcs12 -in ..\certificates\cert.pfx -nokeys -out ..\certificates\cert.pem -nodes