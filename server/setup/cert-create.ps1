$domain = "localhost"
$friendlyName = "Local HTTPS Development Server"
$password = "abc"

$pathStoreMy = "cert:\LocalMachine\My"
$pathStoreCa = "cert:\LocalMachine\Root"

$cert = New-SelfSignedCertificate -certstorelocation $pathStoreMy -dnsname $domain
$cert.FriendlyName = $friendlyName

$encPwd = ConvertTo-SecureString -String $password -Force -AsPlainText
$pathStoreMyCert = $pathStoreMy + "\" + $cert.thumbprint
$pathStoreCaCert = $pathStoreCa + "\" + $cert.thumbprint

Export-PfxCertificate -cert $pathStoreMyCert -FilePath ..\certificates\cert.pfx -Password $encPwd
Import-PfxCertificate -FilePath ..\certificates\cert.pfx -Password $encPwd -CertStoreLocation $pathStoreCa
Remove-Item -Path $pathStoreMyCert -DeleteKey