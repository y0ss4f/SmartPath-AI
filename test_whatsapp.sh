#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# SmartPath AI — Direct WhatsApp test script
# Bypasses ALL app code and calls Meta API directly.
# Use this to verify your token and recipient number are valid.
#
# Usage:
#   chmod +x test_whatsapp.sh
#   ./test_whatsapp.sh +21698XXXXXX
#
# The phone number argument is the PARENT'S number (with country code).
# ─────────────────────────────────────────────────────────────────

set -e

# ── Load .env.local ───────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  echo "❌  .env.local not found. Run this script from the project root."
  exit 1
fi

TOKEN=$(grep '^META_WHATSAPP_TOKEN=' .env.local | cut -d '=' -f2- | tr -d '[:space:]')
PHONE_NUMBER_ID=$(grep '^META_WHATSAPP_PHONE_NUMBER_ID=' .env.local | cut -d '=' -f2- | tr -d '[:space:]')

if [ -z "$TOKEN" ]; then
  echo "❌  META_WHATSAPP_TOKEN not found in .env.local"
  exit 1
fi

if [ -z "$PHONE_NUMBER_ID" ]; then
  echo "❌  META_WHATSAPP_PHONE_NUMBER_ID not found in .env.local"
  exit 1
fi

# ── Recipient phone number ────────────────────────────────────────
RECIPIENT="$1"
if [ -z "$RECIPIENT" ]; then
  echo "Usage: ./test_whatsapp.sh +21698XXXXXX"
  echo "       (pass the parent's phone number with country code)"
  exit 1
fi

# Strip leading '+' — Meta v19 API wants 21698XXXXXX not +21698XXXXXX
RECIPIENT="${RECIPIENT#\+}"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  SmartPath AI — WhatsApp Direct Test"
echo "═══════════════════════════════════════════════════"
echo "  Phone Number ID : $PHONE_NUMBER_ID"
echo "  Recipient       : $RECIPIENT"
echo "  Token (first 20): ${TOKEN:0:20}..."
echo "═══════════════════════════════════════════════════"
echo ""
echo "📤 Sending test message..."
echo ""

RESPONSE=$(curl -s -w "\n__HTTP_STATUS__%{http_code}" \
  -X POST "https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"${RECIPIENT}\",
    \"type\": \"text\",
    \"text\": {\"body\": \"✅ SmartPath AI test réussi ! Votre configuration WhatsApp fonctionne correctement.\"}
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep '__HTTP_STATUS__' | sed 's/__HTTP_STATUS__//')
BODY=$(echo "$RESPONSE" | grep -v '__HTTP_STATUS__')

echo "HTTP Status : $HTTP_STATUS"
echo "Response    : $BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCCESS — Message sent! Check WhatsApp on $1"
  echo ""
  echo "If you don't receive it, the issue is Meta sandbox restrictions:"
  echo "  → Go to developers.facebook.com → Your App → WhatsApp → API Setup"
  echo "  → Under 'To', add $1 as a test recipient"
  echo "  → That number must first send any message to your Meta test number"
else
  echo "❌ FAILED — Meta API rejected the request."
  echo ""
  if echo "$BODY" | grep -q '"code":131030\|131030'; then
    echo "  Cause: Recipient +$RECIPIENT not in Meta sandbox allowlist"
    echo ""
    echo "  Fix (2 steps):"
    echo "  1. Go to developers.facebook.com → Your App → WhatsApp → API Setup"
    echo "     Under the 'To:' field, click 'Manage phone number list'"
    echo "     Add +$RECIPIENT and save"
    echo ""
    echo "  2. From +$RECIPIENT, send ANY WhatsApp message to your Meta test number"
    echo "     (the test number is shown on the API Setup page, e.g. +1 555 010 XXXX)"
    echo "     This opt-in step is required by Meta for sandbox testing."
    echo ""
    echo "  Then re-run this script to confirm it works."
  elif echo "$BODY" | grep -q "190\|OAuthException" && ! echo "$BODY" | grep -q "131030"; then
    echo "  Cause: TOKEN IS EXPIRED or INVALID"
    echo "  Fix:   Go to developers.facebook.com → Your App → WhatsApp → API Setup"
    echo "         Generate a new temporary token (or create a permanent System User token)"
    echo "         Update META_WHATSAPP_TOKEN in .env.local"
  elif echo "$BODY" | grep -q '"code":100\|Invalid parameter'; then
    echo "  Cause: Invalid phone number format or Phone Number ID"
    echo "  Verify: META_WHATSAPP_PHONE_NUMBER_ID in .env.local is correct"
  fi
fi

echo ""
