$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# update-skills.ps1 v3 - no backups
# Dat file nay o root repo (vi du C:\cppprepare\update-skills.ps1)
# Chay:
#   .\update-skills.ps1
# Hoac neu PowerShell chan script:
#   powershell -ExecutionPolicy Bypass -File .\update-skills.ps1

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Khong tim thay '$Name' trong PATH."
    }
}

function Replace-Skill {
    param(
        [string]$Source,
        [string]$SkillName,
        [string]$SkillsDir
    )

    $skillMd = Join-Path $Source "SKILL.md"
    if (-not (Test-Path $skillMd)) {
        throw "Source cua skill '$SkillName' khong co SKILL.md: $Source"
    }

    $dest = Join-Path $SkillsDir $SkillName
    if (Test-Path $dest) {
        Remove-Item $dest -Recurse -Force
    }

    Copy-Item $Source $dest -Recurse -Force
    Write-Host "    Updated: $SkillName"
}

function Clone-Shallow {
    param(
        [string]$Url,
        [string]$Destination
    )

    & git clone --depth 1 $Url $Destination
    if ($LASTEXITCODE -ne 0) {
        throw "git clone failed: $Url"
    }
}

function Clone-Sparse {
    param(
        [string]$Url,
        [string]$Destination,
        [string[]]$Paths
    )

    & git clone --depth 1 --filter=blob:none --no-checkout $Url $Destination
    if ($LASTEXITCODE -ne 0) {
        throw "git clone failed: $Url"
    }

    Push-Location $Destination
    try {
        & git sparse-checkout init --cone
        if ($LASTEXITCODE -ne 0) {
            throw "git sparse-checkout init failed: $Url"
        }

        & git sparse-checkout set @Paths
        if ($LASTEXITCODE -ne 0) {
            throw "git sparse-checkout set failed: $Url"
        }

        & git checkout
        if ($LASTEXITCODE -ne 0) {
            throw "git checkout failed: $Url"
        }
    }
    finally {
        Pop-Location
    }
}

# Project root = folder containing this script.
$ProjectRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Get-Location).Path
}

$SkillsDir = Join-Path $ProjectRoot ".agents\skills"

# Short temp path on purpose to avoid Windows MAX_PATH issues.
$TempRoot = Join-Path $env:TEMP ("skupd-" + [guid]::NewGuid().ToString("N").Substring(0,8))

Write-Host "update-skills.ps1 v3 (no backup)"
Write-Host "Project root : $ProjectRoot"
Write-Host "Skills dir   : $SkillsDir"

if (-not (Test-Path (Join-Path $ProjectRoot "AGENTS.md"))) {
    Write-Warning "Khong thay AGENTS.md o root. Hay chac chan update-skills.ps1 dang nam trong root project."
}

Assert-Command "git"
Assert-Command "npx.cmd"

New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

try {
    # ----------------------------------------------------------------------
    # 1) UI/UX Pro Max
    # ----------------------------------------------------------------------
    Write-Step "Updating ui-ux-pro-max"

    Push-Location $ProjectRoot
    try {
        & npx.cmd --yes ui-ux-pro-max-cli@latest init --ai codex
        if ($LASTEXITCODE -ne 0) {
            throw "UI/UX Pro Max updater failed."
        }
    }
    finally {
        Pop-Location
    }

    if (-not (Test-Path (Join-Path $SkillsDir "ui-ux-pro-max\SKILL.md"))) {
        throw "UI/UX Pro Max chay xong nhung khong tim thay .agents\skills\ui-ux-pro-max\SKILL.md"
    }
    Write-Host "    Updated: ui-ux-pro-max"

    # ----------------------------------------------------------------------
    # 2) Supabase skills
    # ----------------------------------------------------------------------
    Write-Step "Updating Supabase skills"
    $SupabaseRepo = Join-Path $TempRoot "supabase"
    Clone-Shallow `
        -Url "https://github.com/supabase-community/supabase-plugin.git" `
        -Destination $SupabaseRepo

    Replace-Skill `
        -Source (Join-Path $SupabaseRepo "skills\supabase") `
        -SkillName "supabase" `
        -SkillsDir $SkillsDir

    Replace-Skill `
        -Source (Join-Path $SupabaseRepo "skills\supabase-postgres-best-practices") `
        -SkillName "supabase-postgres-best-practices" `
        -SkillsDir $SkillsDir

    # ----------------------------------------------------------------------
    # 3) Security review
    # ----------------------------------------------------------------------
    Write-Step "Updating security-review"
    $SecurityRepo = Join-Path $TempRoot "security"
    Clone-Sparse `
        -Url "https://github.com/troykelly/codex-skills.git" `
        -Destination $SecurityRepo `
        -Paths @("skills/security-review")

    Replace-Skill `
        -Source (Join-Path $SecurityRepo "skills\security-review") `
        -SkillName "security-review" `
        -SkillsDir $SkillsDir

    # ----------------------------------------------------------------------
    # 4) OpenAI Codex review-agent
    # Sparse checkout only the one folder we need.
    # ----------------------------------------------------------------------
    Write-Step "Updating review-agent"
    $CodexRepo = Join-Path $TempRoot "codex"
    Clone-Sparse `
        -Url "https://github.com/openai/codex.git" `
        -Destination $CodexRepo `
        -Paths @("codex-rs/skills/src/assets/samples/review-agent")

    Replace-Skill `
        -Source (Join-Path $CodexRepo "codex-rs\skills\src\assets\samples\review-agent") `
        -SkillName "review-agent" `
        -SkillsDir $SkillsDir

    # ----------------------------------------------------------------------
    # Verify
    # ----------------------------------------------------------------------
    Write-Step "Verifying installed skills"

    $Expected = @(
        "ui-ux-pro-max",
        "supabase",
        "supabase-postgres-best-practices",
        "security-review",
        "review-agent"
    )

    $Failed = @()

    foreach ($Skill in $Expected) {
        $SkillFile = Join-Path $SkillsDir "$Skill\SKILL.md"
        if (Test-Path $SkillFile) {
            Write-Host "    [OK] $Skill"
        }
        else {
            Write-Host "    [MISSING] $Skill" -ForegroundColor Red
            $Failed += $Skill
        }
    }

    if ($Failed.Count -gt 0) {
        throw "Update chua hoan tat. Missing: $($Failed -join ', ')"
    }

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host " All skills updated successfully." -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green

    Write-Host ""
    Write-Host "Installed at:"
    Write-Host "  $SkillsDir"

    Write-Host ""
    Write-Host "Nen restart Codex sau khi update skill."

    Write-Host ""
    Write-Host "Git status:"
    Push-Location $ProjectRoot
    try {
        & git status --short
    }
    finally {
        Pop-Location
    }
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}