import assert from 'node:assert/strict';
import ts from 'typescript';

// HTML route checks miss broken browser imports. Follow both static and lazy
// imports through Vite's served module graph, including optimized dependencies.
const base = process.env.HOMEBUDDY_URL || 'http://localhost:3000';
const queue = [
  '/@id/__x00__virtual:vite-rsc/entry-browser',
  '/app/city/explorer.tsx',
  '/app/decorate/page.tsx',
  '/app/furnish/page.tsx',
  '/app/catalog/page.tsx',
];
const seen = new Set();
const failures = [];
while (queue.length) {
  const batch = queue.splice(0, 12).filter(path => {
    if (seen.has(path)) return false;
    seen.add(path);
    return true;
  });
  await Promise.all(batch.map(async path => {
    const response = await fetch(new URL(path, base), {signal: AbortSignal.timeout(30000)});
    const source = await response.text();
    if (!response.ok || !response.headers.get('content-type')?.includes('javascript')) {
      failures.push(`${response.status} ${response.statusText}: ${path}`);
      return;
    }
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const imports = [];
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        imports.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    for (const specifier of imports) {
      if (!specifier.startsWith('/') && !specifier.startsWith('.')) {
        failures.push(`Unresolved browser import ${specifier}: ${path}`);
        continue;
      }
      const url = new URL(specifier, new URL(path, base));
      if (url.pathname.endsWith('.css') && !url.search) url.search = '?import';
      queue.push(url.pathname + url.search);
    }
  }));
}
assert.deepEqual(failures, [], 'Every browser module must return JavaScript successfully');
console.log(`PASS: ${seen.size} browser modules load across the map, editor, furnishing, and catalog routes.`);
