#!/bin/bash
ROOT_DIR=$PWD
echo "Root: $ROOT_DIR"

# Kill ports just in case
fuser -k 3000/tcp > /dev/null 2>&1
fuser -k 3001/tcp > /dev/null 2>&1
sleep 2

# Start Notary
echo "Starting Notary..."
(cd "$ROOT_DIR/apps/notary" && npm run dev) > "$ROOT_DIR/notary.log" 2>&1 &
NOTARY_PID=$!

# Start Registry
echo "Starting Registry..."
(cd "$ROOT_DIR/apps/revocation-registry" && npm run dev) > "$ROOT_DIR/registry.log" 2>&1 &
REGISTRY_PID=$!

# Wait for startup
echo "Waiting for services to start (15s)..."
sleep 15

# Run Verification Script
echo "Running Verification..."
cd "$ROOT_DIR/apps/notary"
./node_modules/.bin/ts-node ../../verify-trust.ts

EXIT_CODE=$?

# Cleanup
echo "Stopping services..."
kill $NOTARY_PID
kill $REGISTRY_PID

echo "Done. Exit code: $EXIT_CODE"
if [ $EXIT_CODE -eq 0 ]; then
    echo "VERIFICATION SUCCESS"
else
    echo "VERIFICATION FAILED"
    echo "--- Notary Log Tail ---"
    tail -n 20 "$ROOT_DIR/notary.log"
    echo "--- Registry Log Tail ---"
    tail -n 20 "$ROOT_DIR/registry.log"
fi
exit $EXIT_CODE
