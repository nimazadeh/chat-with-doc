# 02: افزودن و مدیریت منابع آموزشی

**What to build:** مالک بتواند PDF متنی یا متن انگلیسی را اضافه، مشاهده و حذف کند و پس از راه‌اندازی مجدد آن را بازیابد.

**Blocked by:** 01: ورود امن به فضای شخصی

**Status:** ready-for-agent

**Execution:** awaiting-user-approval

**Spec:** ../spec.md

## Acceptance criteria

- [ ] PDF و paste متن از رابط تا ذخیره‌سازی محلی و بازیابی از HTTP محافظت‌شده کار کنند.
- [ ] متن PDF با شمارهٔ صفحه حفظ شود؛ منبع پس از restart در فهرست بماند.
- [ ] نوع، اندازه و سقف متن با مقادیر مستند اعتبارسنجی شوند؛ PDF اسکن‌شده، رمزدار، خراب یا بدون متن پیام مناسب بدهد.
- [ ] نام فایل نتواند به path traversal یا اجرای محتوا منجر شود؛ مسیر ذخیره خارج از static و Git باشد.
- [ ] حذف منبع دادهٔ مربوط را پاک کند و رفتار آن برای جلسات مرتبط صریح باشد؛ loading و empty/error state قابل دسترس باشند.
- [ ] تست‌های مرورگر و HTTP شامل فایل معتبر، نامعتبر، دسترسی بدون نشست، حذف و restart باشند؛ وابستگی PDF، دسترس‌پذیری و امنیت بررسی شوند.

## Out of scope

OCR، ویدیو و تولید پاسخ مدل.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in report.md.
