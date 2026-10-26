$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'extension'
$releaseDir = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Raw | ConvertFrom-Json
$files = @('manifest.json','background.js','policy.js','guard.js','content.js','popup.html','popup.js','popup.css','support-config.js','privacy.html','icons')
$resolvedFiles = @($files | ForEach-Object { Join-Path $extensionRoot $_ }) + @(Join-Path $projectRoot 'LICENSE')
foreach ($file in $resolvedFiles) {
  if (!(Test-Path -LiteralPath $file)) { throw "Falta archivo de distribución: $file" }
}
$destination = Join-Path $releaseDir "StayHere-$($manifest.version).zip"
Compress-Archive -LiteralPath $resolvedFiles -DestinationPath $destination -Force
# Check the archive users will actually extract, not only the source folder.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($destination)
try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
  $required = @('manifest.json','background.js','policy.js','guard.js','content.js','popup.html','popup.js','popup.css','support-config.js','privacy.html','LICENSE','icons/icon-16.png','icons/icon-32.png','icons/icon-48.png','icons/icon-128.png')
  foreach ($entry in $required) {
    if ($entry -notin $entries) { throw "El ZIP no es instalable: falta $entry en la ubicación esperada" }
  }
  if (@($entries | Where-Object { $_.StartsWith('extension/') }).Count) {
    throw 'El paquete de instalación no debe contener una carpeta extension intermedia'
  }
} finally { $archive.Dispose() }
Write-Output "ZIP de instalacion verificado: $destination"
