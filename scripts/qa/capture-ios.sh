#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/qa/capture-ios.sh <simulator-UDID> <device-label> <screen> [pass] [public-url-prefix]
# Omit public-url-prefix to capture the screen reached through real authentication.
# Requires macOS, Xcode, an already booted simulator, and the running app.
if [[ $# -lt 3 || $# -gt 5 ]]; then
  echo 'Usage: capture-ios.sh <simulator-UDID> <device-label> <screen> [pass] [public-url-prefix]' >&2
  exit 2
fi
if [[ "$(uname -s)" != 'Darwin' ]] || ! command -v xcrun >/dev/null 2>&1; then
  echo 'iOS Simulator capture requires macOS and Xcode. No native screenshot was captured.' >&2
  exit 1
fi

task_udid="$1"
task_device_label="$2"
task_screen="$3"
task_pass="${4:-1}"
task_url_prefix="${5:-}"
[[ "$task_udid" =~ ^[A-Fa-f0-9-]+$ ]] || { echo 'Use an explicit simulator UDID.' >&2; exit 2; }
[[ "$task_device_label" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$ ]] || { echo 'Invalid device label.' >&2; exit 2; }
[[ "$task_pass" =~ ^([1-9]|10)$ ]] || { echo 'Pass must be 1 through 10.' >&2; exit 2; }
case "$task_screen" in
  get-started|sign-in|sign-up|verify|password|profile-setup|create-account|set-password|complete|home) ;;
  *) echo 'Unknown authentication screen.' >&2; exit 2 ;;
esac

# Probe current command availability on the installed Xcode before using it.
xcrun simctl help io >/dev/null
xcrun simctl help openurl >/dev/null
task_repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
task_output_dir="$task_repo_root/development/qa/auth/native/ios/$task_device_label"
mkdir -p "$task_output_dir"
printf -v task_file '%s/%s-pass-%02d.png' "$task_output_dir" "$task_screen" "$task_pass"
[[ ! -e "$task_file" ]] || { echo 'Capture already exists; use the next pass to preserve history.' >&2; exit 2; }

if [[ -n "$task_url_prefix" ]]; then
  [[ "$task_url_prefix" =~ ^[A-Za-z][A-Za-z0-9+.-]*://[A-Za-z0-9.:/_-]*$ ]] || { echo 'Invalid public URL prefix.' >&2; exit 2; }
  case "$task_screen" in
    get-started) task_route_path='' ;;
    sign-in|sign-up) task_route_path="$task_screen" ;;
    *) echo 'Only public entry screens may be opened automatically. Complete real authentication for other screens.' >&2; exit 2 ;;
  esac
  xcrun simctl openurl "$task_udid" "$task_url_prefix$task_route_path"
  sleep 2
fi
xcrun simctl io "$task_udid" screenshot --type=png "$task_file"
# Store tooling/device inventory beside the image; never collect credentials or app storage.
printf '%s\n' "source=ios-xcrun-simctl-io-screenshot" "capturedAtUtc=$(date -u +%Y-%m-%dT%H:%M:%SZ)" "simulatorUDID=$task_udid" "screenLabel=$task_screen" "pass=$task_pass" "routeVerification=operator-confirmed; no authentication bypass" > "${task_file%.png}.capture.txt"
xcrun simctl list devices available > "$task_output_dir/device-inventory.txt"
printf '%s\n' "$task_file"
