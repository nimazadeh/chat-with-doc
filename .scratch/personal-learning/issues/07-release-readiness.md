# 07: تجربهٔ نهایی و راه‌اندازی قابل تکرار

**What to build:** مالک بتواند محصول کامل را با راهنمای روشن اجرا کند و جریان یادگیری را در اندازه‌های مختلف به پایان برساند.

**Blocked by:** 06: یادگیری از منابع طولانی

**Status:** ready-for-agent

**Execution:** awaiting-user-approval

**Spec:** ../spec.md

## Acceptance criteria

- [ ] جریان ورود، افزودن منبع، آموزش، تمرین، ادامه و حذف در مرورگر end-to-end بررسی شود.
- [ ] حالت‌های موبایل، تبلت و دسکتاپ، focus، صفحه‌کلید، کنتراست، متن بلند، RTL/LTR و reduced-motion بررسی و اشکالات اصلاح شوند.
- [ ] انیمیشن‌های ملایم بدون مسدودکردن تعامل وجود داشته باشند؛ empty/loading/error stateها یکدست باشند.
- [ ] راهنمای نصب، .env بدون اسرار، تنظیم provider، حریم خصوصی، محل داده‌ها، حذف و محدودیت‌های امنیتی/شبکه مستند باشد.
- [ ] کل suite، lint، typecheck، build، audit وابستگی‌ها، بررسی نشت اسرار و ارزیابی عملکرد اجرا شوند؛ شکست‌ها و استثناها صریح ثبت شوند.
- [ ] بازبینی Standards و Spec روی محصول یکپارچه انجام شود؛ هیچ بررسی انجام‌نشده‌ای موفق اعلام نشود.

## Out of scope

SaaS، استقرار عمومی و افزودن قابلیت خارج از مشخصات.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in chat. Finish by offering the next action in a clickable question box.
