import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const stagedOnly = args.has('--staged');

const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf',
  '.zip', '.gz', '.rar', '.7z', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'
]);

const allowedPlaceholderRegex = /(changeme|example|placeholder|dummy|your[_-]?|<[^>]+>|\$\{\{\s*secrets\.|\$\{[^}]+\}|process\.env\.|env\.|postgresql:\/\/<user>:<password>@<host>|postgresql:\/\/user:password@host|studylink_password|admin_password|studylink)/i;

const rules = [
  {
    name: 'Hardcoded credential assignment',
    regex: /\b(?:database_url|db_password|smtp_pass|vapid_private_key|api[_-]?key|secret[_-]?key|private[_-]?key|access[_-]?token|auth[_-]?token|jwt[_-]?secret)\b\s*[:=]\s*[^\n]+/i
  },
  {
    name: 'Database URL with inline password',
    regex: /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@[^\s]+/i
  },
  {
    name: 'Private key block',
    regex: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/
  },
  {
    name: 'GitHub personal token',
    regex: /\bghp_[A-Za-z0-9]{20,}\b/
  },
  {
    name: 'OpenAI style key',
    regex: /\bsk-[A-Za-z0-9]{20,}\b/
  }
];

function run(command) {
  return execSync(command, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

function getCandidateFiles() {
  if (stagedOnly) {
    const output = run('git diff --cached --name-only --diff-filter=ACMRTUXB');
    if (!output) return [];
    return output.split(/\r?\n/).filter(Boolean);
  }

  const output = run('git ls-files');
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

function shouldSkipFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('.git/')) return true;
  if (normalized === '.env.example' || normalized.endsWith('.sample') || normalized.endsWith('.example')) return false;
  if (normalized.startsWith('node_modules/')) return true;

  const ext = path.extname(normalized).toLowerCase();
  if (binaryExtensions.has(ext)) return true;

  try {
    const fullPath = path.join(repoRoot, relativePath);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return true;
    if (stat.size > 1024 * 1024) return true;
  } catch {
    return true;
  }

  return false;
}

function scanFile(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  const ext = path.extname(relativePath).toLowerCase();
  let content;
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    if (!line || line.length > 2000) return;
    if (line.trim().startsWith('#')) return;

    for (const rule of rules) {
      if (ext === '.md' && rule.name === 'Hardcoded credential assignment') {
        continue;
      }

      if (!rule.regex.test(line)) continue;
      if (allowedPlaceholderRegex.test(line)) continue;

      findings.push({
        file: relativePath,
        line: index + 1,
        rule: rule.name,
        sample: line.trim().slice(0, 220)
      });
      break;
    }
  });

  return findings;
}

function main() {
  const candidates = getCandidateFiles().filter((file) => !shouldSkipFile(file));
  let findings = [];

  for (const file of candidates) {
    findings = findings.concat(scanFile(file));
  }

  if (!findings.length) {
    console.log(`security-scan: OK (${stagedOnly ? 'staged files' : 'tracked files'})`);
    process.exit(0);
  }

  console.error('security-scan: potential secrets detected:');
  for (const item of findings) {
    console.error(`- ${item.file}:${item.line} [${item.rule}]`);
    console.error(`  ${item.sample}`);
  }

  console.error('\nReview these lines. Use placeholders or environment references instead of hardcoded secrets.');
  process.exit(1);
}

main();
