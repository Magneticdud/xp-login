#!/usr/bin/env bash
# Installa il tema "xp-mint" per nody-greeter (LightDM).
# Uso:   sudo ./installa.sh            installa e attiva
#        sudo ./installa.sh --ripristina   torna a slick-greeter
set -euo pipefail

THEME=xp-mint
SRC="$(cd "$(dirname "$0")" && pwd)/$THEME"
THEMES_DIR=/usr/share/web-greeter/themes
CONF=/etc/lightdm/web-greeter.yml
OVERRIDE=/etc/lightdm/lightdm.conf.d/99-xp-mint.conf

if [[ $EUID -ne 0 ]]; then
  echo "Lancia lo script con sudo." >&2
  exit 1
fi

if [[ "${1:-}" == "--ripristina" ]]; then
  rm -f "$OVERRIDE"
  echo "Ripristinato: al prossimo avvio torna la schermata di login di Mint."
  exit 0
fi

if [[ -f /usr/share/xgreeters/nody-greeter.desktop ]]; then
  GREETER=nody-greeter
elif [[ -f /usr/share/xgreeters/web-greeter.desktop ]]; then
  GREETER=web-greeter
else
  echo "nody-greeter non è installato." >&2
  echo "Scarica il .deb da https://github.com/JezerM/nody-greeter/releases e installalo con:" >&2
  echo "  sudo apt install ./nody-greeter_*.deb" >&2
  exit 1
fi

install -d "$THEMES_DIR/$THEME"
cp -r "$SRC"/. "$THEMES_DIR/$THEME/"
echo "Tema copiato in $THEMES_DIR/$THEME"

if [[ -f "$CONF" ]]; then
  cp -n "$CONF" "$CONF.bak"
  sed -i -E "0,/^(\s*)theme:.*/s//\1theme: $THEME/" "$CONF"
  echo "Tema impostato in $CONF (copia di sicurezza: $CONF.bak)"
else
  echo "Attenzione: $CONF non trovato, imposta a mano 'theme: $THEME'." >&2
fi

install -d "$(dirname "$OVERRIDE")"
printf '[Seat:*]\ngreeter-session=%s\n' "$GREETER" > "$OVERRIDE"
echo "LightDM userà $GREETER (file: $OVERRIDE)"
echo
echo "Fatto. Esci dalla sessione (o riavvia) per vedere la nuova schermata."
echo "Se qualcosa va storto: Ctrl+Alt+F2, accedi, e lancia  sudo $0 --ripristina"
