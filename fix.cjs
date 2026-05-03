const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Fix dependencies
function fixDeps(deps) {
    if (!deps) return;
    for (const key in deps) {
        if (key.startsWith('@replit/') || key === '@workspace/api-client-react') {
            delete deps[key];
        } else if (deps[key] === 'catalog:') {
            deps[key] = 'latest';
        } else if (deps[key] === 'workspace:*') {
            deps[key] = 'latest';
        }
    }
}

fixDeps(pkg.dependencies);
fixDeps(pkg.devDependencies);
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));

// Fix vite.config.ts
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
const newViteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});`;
fs.writeFileSync(viteConfigPath, newViteConfig);

// Fix index.html
const indexHtmlPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
indexHtml = indexHtml.replace(/<script type="module">[\s\S]*?<\/script>/, ''); // Remove first replit script
indexHtml = indexHtml.replace(/<script type="module">import \{ injectIntoGlobalHook[\s\S]*?<\/script>/, ''); // Remove second replit script
indexHtml = indexHtml.replace(/<script type="module" src="\/@vite\/client"><\/script>/, ''); // Remove vite client
indexHtml = indexHtml.replace(/<script type="module">"use strict";\(\(\)=>\{var O="0\.5\.1"[\s\S]*?<\/script>/, ''); // Remove cartographer script
indexHtml = indexHtml.replace(/<script>\(function\(\) \{[\s\S]*?loadTailwind[\s\S]*?<\/script>/, ''); // Remove tailwind script
indexHtml = indexHtml.replace(/<script type="text\/javascript" src="\/@replit\/vite-plugin-dev-banner\/banner-script\.js".*?<\/script>/, '');
indexHtml = indexHtml.replace(/<script src="https:\/\/replit-cdn\.com\/replit-pill\/replit-pill\.global\.js".*?<\/script>/, '');
fs.writeFileSync(indexHtmlPath, indexHtml);
console.log('Fixes applied successfully.');
