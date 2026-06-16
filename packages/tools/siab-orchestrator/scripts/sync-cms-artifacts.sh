#!/bin/sh
# Sync compiled CMS canvas artifacts from a built site image into the
# Payload tenant data directory.
#
# Intended deployment order:
#   1. GitHub Actions publishes ghcr.io/optidigi/siteinabox-site-<slug>:latest.
#   2. Run this script on the Docker host that can write the tenant data dir.
#   3. Start/restart the site container with the tenant data dir mounted :ro.

set -eu

ENGINE="${CONTAINER_ENGINE:-docker}"
IMAGE=""
TENANT_DIR=""
ARTIFACT_DIR=""
SKIP_PULL=0

usage() {
  cat >&2 <<'EOF'
usage: scripts/sync-cms-artifacts.sh --image <image> --tenant-dir <path> [--artifact-dir <path>] [--engine docker|podman] [--skip-pull]

Examples:
  scripts/sync-cms-artifacts.sh \
    --image ghcr.io/optidigi/siteinabox-site-ami-care:latest \
    --tenant-dir /srv/data/saas/siab-payload/tenants/7

  CONTAINER_ENGINE=podman scripts/sync-cms-artifacts.sh --image ... --tenant-dir ...
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --tenant-dir)
      TENANT_DIR="${2:-}"
      shift 2
      ;;
    --artifact-dir)
      ARTIFACT_DIR="${2:-}"
      shift 2
      ;;
    --engine)
      ENGINE="${2:-}"
      shift 2
      ;;
    --skip-pull)
      SKIP_PULL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [ -z "$IMAGE" ] || [ -z "$TENANT_DIR" ]; then
  usage
  exit 2
fi

if ! command -v "$ENGINE" >/dev/null 2>&1; then
  echo "container engine not found: $ENGINE" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
ARTIFACT_TMP="$TMP_DIR/artifacts"
CID=""
cleanup() {
  if [ -n "$CID" ]; then
    "$ENGINE" rm "$CID" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

if [ "$SKIP_PULL" -eq 0 ]; then
  "$ENGINE" pull "$IMAGE"
fi

CID="$("$ENGINE" create "$IMAGE")"

IMAGE_BASENAME="${IMAGE##*/}"
IMAGE_BASENAME="${IMAGE_BASENAME%%:*}"
IMAGE_BASENAME="${IMAGE_BASENAME%%@*}"
SITE_SLUG=""
case "$IMAGE_BASENAME" in
  siteinabox-site-*)
    SITE_SLUG="${IMAGE_BASENAME#siteinabox-site-}"
    ;;
esac

mkdir -p "$ARTIFACT_TMP"
ARTIFACT_CANDIDATES=""
if [ -n "$ARTIFACT_DIR" ]; then
  ARTIFACT_CANDIDATES="$ARTIFACT_DIR"
fi
ARTIFACT_CANDIDATES="$ARTIFACT_CANDIDATES /app/dist/cms"
if [ -n "$SITE_SLUG" ]; then
  ARTIFACT_CANDIDATES="$ARTIFACT_CANDIDATES /repo/sites/$SITE_SLUG/dist/cms"
fi
ARTIFACT_CANDIDATES="$ARTIFACT_CANDIDATES /repo/packages/site-template/dist/cms"

FOUND_ARTIFACT_DIR=""
for candidate in $ARTIFACT_CANDIDATES; do
  rm -rf "$ARTIFACT_TMP"
  mkdir -p "$ARTIFACT_TMP"
  if "$ENGINE" cp "$CID:$candidate/." "$ARTIFACT_TMP/" >/dev/null 2>&1; then
    if [ -f "$ARTIFACT_TMP/cms-editor.css" ]; then
      FOUND_ARTIFACT_DIR="$candidate"
      break
    fi
  fi
done

if [ -z "$FOUND_ARTIFACT_DIR" ]; then
  echo "image did not contain cms-editor.css in any known artifact path: $IMAGE" >&2
  echo "checked:$ARTIFACT_CANDIDATES" >&2
  exit 1
fi

mkdir -p "$TENANT_DIR"
cp -f "$ARTIFACT_TMP/cms-editor.css" "$TENANT_DIR/cms-editor.css"

if [ -d "$ARTIFACT_TMP/files" ]; then
  mkdir -p "$TENANT_DIR/files"
  cp -R "$ARTIFACT_TMP/files/." "$TENANT_DIR/files/"
fi

echo "synced CMS artifacts from $IMAGE"
echo "  from:  $FOUND_ARTIFACT_DIR"
echo "  css:   $TENANT_DIR/cms-editor.css"
if [ -d "$TENANT_DIR/files" ]; then
  echo "  files: $TENANT_DIR/files/"
fi
