#!/bin/bash
# =============================================================================
# SmartPath AI — Sprint 3 Test Script
# Tests all 3 AI API routes sequentially (Flow A → B → C)
# =============================================================================
# Usage:
#   1. Start the dev server:  npm run dev
#   2. Set variables below, then run:  bash test_sprint3.sh
# =============================================================================

BASE_URL="http://localhost:3000"

# ---------- CONFIGURE THESE ----------
# Get a valid student_id from your Supabase `students` table
STUDENT_ID="7891fd82-351c-46f8-9b9e-4bf97650a468"
# Path to a real notebook photo (French or Arabic handwriting)
IMAGE_PATH="./test_notebook.jpeg"
# Your parent session cookie (copy from browser DevTools → Application → Cookies)
# Look for the cookie starting with "sb-"
AUTH_COOKIE="sb-liajsiovdjseguzmgqid-auth-token=eyJhY2Nlc3NfdG9rZW4iOiJleUpoYkdjaU9pSkZVekkxTmlJc0ltdHBaQ0k2SW1Oa01USTRZV1l4TFdGbU1qWXROREEwTlMwNU16QXhMV1F5TnpVNE5HUmxNalpsTkNJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcGMzTWlPaUpvZEhSd2N6b3ZMMnhwWVdwemFXOTJaR3B6WldkMWVtMW5jV2xrTG5OMWNHRmlZWE5sTG1OdkwyRjFkR2d2ZGpFaUxDSnpkV0lpT2lJM09Ea3habVE0TWkwek5URmpMVFEyWmpndE9XSTVaUzAwWW1ZNU56WTFNR0UwTmpnaUxDSmhkV1FpT2lKaGRYUm9aVzUwYVdOaGRHVmtJaXdpWlhod0lqb3hOemMwTVRBNE9UYzJMQ0pwWVhRaU9qRTNOelF4TURVek56WXNJbVZ0WVdsc0lqb2lkR1Z6ZERSQVpYaGxiWEJzWlM1amIyMGlMQ0p3YUc5dVpTSTZJaUlzSW1Gd2NGOXRaWFJoWkdGMFlTSTZleUp3Y205MmFXUmxjaUk2SW1WdFlXbHNJaXdpY0hKdmRtbGtaWEp6SWpwYkltVnRZV2xzSWwxOUxDSjFjMlZ5WDIxbGRHRmtZWFJoSWpwN0ltVnRZV2xzSWpvaWRHVnpkRFJBWlhobGJYQnNaUzVqYjIwaUxDSmxiV0ZwYkY5MlpYSnBabWxsWkNJNmRISjFaU3dpY0dodmJtVmZiblZ0WW1WeUlqb2lLekl4TmpJeU16UTFOamM0SWl3aWNHaHZibVZmZG1WeWFXWnBaV1FpT21aaGJITmxMQ0p5YjJ4bElqb2ljR0Z5Wlc1MElpd2ljM1ZpSWpvaU56ZzVNV1prT0RJdE16VXhZeTAwTm1ZNExUbGlPV1V0TkdKbU9UYzJOVEJoTkRZNEluMHNJbkp2YkdVaU9pSmhkWFJvWlc1MGFXTmhkR1ZrSWl3aVlXRnNJam9pWVdGc01TSXNJbUZ0Y2lJNlczc2liV1YwYUc5a0lqb2ljR0Z6YzNkdmNtUWlMQ0owYVcxbGMzUmhiWEFpT2pFM056UXhNRFV6TnpaOVhTd2ljMlZ6YzJsdmJsOXBaQ0k2SWpWaVkyUmpNVGRpTFRSbVpXUXRORGhpTUMxaU56QXpMVGxqWVRBNFl6TTBaRGN4WlNJc0ltbHpYMkZ1YjI1NWJXOTFjeUk2Wm1Gc2MyVjkuSXlERXRhOE5yUjRMLVRnTml5Uy1kYVJSQ2dWOXJ2OWFHUWx6d1JfbE9ZcU1Ld01HdEFLR1dXckoySkxkVXItcU40YVZucUtvcXVOeFpHaWZVWFphTlEiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6MzYwMCwiZXhwaXJlc19hdCI6MTc3NDEwODk3NiwicmVmcmVzaF90b2tlbiI6IjJlbWp0ZWkyeDd1ZiIsInVzZXIiOnsiaWQiOiI3ODkxZmQ4Mi0zNTFjLTQ2ZjgtOWI5ZS00YmY5NzY1MGE0NjgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJlbWFpbCI6InRlc3Q0QGV4ZW1wbGUuY29tIiwiZW1haWxfY29uZmlybWVkX2F0IjoiMjAyNi0wMy0yMVQxNTowMjo1Ni45MTIyMDE4MzVaIiwicGhvbmUiOiIiLCJsYXN0X3NpZ25faW5fYXQiOiIyMDI2LTAzLTIxVDE1OjAyOjU2LjkxNzgwODExNloiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3Q0QGV4ZW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX251bWJlciI6IisyMTYyMjM0NTY3OCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicm9sZSI6InBhcmVudCIsInN1YiI6Ijc4OTFmZDgyLTM1MWMtNDZmOC05YjllLTRiZjk3NjUwYTQ2OCJ9LCJpZGVudGl0aWVzIjpbeyJpZGVudGl0eV9pZCI6IjAzOWI0ZDUzLWI3ZDEtNDI0Mi1hOWJlLTdjZTdmOWQ5NzBhZiIsImlkIjoiNzg5MWZkODItMzUxYy00NmY4LTliOWUtNGJmOTc2NTBhNDY4IiwidXNlcl9pZCI6Ijc4OTFmZDgyLTM1MWMtNDZmOC05YjllLTRiZjk3NjUwYTQ2OCIsImlkZW50aXR5X2RhdGEiOnsiZW1haWwiOiJ0ZXN0NEBleGVtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV9udW1iZXIiOiIrMjE2MjIzNDU2NzgiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInJvbGUiOiJwYXJlbnQiLCJzdWIiOiI3ODkxZmQ4Mi0zNTFjLTQ2ZjgtOWI5ZS00YmY5NzY1MGE0NjgifSwicHJvdmlkZXIiOiJlbWFpbCIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjYtMDMtMjFUMTU6MDI6NTYuOTAyMzQwMTQzWiIsImNyZWF0ZWRfYXQiOiIyMDI2LTAzLTIxVDE1OjAyOjU2LjkwMjM4N1oiLCJ1cGRhdGVkX2F0IjoiMjAyNi0wMy0yMVQxNTowMjo1Ni45MDIzODdaIiwiZW1haWwiOiJ0ZXN0NEBleGVtcGxlLmNvbSJ9XSwiY3JlYXRlZF9hdCI6IjIwMjYtMDMtMjFUMTU6MDI6NTYuODY5OTc0WiIsInVwZGF0ZWRfYXQiOiIyMDI2LTAzLTIxVDE1OjAyOjU2Ljk0ODA2WiIsImlzX2Fub255bW91cyI6ZmFsc2V9fQ"
# --------------------------------------

echo "========================================="
echo " Sprint 3 — API Route Tests"
echo "========================================="
echo ""

# ---- Test 1: Flow A — Generate Quiz ----
echo "▶ Test 1: POST /api/generate-quiz (Flow A)"
echo "  Image: $IMAGE_PATH"
echo "  Student: $STUDENT_ID"
echo ""

QUIZ_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/generate-quiz" \
  -b "$AUTH_COOKIE" \
  -F "image=@$IMAGE_PATH" \
  -F "student_id=$STUDENT_ID" \
  -F "subject=Mathématiques")

HTTP_CODE=$(echo "$QUIZ_RESPONSE" | tail -1)
QUIZ_BODY=$(echo "$QUIZ_RESPONSE" | sed '$d')

echo "  Status: $HTTP_CODE"
echo "  Response: $QUIZ_BODY"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Flow A failed. Fix before continuing."
  exit 1
fi

# Extract quiz_id for next tests
QUIZ_ID=$(echo "$QUIZ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['quiz_id'])" 2>/dev/null)
echo "  ✓ quiz_id: $QUIZ_ID"
echo ""

# ---- Test 2: Flow B — Generate Course ----
echo "▶ Test 2: POST /api/generate-course (Flow B)"
echo "  quiz_id: $QUIZ_ID"
echo ""

# Simulate 2 wrong answers from the quiz
COURSE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/generate-course" \
  -b "$AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{
    \"quiz_id\": \"$QUIZ_ID\",
    \"initial_score\": 3,
    \"wrong_answers\": [
      { \"question\": \"Sample wrong question 1\", \"selected\": \"Wrong answer\", \"correct\": \"Right answer\" },
      { \"question\": \"Sample wrong question 2\", \"selected\": \"Wrong answer\", \"correct\": \"Right answer\" }
    ]
  }")

HTTP_CODE=$(echo "$COURSE_RESPONSE" | tail -1)
COURSE_BODY=$(echo "$COURSE_RESPONSE" | sed '$d')

echo "  Status: $HTTP_CODE"
echo "  Response: $COURSE_BODY"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Flow B failed. Fix before continuing."
  exit 1
fi
echo "  ✓ Course generated successfully"
echo ""

# ---- Test 3: Flow C — Generate Final Quiz ----
echo "▶ Test 3: POST /api/generate-final-quiz (Flow C)"
echo "  quiz_id: $QUIZ_ID"
echo ""

FINAL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/generate-final-quiz" \
  -b "$AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{ \"quiz_id\": \"$QUIZ_ID\" }")

HTTP_CODE=$(echo "$FINAL_RESPONSE" | tail -1)
FINAL_BODY=$(echo "$FINAL_RESPONSE" | sed '$d')

echo "  Status: $HTTP_CODE"
echo "  Response: $FINAL_BODY"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Flow C failed."
  exit 1
fi
echo "  ✓ Final quiz generated successfully"
echo ""

# ---- Error Tests ----
echo "========================================="
echo " Error / Edge Case Tests"
echo "========================================="
echo ""

echo "▶ Test 4: Missing student_id → expect 400"
ERR1=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate-quiz" \
  -b "$AUTH_COOKIE" \
  -F "image=@$IMAGE_PATH")
echo "  Status: $ERR1 (expected: 400)"
echo ""

echo "▶ Test 5: Nonexistent quiz_id → expect 404"
ERR2=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate-course" \
  -H "Content-Type: application/json" \
  -d '{ "quiz_id": "00000000-0000-0000-0000-000000000000", "initial_score": 3, "wrong_answers": [] }')
echo "  Status: $ERR2 (expected: 404)"
echo ""

echo "▶ Test 6: Final quiz without course → expect 400"
# This would need a quiz_id that has no generated_course_json yet
echo "  (Manual test — create a quiz without running Flow B, then call Flow C)"
echo ""

echo "========================================="
echo " All tests complete!"
echo "========================================="
