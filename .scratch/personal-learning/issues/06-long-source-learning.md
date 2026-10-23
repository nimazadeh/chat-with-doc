# 06: یادگیری از منابع طولانی

**What to build:** یادگیرنده بتواند از بخش مرتبط یک منبع بلند پاسخ همراه ارجاع بگیرد بدون ارسال کل منبع.

**Blocked by:** 05: ادامه و نگه‌داری یادگیری

**Status:** ready-for-agent

**Execution:** awaiting-user-approval

**Spec:** ../spec.md

## Acceptance criteria

- [ ] بخش‌بندی و انتخاب محتوای مرتبط با محدودیت context مستند پیاده شود؛ نیاز به vector database فرض نشود.
- [ ] ارجاع صفحهٔ انتخاب‌شده از استخراج تا پاسخ و رابط قابل پیگیری باشد؛ نبود نتیجهٔ مرتبط صادقانه نمایش داده شود.
- [ ] منبع کوتاه و بلند با سؤال‌های دارای پاسخ معلوم و سؤال بی‌پاسخ ارزیابی شوند؛ معیارهای انتخاب مرتبط و سقف زمان/حافظه پیش از اجرا ثبت شوند.
- [ ] پردازش، خطا، لغو و حذف منبع با دادهٔ retrieval سازگار باشند.
- [ ] تست retrieval از interface آموزش یا قرارداد انتخاب context و تست مرورگر ارجاع اجرا شوند؛ عملکرد و کیفیت با محدودیت‌های واقعی گزارش شوند.

## Out of scope

تضمین پاسخ صحیح برای هر سند یا مقیاس چندکاربره.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in report.md.
