param([switch]$StartPreview)
$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path $PSScriptRoot -Parent
Push-Location $projectDirectory
try {
    if (!(Get-Command node -ErrorAction SilentlyContinue) -or !(Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "Install Node.js 24 LTS (including npm), reopen PowerShell, then rerun this script."
    }
    $nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
    if ($nodeMajor -lt 24) { throw "This setup is verified with Node.js 24. Please install Node.js 24 or newer."
    }
    $useInstalledPnpm = $false
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { $useInstalledPnpm = ((& pnpm --version).Trim() -eq "11.19.0") }
    function Invoke-ProjectPnpm {
        param([string[]]$Arguments)
        if ($useInstalledPnpm) { & pnpm @Arguments }
        else { & npx --yes pnpm@11.19.0 @Arguments }
        if ($LASTEXITCODE -ne 0) { throw "Project command failed: pnpm $($Arguments -join ' ')" }
    }
    Invoke-ProjectPnpm -Arguments @("install", "--frozen-lockfile")
    Invoke-ProjectPnpm -Arguments @("exec", "playwright", "install", "chromium")
    Invoke-ProjectPnpm -Arguments @("check")
    Invoke-ProjectPnpm -Arguments @("test")
    Invoke-ProjectPnpm -Arguments @("build")
    Write-Host "Rare Flip ready. Preview balances are simulated; no live transactions are configured."
    if ($StartPreview) { Invoke-ProjectPnpm -Arguments @("dev") }
    else { Write-Host "Start the preview with pnpm dev (or npx --yes pnpm@11.19.0 dev)." }
} finally { Pop-Location }
