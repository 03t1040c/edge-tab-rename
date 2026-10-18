$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot 'prepare-store.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Store preparation failed.' }
& node (Join-Path $PSScriptRoot 'check-release.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Release validation failed.' }
$manifestFile = Join-Path $projectRoot 'manifest.json'
$extensionManifest = Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json
$distributionDir = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $distributionDir -Force | Out-Null
$zipFile = Join-Path $distributionDir ('tab-trim-' + $extensionManifest.version + '.zip')
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archiveStream = [System.IO.File]::Open($zipFile, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $packageFiles = @('manifest.json', '_locales/ja/messages.json', 'rules.js', 'content.js', 'background.js', 'options.html', 'options.js', 'options.css', 'privacy.html', 'assets/icons/icon-16.png', 'assets/icons/icon-32.png', 'assets/icons/icon-48.png', 'assets/icons/icon-128.png')
  foreach ($packageFile in $packageFiles) {
    $sourceFile = Join-Path $projectRoot $packageFile
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $sourceFile, $packageFile, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $archive.Dispose()
  $archiveStream.Dispose()
}
Write-Output $zipFile
