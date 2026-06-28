import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { assertHostRouting, closeServer, getOpenPort, startStubCms, waitForRenderer } from "./host-routing-harness.mjs"

const execFileAsync = promisify(execFile)
const imageTag = process.env.IMAGE_TAG

if (!imageTag) {
  console.error("IMAGE_TAG is required")
  process.exit(1)
}

const cms = await startStubCms({ listenHost: "0.0.0.0", publicHost: "host.docker.internal" })
const rendererPort = await getOpenPort()
const baseUrl = `http://127.0.0.1:${rendererPort}`
const containerName = `siteinabox-renderer-smoke-${process.pid}`

async function docker(args, options = {}) {
  return execFileAsync("docker", args, { maxBuffer: 1024 * 1024 * 10, ...options })
}

try {
  await docker([
    "run",
    "--rm",
    "-d",
    "--name",
    containerName,
    "--add-host",
    "host.docker.internal:host-gateway",
    "-e",
    "HOST=0.0.0.0",
    "-e",
    "PORT=4321",
    "-e",
    `SIAB_CMS_URL=${cms.url}`,
    "-e",
    `SITE_URL=${baseUrl}`,
    "-p",
    `${rendererPort}:4321`,
    imageTag,
  ])

  await waitForRenderer(baseUrl, async () => {
    const { stdout, stderr } = await docker(["logs", containerName]).catch((error) => ({
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error),
    }))
    return `${stdout}\n${stderr}`
  })
  await assertHostRouting(baseUrl, async () => {
    const { stdout, stderr } = await docker(["logs", containerName]).catch((error) => ({
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error),
    }))
    return `${stdout}\n${stderr}`
  })
} finally {
  await docker(["rm", "-f", containerName]).catch(() => {})
  await closeServer(cms.server)
}

console.log("Packaged renderer host-routing smoke OK")
