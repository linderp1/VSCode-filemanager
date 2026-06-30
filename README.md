# Longhorn File Browser

A lightweight, modern, read-only web file browser for files stored on a
[Longhorn](https://longhorn.io/) volume, designed to run on a Raspberry Pi
[k3s](https://k3s.io/) cluster and be exposed via [MetalLB](https://metallb.universe.tf/).

Built with **Next.js 15 / React 19 / TypeScript / Tailwind**. The whole app is a
single container — Next.js server-side API routes read the mounted volume; the
browser never touches the filesystem directly.

## Features

- Browse a shared volume mounted at `/data`. Top-level directories are presented
  as selectable "volumes" in the sidebar.
- Folder navigation with clickable breadcrumbs and shareable URLs (`?path=`).
- Client-side filter + sortable columns (name / size / modified).
- In-browser preview for images, PDFs and small text files; download for anything.
- **Read-only** — no upload, rename or delete. The PVC is mounted `readOnly`.
- Hardened pod: non-root, read-only root filesystem, all capabilities dropped.
- Path-traversal / symlink-escape guard on every filesystem access
  ([`src/lib/fs.ts`](src/lib/fs.ts) `safeResolve`).

## Architecture

| Route | Purpose |
| --- | --- |
| `GET /api/files?path=` | JSON directory listing |
| `GET /api/download?path=` | Stream a file as an attachment |
| `GET /api/preview?path=` | Inline image/pdf/text preview (text capped at 2 MiB) |
| `GET /api/health` | Liveness/readiness probe |

The browseable root is set by `DATA_ROOT` (default `/data`).

## Local development

```bash
npm install

# Point DATA_ROOT at any local folder to browse it.
mkdir -p sample/photos sample/docs
echo "hello" > sample/docs/readme.txt
DATA_ROOT=./sample npm run dev
```

Open <http://localhost:3000>.

Production build locally:

```bash
DATA_ROOT=./sample npm run build && DATA_ROOT=./sample npm start
```

## Container image (ARM64)

CI ([`.github/workflows/build.yml`](.github/workflows/build.yml)) builds a
`linux/arm64` image on every push to `main` and publishes it to GHCR:

```
ghcr.io/linderp1/vscode-filemanager:latest
```

> **One-time setup:** after the first successful build, open the package on GitHub
> (Profile → Packages → `vscode-filemanager`) and set its visibility to **Public**
> so the cluster can pull without an `imagePullSecret`.

Build it yourself instead:

```bash
docker buildx build --platform linux/arm64 \
  -t ghcr.io/linderp1/vscode-filemanager:latest --push .

# Or test locally against a sample folder:
docker buildx build --platform linux/arm64 -t filemanager:dev --load .
docker run --rm -p 3000:3000 -v "$PWD/sample:/data:ro" filemanager:dev
```

## Deploy to k3s

Everything — namespace, Longhorn PVC, Deployment and Service — is created by the
manifest, so a single apply provisions the whole stack:

```bash
kubectl apply -f k8s/filemanager-deployment.yaml
```

Requirements: Longhorn installed with a `ReadWriteMany`-capable StorageClass named
`longhorn` (edit `storageClassName` in the manifest if yours differs).

Watch the pod come up, then find the MetalLB-assigned IP and open it:

```bash
kubectl get pods -n filemanager -w
kubectl get svc filemanager -n filemanager
```

To pin a specific MetalLB address, set the
`metallb.universe.tf/loadBalancerIPs` annotation on the Service (commented in the
manifest). To browse a different PVC, change `claimName` in the manifest.
