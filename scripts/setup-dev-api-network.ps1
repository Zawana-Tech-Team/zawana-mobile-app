param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
if ($Port -ne 8000) { throw 'This project uses the existing backend on port 8000.' }
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (!$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this script from an Administrator PowerShell window. It exposes only the existing WSL API on the Wi-Fi interface to the local subnet.'
}
$wifi = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1
if (!$wifi) { throw 'No Wi-Fi IPv4 interface found.' }
$wslAddress = ((wsl.exe --exec hostname -I).Trim() -split '\s+')[0]
$parsedAddress = $null
if (![Net.IPAddress]::TryParse($wslAddress, [ref]$parsedAddress) -or $parsedAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) { throw 'Could not resolve a valid WSL IPv4 address.' }

# Named arguments and validated addresses prevent accidental proxying to another target.
netsh interface portproxy add v4tov4 "listenaddress=$($wifi.IPAddress)" "listenport=$Port" "connectaddress=$wslAddress" "connectport=$Port"
if ($LASTEXITCODE -ne 0) { throw 'The API forwarding rule could not be created.' }
if (!(Get-NetFirewallRule -DisplayName 'ZAWANA development API' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'ZAWANA development API' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -LocalAddress $wifi.IPAddress -RemoteAddress LocalSubnet -Profile Private | Out-Null
}
Write-Output "Use EXPO_PUBLIC_API_URL=http://$($wifi.IPAddress):$Port on a physical device on the same private Wi-Fi network."
Write-Output 'Rerun after a WSL or Wi-Fi address change. This does not start another backend.'
