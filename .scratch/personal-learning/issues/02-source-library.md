# 02: افزودن و مدیریت منابع آموزشی

**What to build:** مالک بتواند PDF متنی یا متن انگلیسی را اضافه، مشاهده و حذف کند و پس از راه‌اندازی مجدد آن را بازیابد.

**Blocked by:** 01: ورود امن به فضای شخصی

**Status:** completed

**Execution:** completed

**Authorization:** Explicitly selected by user in the next-action question box.

**Starting revision:** 30d853f

**Spec:** ../spec.md

## Acceptance criteria

- [x] PDF و paste متن از رابط تا ذخیره‌سازی محلی و بازیابی از HTTP محافظت‌شده کار کنند.
- [x] متن PDF با شمارهٔ صفحه حفظ شود؛ منبع پس از restart در فهرست بماند.
- [x] نوع، اندازه و سقف متن با مقادیر مستند اعتبارسنجی شوند؛ PDF اسکن‌شده، رمزدار، خراب یا بدون متن پیام مناسب بدهد.
- [x] نام فایل نتواند به path traversal یا اجرای محتوا منجر شود؛ مسیر ذخیره خارج از static و Git باشد.
- [x] حذف منبع دادهٔ مربوط را پاک کند و رفتار آن برای جلسات مرتبط صریح باشد؛ loading و empty/error state قابل دسترس باشند.
- [x] تست‌های مرورگر و HTTP شامل فایل معتبر، نامعتبر، دسترسی بدون نشست، حذف و restart باشند؛ وابستگی PDF، دسترس‌پذیری و امنیت بررسی شوند.

## Out of scope

OCR، ویدیو و تولید پاسخ مدل.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in chat (supersedes the earlier report.md convention).


## Verification evidence — 2026-10-23

- Typecheck, ESLint, Prettier, production build: pass.
- Vitest: 30/30 tests (12 auth, 9 startup, 9 source HTTP); real PDF/page references, encrypted/corrupt/no-text/oversized documents, filename labels, concurrent capacity, restart, delete, stored corruption, code indentation.
- Playwright Chromium: 11/11; source CRUD at 375/768/1440px, real PDF import, loading/error recovery, literal unsafe HTML/script handling, keyboard/reduced motion and previous auth flows.
- Automated axe checks: no violations in tested library/import/preview/delete states; viewport checks: no horizontal overflow. Screenshots visually reviewed at desktop and mobile.
- Dependency audit: zero known vulnerabilities. Reviewed auth/origin/host boundaries, safe DOM insertion, UUID paths, limits, worker cleanup, ignored private storage and client/server separation.
- Standards review: vanilla TypeScript, narrow modules and shared contracts; comments explain reasons. Spec review: all ticket-2 criteria met; no OCR, AI/provider calls or fake sessions.
- Worker heap/time guards are not an OS security sandbox. No claims of an independent penetration test, cross-browser certification or live provider testing. No new Lighthouse score is claimed for this ticket.
- All reports delivered in chat; report.md remains unchanged. Ticket 3 requires separate explicit permission.
