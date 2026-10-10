#!/usr/bin/env bash
# Prüft ohne Anmeldung, ob Google die Rücksprungadressen des Web-Clients kennt
# (docs/google-anmeldung.md, Schritt 1). "ok" = Google leitet zur Anmeldung weiter,
# "FEHLT" = redirect_uri_mismatch. Die Supabase-Adresse dient als Gegenprobe.
CID=$(grep -o "GOOGLE_WEB_CLIENT_ID = '[^']*'" src/config/google.ts | cut -d"'" -f2)
for R in https://lernzeit.app/google-rueckkehr.html https://www.lernzeit.app/google-rueckkehr.html \
         https://fsmgynpdfxkaiiuguqyr.supabase.co/auth/v1/callback; do
  ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$R")
  ZIEL=$(curl -s -o /dev/null -w '%{redirect_url}' \
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=$CID&redirect_uri=$ENC&response_type=id_token&scope=openid%20email&nonce=n&state=s")
  case "$ZIEL" in
    *oauth/error*) echo "FEHLT  $R" ;;
    "") echo "?      $R (keine Antwort)" ;;
    *) echo "ok     $R" ;;
  esac
done
