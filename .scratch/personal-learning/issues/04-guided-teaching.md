# 04: تدریس مرحله‌ای و قابل فهم

**What to build:** یادگیرنده بتواند هدف و سطح خود را مشخص کند و یک مفهوم را با مثال، تمرین و بازخورد بیاموزد.

**Blocked by:** 03: اولین گفت‌وگوی آموزشی با ارائه‌دهندهٔ قابل تعویض

**Status:** needs-info

**Execution:** implemented-awaiting-human-evaluation

**Authorization:** User selected implement_ticket_4 in the next-action question box.

**Starting revision:** 928f45a

**Spec:** ../spec.md

## Acceptance criteria

- [x] هدف و سطح آشنایی در توضیح مرحله‌ای، پیش‌نیازها و مثال‌های مناسب اعمال شوند.
- [x] درخواست ساده‌ترکردن توضیح و پاسخ به تمرین با بازخورد قابل انجام باشند؛ مثال برنامه‌نویسی و یک موضوع غیر برنامه‌نویسی ارزیابی شوند.
- [x] پرسش فارسی پاسخ فارسی با جهت RTL ایجاد کند؛ کد، URL و اصطلاحات انگلیسی به‌درستی ایزوله و LTR بمانند.
- [x] توضیح مکمل مدل از ارجاع منبع متمایز باشد؛ در نبود شواهد، پاسخ منبع ساختگی یا قطعیت کاذب نداشته باشد.
- [ ] رفتار رابط و قرارداد دستور آموزشی با تست قطعی بررسی شوند؛ کیفیت واقعی تدریس با سناریوهای انسانی جداگانه و با ذکر محدودیت‌ها ارزیابی شود. **Automated portion passed; live-model human quality review pending.**

## Out of scope

تضمین صحت مدل یا سیستم ارزیابی رسمی آموزشی.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in chat. Finish by offering the next action in a clickable question box.

## Confirmed clarification

- [x] Persian prose RTL and English prose LTR are handled per message; code blocks are always LTR regardless of surrounding language.
- [x] Each code block has a working copy-code button, accessible success/failure feedback, and copies raw code without presentation markup.


## Verification evidence — 2026-10-23

- Implementation and automated audits finished; overall acceptance remains pending the explicit live-model human quality criterion. No claim that fixtures establish actual provider teaching quality.
- Recorded red→green: learner preferences/pedagogy contract, complete UI learning flow, rejection of nonexistent page references. Additional regressions cover all modes, non-programming context, invalid preferences and missing previous turn.
- Typecheck, ESLint, Prettier, production build pass. **53/53** HTTP/startup tests; **16/16** Chromium browser tests. Axe zero violations in audited states; no horizontal overflow at tested widths. Fixed a focusable-scroll-region finding and mixed-direction page-reference layout. Mobile/desktop screenshots reviewed.
- Explain/simplify/practice/feedback flows for closures and simple interest; Persian/English direction, isolated URLs/terms/page markers/math, LTR code and exact copy, clipboard success/failure status, context/retry/cancel regressions.
- Standards review: rules/profile validation isolated from provider mapping; safe message renderer extracted; shared contracts and bounds; no new dependencies. No blocking technical findings remain.
- Spec review: technical criteria implemented. Source/supplementary distinction is instructed and demonstrated with curated fixtures, not guaranteed for every live output. Page-range validation is structural, not semantic fact checking. The fifth acceptance criterion remains partial because actual-model human evaluation is unavailable.
- Human protocol and independent expected arithmetic/concepts in docs/evaluation/teaching.md. Fixture reference examples manually checked; no live model/key used, no independent human learner or external reviewer was simulated.
- Dependency audit zero known vulnerabilities. No remote CI/cross-browser/screen-reader/pentest or new Lighthouse result claimed. report.md remains untouched.
- Ticket 5 not authorized or started. Resolve or explicitly agree how to handle the outstanding human evaluation before advancing.
