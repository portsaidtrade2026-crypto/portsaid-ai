# نشر تطبيق PS PORT على الـVPS (مجهّز ولم يُنفَّذ — 2026-10-18)

الهدف: `https://app.portsaid.com.tr` يشغّل التطبيق بجانب الموقع على سيرفر Hetzner `46.224.178.184`،
من غير ما نلمس حاويات الموقع (`/opt/portsaid`) أو n8n (`/opt/n8n`) إلا بسطر واحد في Caddy.

الملفات: `docker-compose.yml` · `.env.example` · `Caddyfile.snippet`

## أرقام السيرفر وقت الفحص
- x86_64 (amd64) → الصورة المبنية على x64 تصلح كما هي.
- RAM 3.8 GB (متاح ~1.7 GB) · قرص 38 GB مستخدم 84% (**متبقي 6.1 GB**) · 2 vCPU.
- لذلك: **لا نبني الصورة على السيرفر** (بناء Next.js يحتاج 1-2 GB قرص مؤقت وذاكرة قد تبطّئ الموقع). نبنيها خارجه ونرفعها جاهزة (~200 MB).

## 0) ما نحتاجه قبل البدء
1. سجل DNS: `app.portsaid.com.tr` نوع **A** → `46.224.178.184` (منك أنت، من مكان إدارة الدومين).
2. كود التطبيق خارج Replit: من مشروع التطبيق في Replit، Git → اربطه بمستودع GitHub جديد (خاص)، أو Export كملف zip.
3. جهاز عليه Docker (جهازك Windows مع Docker Desktop، أو GitHub Actions) لبناء الصورة.

## 1) بناء الصورة خارج السيرفر (GitHub Actions، بدون Docker على جهازك)
المستودع الخاص: `portsaidtrade2026-crypto/ps-port-app` · ملف البناء: `.github/workflows/build-image.yml`.
```bash
gh workflow run build-image.yml -R portsaidtrade2026-crypto/ps-port-app
gh run watch -R portsaidtrade2026-crypto/ps-port-app          # ينتظر البناء
gh run download -R portsaidtrade2026-crypto/ps-port-app -n ps-port-app-image -D C:/bot/ps-port-app-src/image   # ملف tar.gz ~200MB
```
الصورة تُبنى على amd64 (نفس السيرفر) من `node:20-slim`. التطبيق يقرأ كل الإعدادات وقت التشغيل من `.env`، فلا شيء يُدمج وقت البناء.

## 2) رفع الصورة للسيرفر (بدون سجل صور خارجي)
```bash
scp -i C:/bot/.ssh/n8n_key C:/bot/ps-port-app-src/image/ps-port-app.tar.gz root@46.224.178.184:/root/
ssh -i C:/bot/.ssh/n8n_key root@46.224.178.184 "gunzip -c /root/ps-port-app.tar.gz | docker load && docker image ls ps-port-app"
```

## 3) تجهيز مجلد التطبيق على السيرفر
```bash
ssh -i C:/bot/.ssh/n8n_key root@46.224.178.184
df -h /                      # يجب أن يكون المتاح أكثر من 3 GB قبل المتابعة
mkdir -p /opt/ps-port-app && cd /opt/ps-port-app
# انسخ docker-compose.yml و .env.example إلى هنا (scp)، ثم:
cp .env.example .env && chmod 600 .env
docker exec portsaid-storefront-1 printenv NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY   # ضع القيمة في .env
nano .env                    # راجع كل القيم
APP_TAG=<الوسم> docker compose up -d
docker compose ps            # لازم يظهر healthy بعد ~30 ثانية
docker exec ps-port-app node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>console.log(r.status))"
```
بعد هذه الخطوة التطبيق يعمل **داخل** الشبكة فقط؛ لا شيء عام تغيّر بعد.

## 4) فتح الدومين في Caddy (التغيير الوحيد على ملفات الموقع)
```bash
cd /opt/n8n
cp Caddyfile Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
cat /opt/ps-port-app/Caddyfile.snippet >> Caddyfile        # إضافة في آخر الملف (لا sed -i)
docker exec n8n-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec n8n-caddy-1 caddy reload   --config /etc/caddy/Caddyfile   # إعادة تحميل بدون توقف
```
Caddy يصدر شهادة HTTPS لوحده بعد أن يرى سجل الـDNS. تابع: `docker logs -f n8n-caddy-1`.

## 5) اختبار الدخان (من موبايلك)
1. `https://app.portsaid.com.tr/healthz` → 200.
2. الرئيسية: صور المنتجات تظهر، الكتالوج يفتح بسرعة.
3. دخول بحساب `QATEST` → صنف له سعر + صنف بلا سعر + وحدة (adet / kg / m²) تظهر → طلب عرض → خروج.
4. عربي (AR) والاتجاه من اليمين لليسار.
5. أندرويد Chrome: قائمة ⋮ ← Install app. (يشتغل الآن لأن الدومين HTTPS خاص بك.)
6. بعد الاختبار: Reject لطلب العرض من لوحة Medusa، وإلغاء الأمر المسودة، وحذف حساب/شركة QATEST.

## الرجوع (يستغرق دقيقة)
```bash
cd /opt/n8n
cat Caddyfile.bak-XXXX > Caddyfile                         # الملف الأصلي (cat يحافظ على الملف المركّب)
docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile
cd /opt/ps-port-app && docker compose down
```
الموقع وn8n لا يتأثران بالرجوع لأنهما لم يتغيرا إلا بسطر Caddy.

## مخاطر معروفة
- **القرص 84%:** نظّف قبل البدء إن لزم (`docker image prune`) ولا تبنِ على السيرفر.
- **Caddyfile مركّب كملف:** استعمل `cat >>` للإضافة و`cat backup > Caddyfile` للرجوع. `sed -i` أو محرر يستبدل الملف قد يُبقي Caddy على النسخة القديمة.
- **أي خطأ في سطر Caddy يؤثر على كل المواقع** (portsaid.com.tr وn8n). لذلك `caddy validate` إلزامي قبل `reload`.
- **التطبيق يقرأ قاعدة الإنتاج الحقيقية** (نفس Medusa): الاختبار بحساب QATEST فقط.
