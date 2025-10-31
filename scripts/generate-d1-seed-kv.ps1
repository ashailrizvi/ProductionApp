# Generate KV-based SQL from data/*.json for Cloudflare D1
# Output: scripts/d1-seed-kv.sql
# Usage (from project root):
#   pwsh -File .\scripts\generate-d1-seed-kv.ps1

param(
  [string]$DataDir = (Join-Path (Get-Location) 'data'),
  [string]$OutFile = (Join-Path (Join-Path (Get-Location) 'scripts') 'd1-seed-kv.sql')
)

if (-not (Test-Path $DataDir)) {
  Write-Error "Data directory not found: $DataDir"
  exit 1
}

$outDir = Split-Path -Parent $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

"-- Generated SQL: seed kv from data/*.json`n-- Run in Cloudflare D1 Query editor`nPRAGMA foreign_keys = OFF;" | Out-File -FilePath $OutFile -Encoding UTF8

# Ensure kv table exists
@"
CREATE TABLE IF NOT EXISTS kv (
  table_name TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (table_name, id)
);
CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name);
"@ | Add-Content -Path $OutFile

$jsonFiles = Get-ChildItem -Path $DataDir -Filter '*.json' -File | Sort-Object Name

foreach ($file in $jsonFiles) {
  $table = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  try {
    $raw = Get-Content -Raw -LiteralPath $file.FullName
    $rows = $raw | ConvertFrom-Json
  } catch {
    Write-Warning "Skipping $($file.Name) - invalid JSON"
    continue
  }
  if ($null -eq $rows) { continue }
  if ($rows -isnot [System.Collections.IEnumerable]) { $rows = @($rows) }
  if ($rows.Count -eq 0) { continue }

  Add-Content -Path $OutFile -Value "`n-- Table: $table -> kv`nDELETE FROM kv WHERE table_name = '$table';"

  $i = 0
  foreach ($row in $rows) {
    $i++
    $id = if ($row.PSObject.Properties.Name -contains 'id' -and $row.id) { "$($row.id)" } else { "$i" }

    # Create merged object with ensured id
    $merged = $row | Select-Object *
    if (-not $merged.PSObject.Properties['id']) {
      Add-Member -InputObject $merged -MemberType NoteProperty -Name id -Value $id
    } else {
      $merged.id = "$id"
    }

    $json = $merged | ConvertTo-Json -Compress
    # Escape single quotes for SQL
    $jsonEsc = $json -replace "'","''"
    $idEsc = $id -replace "'","''"
    $tableEsc = $table -replace "'","''"
    $sql = "INSERT OR REPLACE INTO kv (table_name, id, data) VALUES ('$tableEsc', '$idEsc', '$jsonEsc');"
    Add-Content -Path $OutFile -Value $sql
  }
}

@"
PRAGMA foreign_keys = ON;
"@ | Add-Content -Path $OutFile

Write-Host "SQL generated to:" $OutFile
