import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkg = readJson('package.json')
const directDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
const errors = []

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

function installedPackageJson(name) {
  return packageJsonFromNodeModules(path.join(root, 'node_modules'), name).json
}

function packageJsonFromNodeModules(nodeModulesDir, name) {
  const packageJsonPath = path.join(nodeModulesDir, ...name.split('/'), 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Could not resolve package.json for ${name} from ${nodeModulesDir}`)
  }

  return {
    json: JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')),
    path: fs.realpathSync(packageJsonPath),
  }
}

function directVersion(name) {
  return directDeps[name]
}

const payloadPackageNames = Object.keys(directDeps)
  .filter((name) => name === 'payload' || name.startsWith('@payloadcms/'))
  .sort()

if (!payloadPackageNames.includes('payload')) {
  errors.push('payload must be a direct dependency')
}

const payloadVersion = directVersion('payload')

for (const name of payloadPackageNames) {
  const declared = directVersion(name)
  if (declared !== payloadVersion) {
    errors.push(`${name} is declared as ${declared}; expected ${payloadVersion}`)
  }

  const installed = installedPackageJson(name).version
  if (installed !== payloadVersion) {
    errors.push(`${name} is installed as ${installed}; expected ${payloadVersion}`)
  }
}

const richtextLexicalPackage = packageJsonFromNodeModules(
  path.join(root, 'node_modules'),
  '@payloadcms/richtext-lexical',
)
const richtextLexical = richtextLexicalPackage.json
const richtextNodeModules = path.resolve(path.dirname(richtextLexicalPackage.path), '../..')
const lexicalDeps = Object.entries(richtextLexical.dependencies ?? {})
  .filter(([name]) => name === 'lexical' || name.startsWith('@lexical/'))
  .sort(([a], [b]) => a.localeCompare(b))

for (const [name, expected] of lexicalDeps) {
  const declared = directVersion(name)
  if (declared !== undefined && declared !== expected) {
    errors.push(`${name} is declared as ${declared}; Payload richtext requires ${expected}`)
  }

  const installed = packageJsonFromNodeModules(richtextNodeModules, name).json.version
  if (installed !== expected) {
    errors.push(`${name} is installed as ${installed}; Payload richtext requires ${expected}`)
  }
}

if (errors.length > 0) {
  console.error('Payload dependency contract failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Payload dependency contract OK: ${payloadPackageNames.length} Payload packages at ${payloadVersion}, ${lexicalDeps.length} Lexical packages aligned with @payloadcms/richtext-lexical.`,
)
