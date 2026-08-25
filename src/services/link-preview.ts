import { promises as dns } from "node:dns";
import net from "node:net";

export interface LinkPreview {
    title?: string;
    description?: string;
    imageUrl?: string;
    siteName?: string;
}

const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 6_000;

function decodeHtml(value: string): string {
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

function isPrivateAddress(address: string): boolean {
    if (net.isIPv4(address)) {
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

async function assertPublicUrl(url: URL): Promise<void> {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("unsupported protocol");
    }
    if (url.username || url.password) throw new Error("credentials are not allowed");

    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        throw new Error("private host");
    }

    if (net.isIP(hostname)) {
        if (isPrivateAddress(hostname)) throw new Error("private address");
        return;
    }

    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address))) {
        throw new Error("private address");
    }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

async function readLimitedHtml(response: Response): Promise<string> {
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_HTML_BYTES) throw new Error("page too large");
    if (!response.body) return "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    let html = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
            await reader.cancel();
            throw new Error("page too large");
        }
        html += decoder.decode(value, { stream: true });
    }

    return html + decoder.decode();
}

async function fetchPublicHtml(input: string): Promise<{ html: string; finalUrl: URL }> {
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
            if (!location || redirects === MAX_REDIRECTS) throw new Error("too many redirects");
            current = new URL(location, current);
            continue;
        }

        if (!response.ok) throw new Error(`preview request failed: ${response.status}`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
            throw new Error("not an HTML page");
        }
        return { html: await readLimitedHtml(response), finalUrl: current };
    }

    throw new Error("too many redirects");
}

function parseAttributes(tag: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
    }
    return attributes;
}

function findMeta(html: string, names: string[]): string | undefined {
    const wanted = new Set(names.map(name => name.toLowerCase()));
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
        const attributes = parseAttributes(tag);
        const key = (attributes.property || attributes.name || "").toLowerCase();
        if (wanted.has(key) && attributes.content) return attributes.content;
    }
    return undefined;
}

function absoluteImageUrl(value: string | undefined, base: URL): string | undefined {
    if (!value) return undefined;
    try {
        const url = new URL(value, base);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}

function youtubeVideoId(url: URL): string | undefined {
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
        if (url.pathname === "/watch") return url.searchParams.get("v") || undefined;
        const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/);
        return match?.[1];
    }
    return undefined;
}

async function getYoutubePreview(url: URL): Promise<LinkPreview | null> {
    const videoId = youtubeVideoId(url);
    if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) return null;

    try {
        const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`;
        const response = await fetchWithTimeout(endpoint);
        if (response.ok) {
            const data = await response.json() as {
                title?: string;
                author_name?: string;
                thumbnail_url?: string;
            };
            return {
                title: data.title,
                siteName: data.author_name ? `YouTube · ${data.author_name}` : "YouTube",
                imageUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            };
        }
    } catch {
        // 정적 썸네일로 대체합니다.
    }

    return {
        title: "YouTube 영상",
        siteName: "YouTube",
        imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
}

export async function getLinkPreview(input: string): Promise<LinkPreview | null> {
    const inputUrl = new URL(input);
    const youtubePreview = await getYoutubePreview(inputUrl);
    if (youtubePreview) return youtubePreview;

    const { html, finalUrl } = await fetchPublicHtml(input);
    const title = findMeta(html, ["og:title", "twitter:title"])
        || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description = findMeta(html, ["og:description", "twitter:description", "description"]);
    const image = findMeta(html, ["og:image:secure_url", "og:image", "twitter:image"]);
    const siteName = findMeta(html, ["og:site_name"]);

    if (!title && !description && !image) return null;
    return {
        title: title || undefined,
        description: description || undefined,
        imageUrl: absoluteImageUrl(image, finalUrl),
        siteName: siteName || finalUrl.hostname.replace(/^www\./, ""),
    };
}

