(function () {
  const $ = (sel) => document.querySelector(sel);
  const AVATAR_COLORS = [
    ["#ffb347", "#e8730c"], ["#7ec8f2", "#2a7cc7"], ["#9be07a", "#3c9d22"],
    ["#f59ac0", "#c8326f"], ["#c7a6f5", "#6d3fc4"], ["#f7e07a", "#c49b00"],
  ];

  let started = false;
  let activeUser = null;

  function fallbackAvatar(name, i) {
    const [a, b] = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    return `<svg viewBox="0 0 56 56"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect width="56" height="56" fill="url(#g${i})"/>
      <text x="28" y="38" text-anchor="middle" font-family="Tahoma, Verdana, sans-serif"
        font-size="28" font-weight="bold" fill="#fff" style="text-shadow:1px 1px 2px rgba(0,0,0,.4)">${initial}</text></svg>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderUsers() {
    const list = $("#users");
    list.innerHTML = "";
    lightdm.users.forEach((user, i) => {
      const name = user.display_name || user.username;
      const li = document.createElement("li");
      li.className = "user";
      li.dataset.username = user.username;
      li.innerHTML = `
        <div class="avatar">${fallbackAvatar(name, i)}</div>
        <div class="user-info">
          <span class="user-name">${escapeHtml(name)}</span>
          <form class="login-form" autocomplete="off">
            <div>
              <label>Digitare la password</label>
              <input class="pw" type="password" spellcheck="false">
            </div>
            <button class="go" type="submit" title="Accedi" style="align-self:flex-end">
              <svg viewBox="0 0 14 14"><path d="M2 7h8M6.5 3l4 4-4 4" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="help" type="button" title="Suggerimento password" style="align-self:flex-end">?</button>
          </form>
          <div class="error"><strong>Impossibile effettuare l'accesso?</strong>
            Verificare il nome utente e digitare di nuovo la password.
            Nella password viene fatta distinzione tra maiuscole e minuscole.</div>
        </div>`;

      if (user.image) {
        const img = new Image();
        img.alt = "";
        img.onload = () => { const av = li.querySelector(".avatar"); av.innerHTML = ""; av.appendChild(img); };
        img.src = user.image.startsWith("/") ? "web-greeter://app" + encodeURI(user.image) : user.image;
      }

      li.addEventListener("click", (e) => {
        if (e.target.closest(".login-form")) return;
        selectUser(user.username);
      });
      li.querySelector(".login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        submitPassword(li);
      });
      li.querySelector(".help").addEventListener("click", () => {
        li.querySelector(".error").classList.toggle("show");
      });
      list.appendChild(li);
    });

    // Con un solo utente si apre subito la casella della password
    if (lightdm.users.length === 1) selectUser(lightdm.users[0].username);
  }

  function selectUser(username) {
    if (activeUser === username) return;
    activeUser = username;
    document.querySelectorAll(".user").forEach((el) => {
      const on = el.dataset.username === username;
      el.classList.toggle("active", on);
      el.querySelector(".error").classList.remove("show");
      el.querySelector(".pw").value = "";
    });
    $("#users").classList.add("has-active");
    if (lightdm.in_authentication) lightdm.cancel_authentication();
    lightdm.authenticate(username);
    focusPassword();
  }

  function activeItem() {
    return document.querySelector(`.user[data-username="${CSS.escape(activeUser || "")}"]`);
  }

  function focusPassword() {
    const li = activeItem();
    if (li) setTimeout(() => li.querySelector(".pw").focus(), 30);
  }

  function submitPassword(li) {
    const pw = li.querySelector(".pw");
    li.querySelector(".error").classList.remove("show");
    pw.disabled = true;
    lightdm.respond(pw.value);
  }

  function pickSession() {
    const sessions = lightdm.sessions || [];
    const def = lightdm.default_session;
    if (def && def !== "default" && sessions.some((s) => s.key === def)) return def;
    const cinnamon = sessions.find((s) => /cinnamon/i.test(s.key));
    return (cinnamon || sessions[0] || {}).key || def;
  }

  function onAuthComplete() {
    const li = activeItem();
    if (lightdm.is_authenticated) {
      const w = $("#welcome");
      w.hidden = false;
      requestAnimationFrame(() => w.classList.add("show"));
      setTimeout(() => {
        const key = pickSession();
        if (typeof lightdm.start_session === "function") lightdm.start_session(key);
        else lightdm.start_session_sync(key);
      }, 1200);
      return;
    }
    if (li) {
      const pw = li.querySelector(".pw");
      pw.disabled = false;
      pw.value = "";
      li.querySelector(".error").classList.add("show");
      pw.focus();
    }
    // Riparte l'autenticazione per lo stesso utente
    if (activeUser) lightdm.authenticate(activeUser);
  }

  function setupPower() {
    const backdrop = $("#shutdown");
    const screen = $("#screen");
    const open = () => { backdrop.hidden = false; screen.classList.add("dimmed"); };
    const close = () => { backdrop.hidden = true; screen.classList.remove("dimmed"); focusPassword(); };

    $("#power").addEventListener("click", open);
    $("#cancel").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !backdrop.hidden) close(); });

    const can = { suspend: lightdm.can_suspend, shutdown: lightdm.can_shutdown, restart: lightdm.can_restart };
    backdrop.querySelectorAll(".opt").forEach((btn) => {
      const action = btn.dataset.action;
      if (can[action] === false) { btn.disabled = true; btn.style.opacity = ".4"; }
      btn.addEventListener("click", () => {
        if (action === "suspend") close();
        lightdm[action]();
      });
    });
  }

  function start() {
    if (started || !window.lightdm) return;
    started = true;
    lightdm.show_prompt.connect(() => focusPassword());
    lightdm.show_message.connect((text) => console.log("lightdm:", text));
    lightdm.authentication_complete.connect(onAuthComplete);
    renderUsers();
    setupPower();
  }

  window.addEventListener("GreeterReady", start);
  // Alcune versioni di web-greeter non emettono GreeterReady
  window.addEventListener("load", () => setTimeout(start, 300));
})();
