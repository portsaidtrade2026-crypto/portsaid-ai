<#
  backup-github.ps1 - نسخة احتياطية كاملة لمستودعات بورسعيد (كل الفروع والتاريخ)
  التشغيل:  .\backup-github.ps1 -Dest D:\PortSaid\Backup
  يتطلب تثبيت Git وتسجيل الدخول إلى GitHub (للمستودعات الخاصة).
  الأمر mirror ينسخ كل شيء، ولا يغيّر شيئاً على GitHub.
#>
param([string]$Dest = "D:\PortSaid\Backup")

$repos = @("portsaid-ai", "portsaid-whatsapp-system")
$stamp = Get-Date -Format "yyyy-MM-dd"
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

foreach ($r in $repos) {
  $target = Join-Path $Dest "$r-$stamp.git"
  if (Test-Path $target) { "موجود مسبقاً، تخطي: $target"; continue }
  git clone --mirror "https://github.com/portsaidtrade2026-crypto/$r" $target
  # نسخة عمل عادية للتصفح (آخر main)
  git clone "https://github.com/portsaidtrade2026-crypto/$r" (Join-Path $Dest "$r-$stamp")
}
"تم. المجلد: $Dest"
