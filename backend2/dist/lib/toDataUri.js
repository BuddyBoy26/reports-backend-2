"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDataUri = toDataUri;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/* ───────── repo-root resolver ───────── */
const repoRoot = path_1.default
    .dirname(__filename) // …/src/lib
    .replace(/[/\\]src[/\\]lib$/, ""); // → project root
/* ───────── very small mime table ───────── */
const mime = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
};
/**
 * Convert any image reference to a base-64 `data:` URI.
 *
 *  • Already-embedded `data:` URIs are passed through untouched.
 *  • `http(s)://` URLs are fetched over the network.
 *  • Everything else is treated as a **local path relative to the repo root**.
 */
async function toDataUri(href) {
    if (!href)
        return null;
    if (href.startsWith("data:"))
        return href; // already done
    /* ── Remote image ─────────────────────────────────────────── */
    if (/^https?:\/\//i.test(href)) {
        try {
            const res = await fetch(href);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            const ct = res.headers.get("content-type") || "image/png";
            return `data:${ct};base64,${buf.toString("base64")}`;
        }
        catch (e) {
            console.warn("[assets] HTTP fetch failed:", href, e);
            return null;
        }
    }
    /* ── Local file ───────────────────────────────────────────── */
    try {
        const abs = path_1.default.isAbsolute(href) ? href : path_1.default.join(repoRoot, href);
        const buf = await promises_1.default.readFile(abs);
        const ext = path_1.default.extname(abs).slice(1).toLowerCase();
        const ct = mime[ext] || "application/octet-stream";
        return `data:${ct};base64,${buf.toString("base64")}`;
    }
    catch (e) {
        console.warn("[assets] Local read failed:", href, e);
        return null;
    }
}
