"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportSchema = exports.Component = exports.Colors = exports.Configs = exports.TW = void 0;
//schema.ts
const zod_1 = require("zod");
/* ---------- Tailwind helper ---------- */
exports.TW = zod_1.z.string();
/* ---------- Assets ---------- */
const Assets = zod_1.z
    .object({
    headerImage: zod_1.z.string().url().optional(),
    footerImage: zod_1.z.string().url().optional(),
    logo: zod_1.z.string().url().optional(),
    /* NEW */
    backgroundImage: zod_1.z.string().url().optional(),
})
    .partial()
    .default({});
/* helper: accept URL -or- data-URI -or- repo-relative path */
const imageRef = zod_1.z
    .string()
    .min(1)
    .refine((v) => v.startsWith("data:") || // already embedded
    /^https?:\/\//i.test(v) || // http/https
    /^[\w./\-_]+$/.test(v), // something like assets/bg.png
{ message: "Invalid image reference" });
/* ---------- Config groups ---------- */
const PageCfg = zod_1.z
    .object({
    size: zod_1.z.enum(["A4", "Letter"]).default("A4"),
    orientation: zod_1.z.enum(["portrait", "landscape"]).default("portrait"),
    margin: zod_1.z.string().default("20mm"),
})
    .strict();
const FontCfg = zod_1.z
    .object({
    family: zod_1.z.string().default("Inter, ui-sans-serif, system-ui"),
    base: zod_1.z.string().default("text-[12pt]"),
    leading: zod_1.z.string().default("leading-relaxed"),
})
    .strict();
const HeaderCfg = zod_1.z
    .object({
    visible: zod_1.z.boolean().default(true),
    align: zod_1.z.enum(["left", "center", "right"]).default("center"),
    repeat: zod_1.z.enum(["all", "first"]).default("all"),
})
    .strict();
const FooterCfg = zod_1.z
    .object({
    visible: zod_1.z.boolean().default(true),
    text: zod_1.z.string().default("Page {{page}} of {{pages}}"),
    align: zod_1.z.enum(["left", "center", "right"]).default("center"),
})
    .strict();
const DateCfg = zod_1.z
    .object({
    align: zod_1.z.enum(["left", "center", "right"]).default("right"),
    format: zod_1.z.string().default("DD MMM YYYY"),
})
    .strict();
const TableCfg = zod_1.z
    .object({
    border: exports.TW.default("border-2"),
    striped: zod_1.z.boolean().default(true),
    compact: zod_1.z.boolean().default(false),
    headerBg: zod_1.z.string().default("bg-gray-100"),
})
    .strict();
/* ---------- Root config ---------- */
exports.Configs = zod_1.z
    .object({
    page: PageCfg.default({}),
    font: FontCfg.default({}),
    header: HeaderCfg.default({}),
    footer: FooterCfg.default({}),
    date: DateCfg.default({}),
    table: TableCfg.default({}),
})
    .strict();
/* ---------- Colors ---------- */
exports.Colors = zod_1.z
    .object({
    primary: zod_1.z.string().default("#0F172A"),
    accent: zod_1.z.string().default("#2563EB"),
    text: zod_1.z.string().default("#111827"),
    muted: zod_1.z.string().default("#6B7280"),
    border: zod_1.z.string().default("#E5E7EB"),
    /* NEW */
    background: zod_1.z.string().default("#FFFFFF"),
})
    .strict();
/* ---------- Component base ---------- */
const StyleMap = zod_1.z.record(zod_1.z.string(), exports.TW).optional();
const CompBase = zod_1.z
    .object({
    type: zod_1.z.string(),
    style: StyleMap,
    id: zod_1.z.string().optional(),
})
    .strict();
/* ---------- Components ---------- */
const HeaderComp = CompBase.extend({
    type: zod_1.z.literal("header"),
    props: zod_1.z.object({ text: zod_1.z.string() }).strict(),
});
const SubheaderComp = CompBase.extend({
    type: zod_1.z.literal("subheader"),
    props: zod_1.z.object({ text: zod_1.z.string() }).strict(),
});
const DateComp = CompBase.extend({
    type: zod_1.z.literal("date"),
    props: zod_1.z.object({ value: zod_1.z.string().optional() }).strict(),
});
const ParaComp = CompBase.extend({
    type: zod_1.z.literal("para"),
    props: zod_1.z.object({ text: zod_1.z.string() }).strict(),
});
const DividerComp = CompBase.extend({
    type: zod_1.z.literal("divider"),
    props: zod_1.z.object({}).strict(),
});
const SpacerComp = CompBase.extend({
    type: zod_1.z.literal("spacer"),
    props: zod_1.z
        .object({ size: zod_1.z.enum(["xs", "sm", "md", "lg", "xl"]).default("md").optional() })
        .strict(),
});
const PagebreakComp = CompBase.extend({
    type: zod_1.z.literal("pagebreak"),
    props: zod_1.z.object({}).strict(),
});
const SignatureComp = CompBase.extend({
    type: zod_1.z.literal("signature"),
    props: zod_1.z
        .object({
        label: zod_1.z.string().optional(),
        lines: zod_1.z.number().int().min(1).max(5).default(1).optional(),
    })
        .strict(),
});
const FooterTextComp = CompBase.extend({
    type: zod_1.z.literal("footerText"),
    props: zod_1.z.object({ text: zod_1.z.string() }).strict(),
});
const TableComp = CompBase.extend({
    type: zod_1.z.literal("table"),
    props: zod_1.z
        .object({
        title: zod_1.z.string().optional(),
        headers: zod_1.z.array(zod_1.z.string()),
        rows: zod_1.z.array(zod_1.z.array(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]))),
        notes: zod_1.z.string().optional(),
    })
        .strict(),
});
/* NEW ---------- Image component ---------- */
const ImageComp = CompBase.extend({
    type: zod_1.z.literal("image"),
    props: zod_1.z
        .object({
        url: zod_1.z.string().url(),
        alt: zod_1.z.string().optional(),
        caption: zod_1.z.string().optional(),
        width: zod_1.z.string().optional(), // e.g. '50%' or '300px'
        height: zod_1.z.string().optional(),
    })
        .strict(),
});
/* NEW ---------- Image Grid component ---------- */
const ImageGridComp = CompBase.extend({
    type: zod_1.z.literal("image-grid"),
    props: zod_1.z
        .object({
        title: zod_1.z.string().optional(),
        rows: zod_1.z.array(zod_1.z.array(zod_1.z.string().url())).min(1), // 2D array: rows of image URLs
    })
        .strict(),
});
/* ---------- Discriminated union ---------- */
exports.Component = zod_1.z.discriminatedUnion("type", [
    HeaderComp,
    SubheaderComp,
    DateComp,
    ParaComp,
    DividerComp,
    SpacerComp,
    PagebreakComp,
    SignatureComp,
    FooterTextComp,
    TableComp,
    ImageComp, // <- added
    ImageGridComp, // <- added
]);
/* ---------- Root schema ---------- */
exports.ReportSchema = zod_1.z
    .object({
    company: zod_1.z.string(),
    reportName: zod_1.z.string(),
    colors: exports.Colors.default({}),
    assets: zod_1.z.object({
        logo: imageRef.nullish(),
        headerImage: imageRef.nullish(),
        footerImage: imageRef.nullish(),
        backgroundImage: imageRef.nullish(),
    }),
    configs: exports.Configs.default({}),
    components: zod_1.z.array(exports.Component).min(1),
})
    .strict();
