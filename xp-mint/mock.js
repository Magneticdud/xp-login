// Finto oggetto lightdm, usato solo per l'anteprima nel browser.
// Dentro nody-greeter/web-greeter window.lightdm esiste già e questo file non fa nulla.
(function () {
  // Il greeter vero carica il tema da file:// o web-greeter://, mai da http
  if (window.lightdm || !/^https?:$/.test(location.protocol)) return;

  function signal() {
    const handlers = [];
    return {
      connect: (fn) => handlers.push(fn),
      emit: (...args) => handlers.forEach((fn) => fn(...args)),
    };
  }

  const mock = {
    _mock: true,
    users: [
      { username: "federico", display_name: "Federico", image: "" },
      { username: "ospite", display_name: "Ospite", image: "" },
    ],
    sessions: [{ key: "cinnamon", name: "Cinnamon" }],
    default_session: "cinnamon",
    can_shutdown: true, can_restart: true, can_suspend: true,
    in_authentication: false,
    is_authenticated: false,
    authentication_user: null,
    show_prompt: signal(),
    show_message: signal(),
    authentication_complete: signal(),
    authenticate(username) {
      this.in_authentication = true;
      this.authentication_user = username;
      setTimeout(() => this.show_prompt.emit("Password: ", 1), 50);
    },
    cancel_authentication() {
      this.in_authentication = false;
      this.authentication_user = null;
    },
    respond(pw) {
      // Nell'anteprima la password giusta è "xp"
      setTimeout(() => {
        this.is_authenticated = pw === "xp";
        this.in_authentication = false;
        this.authentication_complete.emit();
      }, 400);
    },
    start_session(key) { console.log("[anteprima] avvio sessione", key); },
    shutdown() { console.log("[anteprima] spegni"); },
    restart() { console.log("[anteprima] riavvia"); },
    suspend() { console.log("[anteprima] standby"); },
  };

  window.lightdm = mock;
  window.addEventListener("DOMContentLoaded", () => window.dispatchEvent(new Event("GreeterReady")));
})();
