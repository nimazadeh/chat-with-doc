const brand = `<a class="brand" href="/"><span class="brand-mark" aria-hidden="true">f</span><span>folio<span class="brand-period">.</span></span></a>`;

export function loginView(): string {
  return `
    <div class="entry-page">
      <header class="site-header">
        ${brand}
        <span class="header-label">A SPACE FOR YOUR CURIOSITY</span>
        <span class="private-badge"><i data-lucide="lock-keyhole"></i> Personal workspace</span>
      </header>
      <main id="main-content" class="entry-layout">
        <section class="story" aria-labelledby="story-title">
          <p class="eyebrow"><span class="status-dot"></span> LESS OVERWHELM. MORE UNDERSTANDING.</p>
          <h1 id="story-title">Big ideas.<br />Small steps.<br /><span>Real understanding.</span></h1>
          <p class="story-description">A quieter place to learn. Turn complex material into<br class="desktop-break" /> clear explanations, one conversation at a time.</p>
          <div class="concept-visual" aria-hidden="true">
            <div class="visual-grid"></div>
            <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
            <div class="concept-node node-document"><i data-lucide="file-text"></i><span>Your material</span><span class="node-tag">PDF / TEXT</span></div>
            <div class="connection connection-left"></div>
            <div class="concept-core"><i data-lucide="sparkles"></i></div>
            <div class="connection connection-right"></div>
            <div class="concept-node node-clarity"><span class="clarity-icon"><i data-lucide="check"></i></span><span>That makes sense.</span></div>
            <span class="visual-caption">FROM INFORMATION TO UNDERSTANDING</span>
            <span class="visual-spark spark-one">+</span><span class="visual-spark spark-two">+</span>
          </div>
          <div class="story-values"><span><i data-lucide="layers"></i> Your material</span><span><i data-lucide="sparkles"></i> Your pace</span><span><i data-lucide="fingerprint"></i> Your space</span></div>
        </section>
        <section class="entry-card" aria-labelledby="entry-title">
          <div class="card-topline"><span class="card-overline">YOUR PERSONAL LEARNING SPACE</span><span class="tiny-orbit" aria-hidden="true"></span></div>
          <div class="entry-lock"><i data-lucide="lock-keyhole"></i></div>
          <h2 id="entry-title">Welcome to your space.</h2>
          <p class="card-description">A little focus. A fresh perspective.<br />Pick up where your curiosity takes you.</p>
          <form id="login-form" novalidate>
            <div class="field-label"><label for="access-code">Access code</label><span>6 digits</span></div>
            <input id="access-code" name="code" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" maxlength="6" required aria-describedby="code-hint login-error" placeholder="· · · · · ·" />
            <p id="code-hint" class="field-hint">Enter the private code configured for this workspace.</p>
            <p id="login-error" class="form-error" role="alert"></p>
            <button class="button button-primary" type="submit"><span id="unlock-label">Unlock workspace</span><i data-lucide="arrow-right"></i></button>
          </form>
          <div class="card-divider"><span>JUST YOU AND YOUR NEXT BIG IDEA</span></div>
          <div class="privacy-note"><span class="privacy-icon"><i data-lucide="shield-check"></i></span><p><strong>Personal by design.</strong><br />No account to create. No passwords to remember.<br />Just your private, local workspace.</p></div>
          <button class="help-button" id="access-help" type="button"><i data-lucide="circle-help"></i> Where do I find my code?<i data-lucide="arrow-up-right"></i></button>
        </section>
      </main>
      <footer class="site-footer"><span>Built for the joy of figuring things out.</span><span class="footer-meta"><span class="status-dot"></span> LOCAL WORKSPACE <span class="footer-slash">/</span> V0.1</span></footer>
    </div>
    <dialog id="help-dialog" aria-labelledby="help-title">
      <div class="dialog-heading"><h2 id="help-title">Your workspace access code</h2><button id="close-help" class="icon-button" aria-label="Close help"><i data-lucide="x"></i></button></div>
      <p>The owner sets a six-digit <code>ACCESS_CODE</code> in the server’s <code>.env</code> file. Use that code to unlock this space.</p>
      <p>If you change the code, restart the server. There is no default code, email recovery, or account registration.</p>
      <p class="dialog-note">Keep your code private. Never share API keys or your .env file.</p>
    </dialog>`;
}

export function workspaceView(): string {
  return `
    <div class="workspace-page">
      <header class="site-header">${brand}<span class="workspace-breadcrumb">Personal workspace <i data-lucide="chevron-right"></i> Overview</span><button id="logout" class="button button-quiet"><i data-lucide="log-out"></i><span>Lock workspace</span></button></header>
      <main id="main-content" class="workspace-layout">
        <aside class="workspace-sidebar" aria-label="Workspace overview">
          <p class="sidebar-label">WORKSPACE</p><span class="sidebar-current"><i data-lucide="book-open"></i> Overview</span>
          <div class="sidebar-note"><i data-lucide="shield-check"></i><strong>Just for you.</strong><p>Your personal space.<br />One idea at a time.</p></div>
        </aside>
        <section class="workspace-content" aria-labelledby="workspace-title">
          <p class="eyebrow"><span class="status-dot"></span> YOUR WORKSPACE IS UNLOCKED</p>
          <h1 id="workspace-title" tabindex="-1">Room for your next<br /><span>“I get it.”</span></h1>
          <p class="workspace-description">Every great learning session starts with a little curiosity.</p>
          <div class="empty-workspace">
            <span class="empty-icon"><i data-lucide="book-open"></i></span>
            <span class="feature-tag">COMING IN THE NEXT STEP</span>
            <h2>A home for what you’re learning.</h2>
            <p>Your source library will live here. PDF uploads and text sources<br class="desktop-break" /> are not available in this version yet.</p>
            <button class="button button-disabled" disabled><i data-lucide="plus"></i> Add your first source</button>
            <span class="empty-footnote">Nothing is uploaded or sent to an AI provider.</span>
          </div>
          <div class="workspace-bottom"><span><i data-lucide="lock-keyhole"></i> Private access is active</span><span>Source library → guided learning → your progress</span></div>
          <p id="workspace-error" class="workspace-error" role="alert"></p>
        </section>
      </main>
      <footer class="site-footer"><span>Your pace. Your perspective. Your space.</span><span class="footer-meta"><span class="status-dot"></span> LOCAL WORKSPACE <span class="footer-slash">/</span> V0.1</span></footer>
    </div>`;
}
