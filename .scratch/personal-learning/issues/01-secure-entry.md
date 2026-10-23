# 01: ورود امن به فضای شخصی

**What to build:** مالک بتواند با کد شش‌رقمی وارد فضای خصوصی شود و با خروج یا انقضا دسترسی‌اش قطع شود.

**Blocked by:** None (can start immediately)

**Status:** completed

**Execution:** completed

**Starting revision:** cdb55b2ec1aaafe1cf154044878f0ede60b00ece

**Authorization:** User explicitly authorized ticket 1 on 2026-10-23.

**Spec:** ../spec.md

## Acceptance criteria

- [x] اجرای محلی مستند و build، typecheck، lint و تست‌های خودکار قابل تکرار و CI برقرار باشند.
- [x] فرم انگلیسی و LTR دارای label، وضعیت loading، خطای روشن و استفاده با صفحه‌کلید باشد؛ در عرض‌های ۳۷۵، ۷۶۸ و ۱۴۴۰ پیکسل overflow نداشته باشد.
- [x] کد فقط از .env سمت سرور خوانده شود؛ پیکربندی غایب یا نامعتبر باعث توقف امن شود؛ هیچ رمز پیش‌فرض فعال نباشد.
- [x] ورود معتبر نشست opaque با cookie دارای HttpOnly و SameSite ایجاد کند؛ انقضا و logout دسترسی را باطل کنند و cookie در HTTPS دارای Secure باشد.
- [x] محدودیت تلاش ورود، body limit، origin protection و رد نشست جعلی از HTTP عمومی آزموده شوند؛ اعتماد خودکار به proxy وجود نداشته باشد.
- [x] پوستهٔ احرازشده و خروج واقعی قابل مشاهده باشند؛ قابلیت‌های منابع و مدل که هنوز ساخته نشده‌اند فعال یا واقعی وانمود نشوند.
- [x] تست مرورگر ورود و خروج، ممیزی دسترس‌پذیری و reduced-motion، بررسی امنیتی و دو محور Standards/Spec انجام و نتایج در report.md ثبت شوند.

## Out of scope

منابع آموزشی، اتصال مدل و تاریخچه.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in report.md.

## Completion evidence

2026-10-23: 19 public HTTP/startup tests and 7 Chromium browser flows pass. Typecheck, ESLint, formatting, production build and npm audit pass. Axe has no detected violations on tested entry/workspace viewports and help dialog. Local Lighthouse entry-page run: Performance/Accessibility/Best Practices/SEO 100 each. Sequential Standards and Spec reviews completed; concurrency throttling and logout body-limit gaps were fixed with failing regression tests before the fixes. CI workflow is configured but has not run on GitHub. No source/AI/history ticket was implemented. See report.md for limitations.
