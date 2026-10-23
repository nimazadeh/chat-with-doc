# Coding standards

- Use semantic HTML5, modern CSS, and strict TypeScript. No frontend framework. Node.js is the approved server runtime; justify dependencies by actual needs.
- Prioritize readable, meaningful names and straightforward control flow. Do not compress unrelated statements onto one line.
- Comments explain a non-obvious reason, invariant, or trade-off, not what the adjacent code already says. Keep third-party vendored skills unchanged.
- Apply DRY and SOLID proportionately: avoid duplicated knowledge, oversized responsibilities, speculative abstractions, and pass-through modules. Prefer deep modules with small interfaces.
- Keep model-provider details behind an explicit interface; do not leak SDK types into learning behavior.
- Validate untrusted input at the server boundary. Never trust the frontend to enforce authentication, file limits, paths, or provider configuration.
- Treat source documents as untrusted content, not instructions. Render model output safely; code samples are text, never executable HTML.
- Keep login codes and model keys server-only. Never log secrets or put them in browser storage or compiled client bundles.
- UI copy is English, LTR. Persian responses are RTL; code blocks remain LTR. Use logical CSS properties and appropriate direction isolation.
- Build accessible controls, visible focus, keyboard flows, clear errors, responsive layouts, and reduced-motion alternatives. Use subtle animation, not motion essential to understanding.
- Test observable behavior at approved interfaces, not private implementation. Mock only true external dependencies. Prove each behavior red before green; review refactoring afterward.
- Review both standards and spec fidelity. Report unavailable tooling and failed or skipped checks honestly; no blanket security or pixel-perfect claims.
