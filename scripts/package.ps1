$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseDir = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'manifest.json') -Raw | ConvertFrom-Json
$files = @('manifest.json','background.js','policy.js','guard.js','content.js','popup.html','popup.js','popup.css','support-config.js','privacy.html','LICENSE','icons')
$resolvedFiles = $files | ForEach-Object { Join-Path $projectRoot $_ }
foreach ($file in $resolvedFiles) {
  if (!(Test-Path -LiteralPath $file)) { throw "Falta archivo de distribución: $file" }
}
$destination = Join-Path $releaseDir "StayHere-$($manifest.version)-chrome.zip"
Compress-Archive -LiteralPath $resolvedFiles -DestinationPath $destination -Force
Write-Output $destination
