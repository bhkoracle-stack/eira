# Rebuild the signed Play release bundle (app-release.aab).
# Before each Play upload, raise versionCode in app.json and android/app/build.gradle.
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File F:\Exp\mobile\bundle-release.ps1

$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Join-Path $mobileRoot "android"
$repoRoot = Split-Path -Parent $mobileRoot

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
$androidHome = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$gradleHome = Join-Path $repoRoot "g"
$tempDir = Join-Path $repoRoot "t"

if (-not (Test-Path (Join-Path $javaHome "bin\java.exe"))) {
  throw "Android Studio JDK not found at $javaHome"
}
if (-not (Test-Path $androidHome)) {
  throw "Android SDK not found at $androidHome"
}
if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
  throw "Android project not found at $androidDir"
}

New-Item -ItemType Directory -Force -Path $gradleHome, $tempDir | Out-Null

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:GRADLE_USER_HOME = $gradleHome
$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:EXPO_PUBLIC_API_URL = "https://eira-blush.vercel.app"

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "GRADLE_USER_HOME=$env:GRADLE_USER_HOME"
Write-Host "EXPO_PUBLIC_API_URL=$env:EXPO_PUBLIC_API_URL"
Write-Host "Building release bundle..."

Push-Location $androidDir
try {
  & .\gradlew.bat bundleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$aab = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
Write-Host ""
Write-Host "Release bundle:"
Write-Host $aab
