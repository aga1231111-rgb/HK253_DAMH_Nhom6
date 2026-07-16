param(
  [int]$Port = 4173,
  [switch]$Lan,
  [switch]$NoBrowser,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Get-PythonRunner {
  $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($pyLauncher -and (Test-PythonRunner -Command $pyLauncher.Source -Args @("-3", "--version"))) {
    return @{
      Command = $pyLauncher.Source
      PrefixArgs = @("-3")
    }
  }

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python -and (Test-PythonRunner -Command $python.Source -Args @("--version"))) {
    return @{
      Command = $python.Source
      PrefixArgs = @()
    }
  }

  return $null
}

function Test-PythonRunner {
  param(
    [string]$Command,
    [string[]]$Args
  )

  try {
    & $Command @Args *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-PortAvailable {
  param(
    [int]$CandidatePort,
    [string]$BindAddress
  )

  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($BindAddress), $CandidatePort)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    $listener.Stop()
  }
}

function Get-AvailablePort {
  param(
    [int]$StartPort,
    [string]$BindAddress
  )

  for ($candidate = $StartPort; $candidate -lt ($StartPort + 20); $candidate++) {
    if (Test-PortAvailable -CandidatePort $candidate -BindAddress $BindAddress) {
      return $candidate
    }
  }

  return $null
}

function Test-ServerReady {
  param(
    [int]$CandidatePort,
    [string]$ReadyHost = "127.0.0.1"
  )

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $async = $client.BeginConnect($ReadyHost, $CandidatePort, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(200)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function ConvertTo-ArgumentString {
  param([string[]]$InputArgs)

  return ($InputArgs | ForEach-Object {
    if ($_ -match '[\s"]') {
      '"' + ($_ -replace '"', '\"') + '"'
    } else {
      $_
    }
  }) -join " "
}

function Get-LanAddress {
  $addresses = @(
    [System.Net.Dns]::GetHostEntry([System.Net.Dns]::GetHostName()).AddressList |
      Where-Object {
        $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
        -not [System.Net.IPAddress]::IsLoopback($_) -and
        $_.ToString() -notlike "169.254.*"
      } |
      ForEach-Object { $_.ToString() }
  )

  if ($addresses.Count -gt 0) {
    return $addresses[0]
  }

  return $null
}

$bindAddress = "127.0.0.1"
$readyHost = "127.0.0.1"
$displayHost = "127.0.0.1"

if ($Lan) {
  $bindAddress = "0.0.0.0"
  $lanAddress = Get-LanAddress

  if (-not $lanAddress) {
    Write-Host "Could not find a LAN IPv4 address for this computer."
    Write-Host "Connect to Wi-Fi/LAN, then run this file again."
    exit 1
  }

  $displayHost = $lanAddress
}

$runner = Get-PythonRunner

if (-not $runner) {
  if ($Lan) {
    Write-Host ""
    Write-Host "Python was not found, so LAN server mode cannot start."
    Write-Host "Install Python 3 and run this file again."
    Write-Host ""
    exit 1
  }

  $indexPath = Join-Path $root "index.html"
  if (-not $NoBrowser) {
    Start-Process $indexPath
  }

  Write-Host ""
  Write-Host "Python was not found, so the app was opened directly from index.html."
  Write-Host "For localhost mode, install Python 3 and run this file again."
  Write-Host ""
  exit 0
}

$selectedPort = Get-AvailablePort -StartPort $Port -BindAddress $bindAddress
if (-not $selectedPort) {
  Write-Host "Could not find an available local port from $Port to $($Port + 19)."
  exit 1
}

$localUrl = "http://127.0.0.1:$selectedPort/"
$serverUrl = "http://$displayHost`:$selectedPort/"
$pythonArgs = @($runner.PrefixArgs) + @("-m", "http.server", "$selectedPort", "--bind", $bindAddress)
$serverProcess = $null

Write-Host ""
Write-Host "Starting Meeting Management offline..."

try {
  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = $runner.Command
  $processInfo.Arguments = ConvertTo-ArgumentString -InputArgs $pythonArgs
  $processInfo.WorkingDirectory = $root
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true

  $serverProcess = [System.Diagnostics.Process]::Start($processInfo)

  $ready = $false
  for ($attempt = 0; $attempt -lt 50; $attempt++) {
    if ($serverProcess.HasExited) {
      break
    }

    if (Test-ServerReady -CandidatePort $selectedPort -ReadyHost $readyHost) {
      $ready = $true
      break
    }

    Start-Sleep -Milliseconds 100
  }

  if (-not $ready) {
    Write-Host "The offline server could not start."
    if ($serverProcess -and -not $serverProcess.HasExited) {
      $serverProcess.Kill()
    }
    exit 1
  }

  Write-Host ""
  if ($Lan) {
    Write-Host "Meeting Management is running on this network:"
    Write-Host "  Local: $localUrl"
    Write-Host "  LAN:   $serverUrl"
    Write-Host "Open the LAN URL from devices on the same Wi-Fi/LAN."
    Write-Host "If it still cannot connect, allow Python through Windows Firewall for Private networks."
  } else {
    Write-Host "Meeting Management is running offline:"
    Write-Host "  $serverUrl"
  }
  Write-Host "Keep this window open. Press Ctrl+C to stop."
  Write-Host ""

  if ($CheckOnly) {
    Write-Host "Server check OK."
    return
  }

  if (-not $NoBrowser) {
    Start-Process $localUrl
  }

  Wait-Process -Id $serverProcess.Id
} finally {
  if ($serverProcess -and -not $serverProcess.HasExited) {
    $serverProcess.Kill()
    $serverProcess.WaitForExit()
  }
}
