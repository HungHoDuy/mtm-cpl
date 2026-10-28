<#
.SYNOPSIS
    MTM Team Orchestrator Pack PowerShell Installer
.DESCRIPTION
    Deploys the team-orchestrator-pack into the target contestant workspace.
.PARAMETER TargetWorkspace
    The path to the contestant team workspace directory (e.g. D:\mtm\CPL).
#>

[CmdletBinding()]
param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$TargetWorkspace = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $TargetWorkspace) {
    $TargetWorkspace = (Resolve-Path "$scriptDir\..\CPL" -ErrorAction SilentlyContinue).Path
    if (-not $TargetWorkspace) {
        $TargetWorkspace = [System.IO.Path]::GetFullPath("$scriptDir\..\CPL")
    }
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  MTM AI Fest 2026 - Team Orchestrator Pack Installer" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Source Pack:      $scriptDir"
Write-Host "Target Workspace: $TargetWorkspace"

# Check Node.js
try {
    $nodeVersion = & node -v
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not found in PATH. Please ensure Node.js v20+ is installed."
    exit 1
}

$installScript = Join-Path $scriptDir "scripts\install.mjs"
& node $installScript --target "$TargetWorkspace"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Team pack installed successfully to $TargetWorkspace\team-sdlc-pack" -ForegroundColor Green
} else {
    Write-Error "`n[FAILED] Installation encountered errors (Exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}
