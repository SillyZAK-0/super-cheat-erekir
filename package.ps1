# 读取 mod.hjson 文件并提取版本号
$version = Select-String -Path "mod.hjson" -Pattern "^version:" | ForEach-Object { $_.Line -replace "version:", "" -replace "\s", "" }

# 压缩指定文件和目录
$zipFileName = "super-cheat-v$version.zip"
$filesToZip = @("README.md", "preview.png", "icon.png", "LICENSE", "mod.hjson", "bundles", "content", "scripts", "sounds", "sprites")

Compress-Archive -Path $filesToZip -DestinationPath $zipFileName -Force
