"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
//src/server.ts
const fs_1 = __importDefault(require("fs"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const serverless_express_1 = __importDefault(require("@vendia/serverless-express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const puppeteer = __importStar(require("puppeteer-core"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const supabase_js_1 = require("@supabase/supabase-js");
const schema_js_1 = require("./schema.js");
const renderers_js_1 = require("./renderers.js");
const template_js_1 = require("./template.js");
const toDataUri_js_1 = require("./lib/toDataUri.js"); // helper
const geminiExtractor_js_1 = require("./services/geminiExtractor.js");
const documentProcessor_js_1 = require("./services/documentProcessor.js");
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const client_sts_1 = require("@aws-sdk/client-sts");
const sts = new client_sts_1.STSClient({});
/* ──────────────────────────────────────────────────────────── */
/* ---------- Environment ---------- */
if (!process.env.GEMINI_API_KEY) {
    console.error('WARNING: GEMINI_API_KEY not found in environment variables');
    console.error('Document extraction will not work without this key');
}
/* ---------- Initialize services ---------- */
const geminiExtractor = new geminiExtractor_js_1.GeminiExtractor();
const documentProcessor = new documentProcessor_js_1.DocumentProcessor();
/* ---------- Supabase client ---------- */
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const exec = util_1.default.promisify(child_process_1.execFile);
async function verifyChromiumAccess(chromiumPath) {
    try {
        const stats = fs_1.default.statSync(chromiumPath);
        console.log(`[Chromium] Exists: ${stats.isFile()}`);
        console.log(`[Chromium] Mode: ${stats.mode.toString(8)}`);
        // Try to run `--version`
        const { stdout } = await exec(chromiumPath, ['--version']);
        console.log(`[Chromium] Launch successful: ${stdout.trim()}`);
    }
    catch (err) {
        console.error('[Chromium] Launch test failed:', err.message || err);
    }
}
/* ---------- Express setup ---------- */
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "5mb", type: ["application/json", "application/*+json"] }));
app.use((0, cors_1.default)({
    origin: [
        "*"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", (0, cors_1.default)());
app.use((0, morgan_1.default)("dev"));
/* ---------- Helpers ---------- */
function justifyCSS(a) {
    return a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";
}
function escapeHtml(s) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function asciiFilename(raw) {
    return (raw
        .normalize("NFKD")
        .replace(/[\u0080-\uFFFF]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^\W+|\W+$/g, "") || "report");
}
// ── S3 setup ────────────────────────────────
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGIONaa,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_IDaa,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEYaa,
    },
});
const bucketName = process.env.AWS_S3_BUCKET;
console.log("access ID Key", process.env.AWS_ACCESS_KEY_IDaa);
console.log("access SECRET Key", process.env.AWS_SECRET_ACCESS_KEYaa);
console.log("S3 Bucket", process.env.AWS_S3_BUCKETaa);
// ── Multer setup ────────────────────────────
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/* ---------- Embed images as data URIs ---------- */
async function hydrateAssets(report) {
    report.assets.logo = (await (0, toDataUri_js_1.toDataUri)(report.assets.logo)) ?? report.assets.logo;
    report.assets.headerImage = (await (0, toDataUri_js_1.toDataUri)(report.assets.headerImage)) ?? report.assets.headerImage;
    report.assets.footerImage = (await (0, toDataUri_js_1.toDataUri)(report.assets.footerImage)) ?? report.assets.footerImage;
    report.assets.backgroundImage = (await (0, toDataUri_js_1.toDataUri)(report.assets.backgroundImage)) ?? report.assets.backgroundImage;
    await Promise.all(report.components.map(async (c) => {
        if (c.type === "image") {
            const p = c.props;
            p.url = (await (0, toDataUri_js_1.toDataUri)(p.url)) ?? p.url;
        }
    }));
}
/* ---------- Header / footer templates ---------- */
function headerTemplate(report) {
    if (!report.configs.header.visible)
        return "<div></div>";
    const title = report.assets.headerImage
        ? `<img src="${report.assets.headerImage}" style="height:18px;">`
        : `<div style="font-weight:600;">${escapeHtml(report.reportName)}</div>`;
    const logo = report.assets.logo
        ? `<img src="${report.assets.logo}" style="height:14px;margin-right:8px;">`
        : "";
    return `
<div style="
  font-size:10px;
  color:${report.colors.text};
  width:100%;
  padding:4px 0;
  display:flex;
  align-items:center;
  justify-content:${justifyCSS(report.configs.header.align)};
  border-bottom:1px solid ${report.colors.border};
  font-family:${report.configs.font.family};
  margin:0 15mm;
">${logo}${title}</div>`;
}
function footerTemplate(report) {
    if (!report.configs.footer.visible)
        return "<div></div>";
    const raw = report.configs.footer.text || "Page {{page}} of {{pages}}";
    const txt = raw
        .replaceAll("{{page}}", '&nbsp;<span class="pageNumber"></span>&nbsp;')
        .replaceAll("{{pages}}", '&nbsp;<span class="totalPages"></span>')
        .replace(/^Page\b/i, '<span style="padding-right:2px;">Page</span>')
        .replace(/\bof\b/i, '<span style="padding:0 2px;">of</span>');
    const img = report.assets.footerImage
        ? `<img src="${report.assets.footerImage}" style="height:14px;margin-right:8px;">`
        : "";
    return `
<div style="
  font-size:10px;
  color:${report.colors.text};
  width:100%;
  padding:4px 0;
  display:flex;
  align-items:center;
  justify-content:${justifyCSS(report.configs.footer.align)};
  border-top:1px solid ${report.colors.border};
  font-family:${report.configs.font.family};
  margin:0 15mm;
  font-variant-numeric: tabular-nums;
">${img}${txt}</div>`;
}
/* ---------- Routes ---------- */
app.get("/", (_req, res) => res.json({ status: "ok" }));
/* ---- Live HTML preview ---- */
app.post("/render", async (req, res) => {
    const parsed = schema_js_1.ReportSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    const report = parsed.data;
    await hydrateAssets(report);
    const html = (0, template_js_1.htmlShell)((0, renderers_js_1.renderHead)(report), (0, renderers_js_1.renderBody)(report));
    res.type("text/html; charset=utf-8").send(html);
});
/* ---- PDF generation ---- */
app.post("/render.pdf", async (req, res) => {
    console.log("Received /render.pdf request");
    const parsed = schema_js_1.ReportSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    const report = parsed.data;
    await hydrateAssets(report);
    const html = (0, template_js_1.htmlShell)((0, renderers_js_1.renderHead)(report) +
        `<style>@media print {.fixed-header,.fixed-footer{display:none!important}}</style>
      `, (0, renderers_js_1.renderBody)(report));
    let browser = null;
    try {
        const exePath = await chromium_1.default.executablePath();
        console.log("Chromium path in Lambda:", exePath);
        console.log("Chromium args:", chromium_1.default.args);
        console.log("........................");
        await verifyChromiumAccess(exePath);
        console.log("........................");
        fs_1.default.chmodSync(exePath, 0o755);
        console.log("[Chromium] Permissions fixed:", fs_1.default.statSync(exePath).mode.toString(8));
        browser = await puppeteer.launch({
            args: chromium_1.default.args,
            defaultViewport: {
                width: 1280,
                height: 720
            },
            executablePath: await chromium_1.default.executablePath(),
            headless: true,
        });
        console.log("Browser launched", browser);
        const html2 = '<!DOCTYPE html><html><body><h1>Hello, PDF!</h1><h2>Hello, PDF!</h2></body></html>';
        const page = await browser.newPage();
        page.on("pageerror", (e) => console.error("[pageerror]", e));
        page.on("console", (m) => m.type() === "error" && console.error("[console]", m.text()));
        const res1 = await page.setContent(html, { waitUntil: ["load", "domcontentloaded", "networkidle0"] });
        const res2 = await page.emulateMediaType("print");
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log("Body text length:", bodyText.length);
        console.log("Body text sample:", bodyText.substring(0, 200));
        console.log("Page created:", page);
        console.log("Page setContent result:", res1);
        console.log("Page emulateMediaType result:", res2);
        console.log("html:", html);
        const pdf = await page.pdf({
            format: report.configs.page.size === "Letter" ? "Letter" : "A4",
            landscape: report.configs.page.orientation === "landscape",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: headerTemplate(report),
            footerTemplate: footerTemplate(report),
            margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
            preferCSSPageSize: false,
        });
        console.log("PDF generated:", pdf);
        await browser.close();
        const filename = asciiFilename(report.reportName) + ".pdf";
        res
            .status(200)
            .setHeader("Content-Type", "application/pdf")
            .setHeader("Content-Disposition", `inline; filename="${filename}"`)
            .setHeader("Content-Length", String(pdf.length))
            .end(pdf);
    }
    catch (e) {
        console.error("PDF render failed:", e?.message || e);
        res.status(500).json({ error: "PDF render failed", detail: String(e?.message || e) });
    }
    finally {
        if (browser)
            await browser.close();
    }
});
/* ---- Bill of Entry Extraction ---- */
app.post("/extract-bill-data", async (req, res) => {
    try {
        const { pdfData, claimId } = req.body;
        if (!pdfData) {
            return res.status(400).json({
                success: false,
                message: 'Missing pdfData parameter'
            });
        }
        console.log('[Extraction] Starting extraction process...');
        console.log('[Extraction] Claim ID:', claimId);
        // Fetch current field labels from Supabase if claimId provided
        let fieldLabels = {};
        if (claimId) {
            try {
                const { data: claimData, error: claimError } = await supabase
                    .from('claims')
                    .select('form_data')
                    .eq('id', claimId)
                    .single();
                if (!claimError && claimData?.form_data?.field_labels) {
                    fieldLabels = claimData.form_data.field_labels;
                    console.log('[Extraction] Using custom field labels:', Object.keys(fieldLabels).length, 'labels');
                }
                else {
                    console.log('[Extraction] No custom labels found, using defaults');
                }
            }
            catch (err) {
                console.warn('[Extraction] Could not fetch claim data:', err);
            }
        }
        // Convert base64 to buffer
        const buffer = Buffer.from(pdfData, 'base64');
        console.log('[Extraction] PDF buffer size:', buffer.length);
        // Process PDF
        const processedDoc = await documentProcessor.processPDF(buffer);
        // Extract with dynamic labels
        const extractedData = await geminiExtractor.extractBillOfEntryData(processedDoc.text, fieldLabels);
        console.log('[Extraction] Completed successfully');
        console.log('[Extraction] Extracted fields:', Object.keys(extractedData).length);
        res.json({
            success: true,
            extractedData: extractedData,
            metadata: {
                pages: processedDoc.pages,
                textLength: processedDoc.text.length,
                extractedFields: Object.keys(extractedData).length,
                usedCustomLabels: Object.keys(fieldLabels).length > 0
            }
        });
    }
    catch (error) {
        console.error('[Extraction] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.post("/extract-selective-fields", async (req, res) => {
    try {
        const { pdfData, claimId, fieldsToExtract, documentType } = req.body;
        if (!pdfData) {
            return res.status(400).json({
                success: false,
                message: 'Missing pdfData parameter'
            });
        }
        if (!fieldsToExtract || !Array.isArray(fieldsToExtract)) {
            return res.status(400).json({
                success: false,
                message: 'fieldsToExtract must be an array'
            });
        }
        console.log('[Selective Extraction] Starting extraction process...');
        console.log('[Selective Extraction] Document Type:', documentType);
        console.log('[Selective Extraction] Fields to extract:', fieldsToExtract);
        console.log('[Selective Extraction] Claim ID:', claimId);
        // Convert base64 to buffer
        const buffer = Buffer.from(pdfData, 'base64');
        console.log('[Selective Extraction] PDF buffer size:', buffer.length);
        // Process PDF using your existing processor
        const processedDoc = await documentProcessor.processPDF(buffer);
        console.log('[Selective Extraction] PDF processed, text length:', processedDoc.text.length);
        // Extract using Gemini with ONLY the specified fields
        const extractedData = await geminiExtractor.extractSelectiveFields(processedDoc.text, fieldsToExtract, documentType);
        const fieldsFound = Object.keys(extractedData).length;
        console.log('[Selective Extraction] Completed successfully');
        console.log('[Selective Extraction] Fields found:', fieldsFound, '/', fieldsToExtract.length);
        res.json({
            success: true,
            extractedData: extractedData,
            fieldsFound: fieldsFound,
            fieldsRequested: fieldsToExtract.length,
            metadata: {
                pages: processedDoc.pages,
                textLength: processedDoc.text.length,
                documentType: documentType
            },
            message: `Successfully extracted ${fieldsFound} out of ${fieldsToExtract.length} requested fields`
        });
    }
    catch (error) {
        console.error('[Selective Extraction] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// ── Upload route ────────────────────────────
app.post("/upload-image", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const identity = await sts.send(new client_sts_1.GetCallerIdentityCommand({}));
        console.log("Current AWS Identity:", identity);
        const timestamp = Date.now();
        const safeName = req.file.originalname.replace(/\s+/g, "_");
        const key = `${safeName}_${timestamp}`;
        await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL: "public-read", // optional if bucket is public
        }));
        const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        console.log("[Upload] Success:", fileUrl);
        res.json({ success: true, url: fileUrl });
    }
    catch (err) {
        console.error("[Upload] Failed:", err);
        res.status(500).json({ error: "Upload failed", detail: err.message });
    }
});
/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
});
/* ---------- Listen ---------- */
const port = Number(process.env.PORT || 5000);
// app.listen(port, "0.0.0.0", () => {
//   console.log(`Renderer running at http://localhost:${port}`);
//   console.log('Gemini API configured:', !!process.env.GEMINI_API_KEY);
//   console.log('Available routes:');
//   console.log('  GET  / - Health check');
//   console.log('  POST /render - HTML preview');
//   console.log('  POST /render.pdf - PDF generation');
//   console.log('  POST /extract-bill-data - Document extraction');
//   console.log('  POST /upload-image - Image upload to S3');
// });
// Start a normal server only if not running in Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.listen(port, "0.0.0.0", () => {
        console.log(`Local server running at http://localhost:${port}`);
    });
}
exports.handler = (0, serverless_express_1.default)({
    app,
    binarySettings: {
        contentTypes: ["application/pdf"]
    }
});
