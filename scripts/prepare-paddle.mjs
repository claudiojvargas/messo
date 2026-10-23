import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const root = new URL('../public/ocr-paddle.local/', import.meta.url)
await mkdir(root, { recursive: true })
const receipts = []
const expected = { det: 'ff6ab415b0a6e0c488550f2fb5d5046f1719848df220b2dc21b56402a65bc05d', rec: '1e13b22717b1edd89d4cde4fda272b6c17d5b505c97c2baea99da1a3a2d54b29' }
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
for (const role of ['det', 'rec']) {
  const name = `PP-OCRv6_tiny_${role}`
  const url = `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/${name}_onnx_infer.tar`
  // curl honors the cloud HTTPS proxy; do not disable certificate verification.
  let bytes
  try { bytes = await readFile(new URL(`${name}.tar`, root)) } catch { /* first setup */ }
  if (!bytes || sha256(bytes) !== expected[role]) bytes = execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--connect-timeout', '30', '--max-time', '300', url], { maxBuffer: 256 * 1024 * 1024 })
  if (sha256(bytes) !== expected[role]) throw new Error(`Model checksum mismatch: ${name}`)
  if (bytes.subarray(257, 262).toString() !== 'ustar') throw new Error(`Invalid uncompressed model archive: ${name}`)
  // TLS remains enabled. The SDK additionally validates inference.yml and ONNX model identity.
  await writeFile(new URL(`${name}.tar`, root), bytes)
  receipts.push({ file: `${name}.tar`, source: url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
for (const name of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  const source = new URL(`../node_modules/onnxruntime-web/dist/${name}`, import.meta.url)
  await copyFile(source, new URL(name, root))
  const bytes = await readFile(source)
  receipts.push({ file: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
await writeFile(new URL('manifest.json', root), JSON.stringify(receipts, null, 2))
console.log(JSON.stringify(receipts, null, 2))
