# Applique un fichier .sql sur Postgres Supabase (contourne le SQL Editor web).
# Usage :
#   $env:SUPABASE_DB_URL = "postgresql://postgres.[ref]:[MOT_DE_PASSE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
#   .\scripts\apply-sql.ps1 -File supabase\trigger-jackpot-roll.sql

param(
  [Parameter(Mandatory = $true)]
  [string]$File,

  [string]$DbUrl = $env:SUPABASE_DB_URL
)

if (-not $DbUrl) {
  Write-Error "Définis SUPABASE_DB_URL (URI Postgres du projet → Settings → Database)."
  exit 1
}

if (-not (Test-Path $File)) {
  Write-Error "Fichier introuvable : $File"
  exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Error "psql introuvable. Installe PostgreSQL client ou utilise Supabase CLI."
  exit 1
}

Write-Host "Application de $File …"
& psql $DbUrl -v ON_ERROR_STOP=1 -f $File
if ($LASTEXITCODE -ne 0) {
  Write-Error "psql a échoué (code $LASTEXITCODE)"
  exit $LASTEXITCODE
}

Write-Host "OK."
