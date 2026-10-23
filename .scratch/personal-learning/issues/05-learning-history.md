# 05: ادامه و نگه‌داری یادگیری

**What to build:** مالک بتواند جلسات قبلی را باز کند، پس از restart ادامه دهد و حذف کند.

**Blocked by:** 04: تدریس مرحله‌ای و قابل فهم

**Status:** ready-for-agent

**Execution:** awaiting-user-approval

**Spec:** ../spec.md

## Acceptance criteria

- [ ] جلسات، پیام‌ها، هدف و سطح یادگیری محلی ذخیره شوند و ادامهٔ جلسه context مرتبط را حفظ کند.
- [ ] فهرست، بازکردن و حذف جلسه از UI و HTTP محافظت‌شده قابل انجام باشد.
- [ ] رفتار حذف منبع و نشست آموزشی مرتبط روشن باشد و دادهٔ orphan پنهان ایجاد نشود.
- [ ] ارسال شکست‌خورده یا لغوشده پاسخ کامل جعلی نسازد؛ خطا قابل تشخیص و retry قابل استفاده باشد.
- [ ] تست restart، ادامه، حذف، خطا و منع دسترسی بدون احراز انجام شود؛ اطلاعات شخصی در log و Git نباشند.

## Out of scope

همگام‌سازی ابری و backup خودکار.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in report.md.
