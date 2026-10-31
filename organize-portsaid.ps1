<#
  organize-portsaid.ps1 - ترتيب ملفات مشروع بورسعيد (Windows PowerShell)
  الوضع الافتراضي: معاينة فقط (لا ينقل شيئاً). للتنفيذ الفعلي أضف -Apply
  مثال:  .\organize-portsaid.ps1 -Root D:\PortSaid
         .\organize-portsaid.ps1 -Root D:\PortSaid -Apply
  الملفات تُنقل ولا تُحذف أبداً، وكل عملية تُسجَّل في move-log.csv
#>
param(
  [string]$Root = "D:\PortSaid",
  [string[]]$Sources = @("$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents"),
  [switch]$Apply
)

# مجلد المشروع وفروعه (عدّل الكلمات المفتاحية حسب أسماء ملفاتك)
$rules = [ordered]@{
  "01_Bot"        = @("bot","chatbot","whatsapp","wa-","medusa","dashboard","prompt")
  "02_Website"    = @("website","site","wordpress","wp-","html","css","portsaid.com")
  "03_Automation" = @("n8n","workflow","automation","make","zapier","docker-compose","erp")
  "04_Docs"       = @("تكاليف","عقد","invoice","offer","teklif","quotation")
}
$other = "05_Other_Review"   # ما لم يُصنَّف يذهب هنا لمراجعتك

foreach ($d in $rules.Keys + $other) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Root $d) | Out-Null
}

$log = Join-Path $Root "move-log.csv"
$rows = @()

foreach ($src in $Sources) {
  if (-not (Test-Path $src)) { continue }
  Get-ChildItem $src -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "$Root*" } |
    ForEach-Object {
      $name = $_.Name.ToLower()
      $dest = $null
      foreach ($k in $rules.Keys) {
        if ($rules[$k] | Where-Object { $name -like "*$($_.ToLower())*" }) { $dest = $k; break }
      }
      # الملفات غير المصنفة: انقل فقط الأنواع المهمة، واترك الباقي
      if (-not $dest) {
        if ($_.Extension -in ".py",".js",".json",".yml",".yaml",".zip",".sql",".env") { $dest = $other } else { return }
      }
      $target = Join-Path (Join-Path $Root $dest) $_.Name
      if (Test-Path $target) {   # منع الكتابة فوق ملف موجود
        $target = Join-Path (Join-Path $Root $dest) ("{0}_{1}{2}" -f $_.BaseName, (Get-Random -Maximum 9999), $_.Extension)
      }
      $rows += [pscustomobject]@{ From=$_.FullName; To=$target; Applied=[bool]$Apply }
      if ($Apply) { Move-Item -LiteralPath $_.FullName -Destination $target }
    }
}

$rows | Export-Csv -Path $log -NoTypeInformation -Encoding UTF8
"{0} ملف {1}. السجل: {2}" -f $rows.Count, $(if ($Apply) {"تم نقله"} else {"سيُنقل (معاينة فقط)"}), $log
