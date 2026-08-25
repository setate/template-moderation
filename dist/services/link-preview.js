"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkPreview = getLinkPreview;
const node_dns_1 = require("node:dns");
const node_net_1 = __importDefault(require("node:net"));
const MAX_HTML_BYTES = 1500000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 6000;
function decodeHtml(value) {
    return value
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/\s+/g, " ")
        .trim();
}
function isPrivateAddress(address) {
    if (node_net_1.default.isIPv4(address)) {
        const [a, b] = address.split(".").map(Number);
        return a === 0
            || a === 10
            || a === 127
            || (a === 100 && b >= 64 && b <= 127)
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && (b === 0 || b === 168))
            || (a === 198 && (b === 18 || b === 19 || b === 51))
            || (a === 203 && b === 0)
            || a >= 224;
    }
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
        return isPrivateAddress(normalized.slice(7));
    }
    return normalized === "::"
        || normalized === "::1"
        || normalized.startsWith("fc")
        || normalized.startsWith("fd")
        || /^fe[89ab]/.test(normalized)
        || normalized.startsWith("ff")
        || normalized.startsWith("2001:db8");
}
async function assertPublicUrl(url) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("unsupported protocol");
    }
    if (url.username || url.password)
        throw new Error("credentials are not allowed");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        throw new Error("private host");
    }
    if (node_net_1.default.isIP(hostname)) {
        if (isPrivateAddress(hostname))
            throw new Error("private address");
        return;
    }
    const addresses = await node_dns_1.promises.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address))) {
        throw new Error("private address");
    }
}
async function fetchWithTimeout(url, init = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timeout);
    }
}
async function readLimitedHtml(response) {
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_HTML_BYTES)
        throw new Error("page too large");
    if (!response.body)
        return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    let html = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
            await reader.cancel();
            throw new Error("page too large");
        }
        html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
}
async function fetchPublicHtml(input) {
    let current = new URL(input);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
        await assertPublicUrl(current);
        const response = await fetchWithTimeout(current.toString(), {
            redirect: "manual",
            headers: {
                "user-agent": "Mozilla/5.0 (compatible; DiscordPromotionBot/1.0)",
                accept: "text/html,application/xhtml+xml",
            },
        });
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location || redirects === MAX_REDIRECTS)
                throw new Error("too many redirects");
            current = new URL(location, current);
            continue;
        }
        if (!response.ok)
            throw new Error(`preview request failed: ${response.status}`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
            throw new Error("not an HTML page");
        }
        return { html: await readLimitedHtml(response), finalUrl: current };
    }
    throw new Error("too many redirects");
}
function parseAttributes(tag) {
    const attributes = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
    }
    return attributes;
}
function findMeta(html, names) {
    const wanted = new Set(names.map(name => name.toLowerCase()));
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
        const attributes = parseAttributes(tag);
        const key = (attributes.property || attributes.name || "").toLowerCase();
        if (wanted.has(key) && attributes.content)
            return attributes.content;
    }
    return undefined;
}
function absoluteImageUrl(value, base) {
    if (!value)
        return undefined;
    try {
        const url = new URL(value, base);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
    }
    catch {
        return undefined;
    }
}
function youtubeVideoId(url) {
    if (url.hostname === "youtu.be")
        return url.pathname.split("/").filter(Boolean)[0];
    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
        if (url.pathname === "/watch")
            return url.searchParams.get("v") || undefined;
        const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/);
        return match?.[1];
    }
    return undefined;
}
async function getYoutubePreview(url) {
    const videoId = youtubeVideoId(url);
    if (!videoId || !/^[\w-]{6,20}$/.test(videoId))
        return null;
    try {
        const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`;
        const response = await fetchWithTimeout(endpoint);
        if (response.ok) {
            const data = await response.json();
            return {
                title: data.title,
                siteName: data.author_name ? `YouTube · ${data.author_name}` : "YouTube",
                imageUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            };
        }
    }
    catch {
    }
    return {
        title: "YouTube 영상",
        siteName: "YouTube",
        imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
}
function discordInviteCode(url) {
    const hostname = url.hostname.toLowerCase();
    if (hostname === "discord.gg")
        return url.pathname.split("/").filter(Boolean)[0];
    if (hostname === "discord.com" || hostname.endsWith(".discord.com")) {
        const match = url.pathname.match(/^\/invite\/([^/?]+)/i);
        return match?.[1];
    }
    return undefined;
}
async function getDiscordInvitePreview(url) {
    const inviteCode = discordInviteCode(url);
    if (!inviteCode || !/^[\w-]{2,100}$/.test(inviteCode))
        return null;
    try {
        const endpoint = `https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}?with_counts=true&with_expiration=true`;
        const response = await fetchWithTimeout(endpoint, {
            headers: { accept: "application/json" },
        });
        if (!response.ok)
            return null;
        const data = await response.json();
        const guild = data.guild;
        if (!guild?.name)
            return null;
        const counts = [];
        if (typeof data.approximate_presence_count === "number") {
            counts.push(`온라인 ${data.approximate_presence_count.toLocaleString("ko-KR")}명`);
        }
        if (typeof data.approximate_member_count === "number") {
            counts.push(`멤버 ${data.approximate_member_count.toLocaleString("ko-KR")}명`);
        }
        return {
            title: guild.name,
            siteName: "Discord 초대",
            description: guild.description || counts.join(" · ") || undefined,
            imageUrl: guild.id && guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=512`
                : undefined,
        };
    }
    catch {
        return null;
    }
}
async function getLinkPreview(input) {
    const inputUrl = new URL(input);
    const youtubePreview = await getYoutubePreview(inputUrl);
    if (youtubePreview)
        return youtubePreview;
    const discordPreview = await getDiscordInvitePreview(inputUrl);
    if (discordPreview)
        return discordPreview;
    const { html, finalUrl } = await fetchPublicHtml(input);
    const title = findMeta(html, ["og:title", "twitter:title"])
        || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description = findMeta(html, ["og:description", "twitter:description", "description"]);
    const image = findMeta(html, ["og:image:secure_url", "og:image", "twitter:image"]);
    const siteName = findMeta(html, ["og:site_name"]);
    if (!title && !description && !image)
        return null;
    return {
        title: title || undefined,
        description: description || undefined,
        imageUrl: absoluteImageUrl(image, finalUrl),
        siteName: siteName || finalUrl.hostname.replace(/^www\./, ""),
    };
}

