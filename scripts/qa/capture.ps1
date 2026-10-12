#Requires -Version 7.0
<#
Capture the current Android display without text-encoding the PNG stream.
Public-route navigation is optional. Authentication guards are never bypassed.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [ValidatePattern('^[A-Za-z0-9._:-]+$')] [string] $Serial,
  [Parameter(Mandatory)] [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$')] [string] $DeviceLabel,
  [Parameter(Mandatory)] [ValidateSet('get-started', 'sign-in', 'sign-up', 'verify', 'password', 'profile-setup', 'create-account', 'set-password', 'complete', 'home')] [string] $Screen,
  [ValidateRange(1, 10)] [int] $Pass = 1,
  [string] $AdbPath = '',
  [switch] $Navigate,
  [ValidatePattern('^[A-Za-z][A-Za-z0-9+.-]*://[A-Za-z0-9.:/_-]*$')] [string] $AppUrlPrefix = 'zawanamobileapp://',
  [ValidateRange(0, 30)] [int] $WaitSeconds = 2
)

$ErrorActionPreference = 'Stop'
$taskRepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$taskOutputRoot = [IO.Path]::GetFullPath((Join-Path $taskRepoRoot 'development/qa/auth/native/android'))
$taskDeviceDir = [IO.Path]::GetFullPath((Join-Path $taskOutputRoot $DeviceLabel))
if (!$taskDeviceDir.StartsWith($taskOutputRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Capture output must stay inside development/qa/auth/native/android.'
}

if (!$AdbPath) {
  $taskAdbCommand = Get-Command adb -ErrorAction SilentlyContinue
  if ($taskAdbCommand) { $AdbPath = $taskAdbCommand.Source }
  else {
    $taskSdkRoots = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android/Sdk'))
    foreach ($taskSdkRoot in $taskSdkRoots) {
      if ($taskSdkRoot) {
        $taskCandidate = Join-Path $taskSdkRoot 'platform-tools/adb.exe'
        if (Test-Path -LiteralPath $taskCandidate -PathType Leaf) { $AdbPath = $taskCandidate; break }
      }
    }
  }
}
if (!$AdbPath -or !(Test-Path -LiteralPath $AdbPath -PathType Leaf)) {
  throw 'ADB is unavailable. Install Android SDK Platform Tools or pass -AdbPath; no native screenshot was captured.'
}
$AdbPath = (Resolve-Path -LiteralPath $AdbPath).Path

function Invoke-TaskAdbText([string[]] $TaskArguments) {
  $taskOutput = & $AdbPath @TaskArguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "ADB failed (exit $LASTEXITCODE). Check that the selected device is connected and authorized." }
  return ($taskOutput -join "`n").Trim()
}

if ((Invoke-TaskAdbText -TaskArguments @('-s', $Serial, 'get-state')) -ne 'device') {
  throw 'The selected Android device is not ready. No screenshot was captured.'
}
if ($Navigate) {
  if ($Screen -notin @('get-started', 'sign-in', 'sign-up')) {
    throw 'Only public entry screens can be opened automatically. Navigate through actual authentication and capture the current screen for later journey steps.'
  }
  $taskRoutePath = if ($Screen -eq 'get-started') { '' } else { $Screen }
  $taskDeepLink = $AppUrlPrefix + $taskRoutePath
  $null = Invoke-TaskAdbText -TaskArguments @('-s', $Serial, 'shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', $taskDeepLink)
}
if ($WaitSeconds) { Start-Sleep -Seconds $WaitSeconds }

$null = New-Item -ItemType Directory -Path $taskDeviceDir -Force
$taskOutputPath = Join-Path $taskDeviceDir ('{0}-pass-{1:D2}.png' -f $Screen, $Pass)
if (Test-Path -LiteralPath $taskOutputPath) { throw 'This capture already exists. Use the next -Pass value to preserve the comparison history.' }
$taskStartInfo = [Diagnostics.ProcessStartInfo]::new()
$taskStartInfo.FileName = $AdbPath
$taskStartInfo.UseShellExecute = $false
$taskStartInfo.CreateNoWindow = $true
$taskStartInfo.RedirectStandardOutput = $true
$taskStartInfo.RedirectStandardError = $true
foreach ($taskArgument in @('-s', $Serial, 'exec-out', 'screencap', '-p')) { $taskStartInfo.ArgumentList.Add($taskArgument) }
$taskProcess = [Diagnostics.Process]::new()
$taskProcess.StartInfo = $taskStartInfo
$taskFile = $null
try {
  $null = $taskProcess.Start()
  $taskErrorRead = $taskProcess.StandardError.ReadToEndAsync()
  $taskFile = [IO.File]::Open($taskOutputPath, [IO.FileMode]::CreateNew)
  $taskCopy = $taskProcess.StandardOutput.BaseStream.CopyToAsync($taskFile)
  if (!$taskProcess.WaitForExit(30000)) {
    $taskProcess.Kill($true)
    throw 'Android screenshot capture timed out. No completed capture is available.'
  }
  $taskCopy.GetAwaiter().GetResult()
  $null = $taskErrorRead.GetAwaiter().GetResult()
  $taskFile.Dispose()
  $taskFile = $null
  if ($taskProcess.ExitCode -ne 0) { throw 'Android screenshot capture failed. Inspect the connected device before retrying.' }
  $taskPng = [IO.File]::ReadAllBytes($taskOutputPath)
  $taskExpectedSignature = [byte[]] @(137, 80, 78, 71, 13, 10, 26, 10)
  if ($taskPng.Length -lt 24 -or [Convert]::ToHexString([byte[]] $taskPng[0..7]) -ne [Convert]::ToHexString($taskExpectedSignature)) {
    throw 'ADB did not return a valid PNG signature. This file is not a verified capture.'
  }
  $taskMetadata = [ordered] @{
    source = 'android-adb-exec-out-screencap'
    capturedAtUtc = [DateTime]::UtcNow.ToString('o')
    deviceLabel = $DeviceLabel
    serial = $Serial
    screenLabel = $Screen
    pass = $Pass
    navigation = $(if ($Navigate) { 'public-route-deep-link' } else { 'operator-navigated-current-screen' })
    routeVerification = 'Operator must confirm the captured UI; the script does not bypass or inspect authentication.'
    deviceModel = Invoke-TaskAdbText -TaskArguments @('-s', $Serial, 'shell', 'getprop', 'ro.product.model')
    androidVersion = Invoke-TaskAdbText -TaskArguments @('-s', $Serial, 'shell', 'getprop', 'ro.build.version.release')
    displaySize = Invoke-TaskAdbText -TaskArguments @('-s', $Serial, 'shell', 'wm', 'size')
    displayDensity = Invoke-TaskAdbText -TaskArguments @('-s', $Serial, 'shell', 'wm', 'density')
    output = $taskOutputPath
  }
  $taskMetadata | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath ([IO.Path]::ChangeExtension($taskOutputPath, '.capture.json')) -Encoding utf8
  Write-Output $taskOutputPath
} catch {
  if ($taskFile) { $taskFile.Dispose(); $taskFile = $null }
  if (Test-Path -LiteralPath $taskOutputPath) {
    # The resolved target is a single file under the checked QA output directory.
    Remove-Item -LiteralPath $taskOutputPath
  }
  throw
} finally {
  if ($taskFile) { $taskFile.Dispose() }
  $taskProcess.Dispose()
}
