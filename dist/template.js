"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlShell = void 0;
const htmlShell = (head, body) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"></script>
  ${head}
</head>
<body class="text-slate-900">
  ${body}
</body>
</html>`;
exports.htmlShell = htmlShell;
