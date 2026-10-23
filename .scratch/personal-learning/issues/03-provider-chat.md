# 03: اولین گفت‌وگوی آموزشی با ارائه‌دهندهٔ قابل تعویض

**What to build:** مالک بتواند دربارهٔ یک منبع محدود سؤال کند و پاسخ مدل را از ارائه‌دهندهٔ انتخابی دریافت کند.

**Blocked by:** 02: افزودن و مدیریت منابع آموزشی

**Status:** ready-for-agent

**Execution:** awaiting-user-approval

**Spec:** ../spec.md

## Acceptance criteria

- [ ] Gemini و یک قرارداد مشخص OpenAI-compatible پشت interface مشترک و بدون نشت انواع اختصاصی به منطق آموزش پشتیبانی شوند.
- [ ] کلید و endpoint/model سمت سرور پیکربندی شوند؛ کاربر از ارسال متن به سرویس خارجی آگاه شود و کلید در مرورگر یا log نباشد.
- [ ] پرسش و پاسخ برای منبع منتخب با loading، لغو، timeout و بازیابی پس از خطای provider کار کنند.
- [ ] سقف context تا پیش از ticket 6 روشن باشد؛ ورودی بلند بی‌صدا truncate نشود.
- [ ] پاسخ و کد با رندر امن نمایش داده شوند؛ آزمون XSS و محتوای منبع حاوی دستور مخرب وجود داشته باشد.
- [ ] قرارداد موفقیت، خطای احراز provider، rate limit، پاسخ خراب و لغو در مرز خارجی تست شوند؛ تست زنده فقط با مجوز و شبکهٔ مجاز باشد.

## Out of scope

پشتیبانی همهٔ مدل‌ها، retrieval منابع بلند و تاریخچهٔ دائمی.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in chat. Finish by offering the next action in a clickable question box.
