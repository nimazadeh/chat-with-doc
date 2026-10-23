# 04: تدریس مرحله‌ای و قابل فهم

**What to build:** یادگیرنده بتواند هدف و سطح خود را مشخص کند و یک مفهوم را با مثال، تمرین و بازخورد بیاموزد.

**Blocked by:** 03: اولین گفت‌وگوی آموزشی با ارائه‌دهندهٔ قابل تعویض

**Status:** ready-for-agent

**Execution:** awaiting-user-approval

**Spec:** ../spec.md

## Acceptance criteria

- [ ] هدف و سطح آشنایی در توضیح مرحله‌ای، پیش‌نیازها و مثال‌های مناسب اعمال شوند.
- [ ] درخواست ساده‌ترکردن توضیح و پاسخ به تمرین با بازخورد قابل انجام باشند؛ مثال برنامه‌نویسی و یک موضوع غیر برنامه‌نویسی ارزیابی شوند.
- [ ] پرسش فارسی پاسخ فارسی با جهت RTL ایجاد کند؛ کد، URL و اصطلاحات انگلیسی به‌درستی ایزوله و LTR بمانند.
- [ ] توضیح مکمل مدل از ارجاع منبع متمایز باشد؛ در نبود شواهد، پاسخ منبع ساختگی یا قطعیت کاذب نداشته باشد.
- [ ] رفتار رابط و قرارداد دستور آموزشی با تست قطعی بررسی شوند؛ کیفیت واقعی تدریس با سناریوهای انسانی جداگانه و با ذکر محدودیت‌ها ارزیابی شود.

## Out of scope

تضمین صحت مدل یا سیستم ارزیابی رسمی آموزشی.

## Verification and review

Record starting revision before implementation. Use approved browser, public HTTP, and external-provider seams as relevant. Finish all applicable tests and audits for this ticket before asking permission for the next. Report unavailable checks honestly in report.md.

## Confirmed clarification

- [ ] Persian prose RTL and English prose LTR are handled per message; code blocks are always LTR regardless of surrounding language.
- [ ] Each code block has a working copy-code button, accessible success/failure feedback, and copies raw code without presentation markup.
