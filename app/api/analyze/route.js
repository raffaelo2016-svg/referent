import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; ReferentBot/1.0; +https://referent-two.vercel.app)";

const CONTENT_SELECTORS = [
  "article",
  "[role='article']",
  ".post",
  ".post-content",
  ".entry-content",
  ".article-content",
  ".article-body",
  ".story-body",
  ".content",
  "main",
];

const DATE_META_SELECTORS = [
  "meta[property='article:published_time']",
  "meta[name='article:published_time']",
  "meta[property='og:published_time']",
  "meta[name='date']",
  "meta[name='pubdate']",
  "meta[name='publish-date']",
  "meta[name='publish_date']",
  "meta[name='dc.date']",
  "meta[name='DC.date.issued']",
];

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function getMetaContent($, selector) {
  return normalizeText($(selector).first().attr("content") || "");
}

function parseJsonLd($) {
  const entries = [];

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).contents().text();

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      entries.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // Some pages contain invalid or multiple JSON-LD snippets. Ignore them.
    }
  });

  return entries.flatMap((entry) => {
    if (entry["@graph"]) {
      return entry["@graph"];
    }

    return entry;
  });
}

function pickFromJsonLd($, keys) {
  const entries = parseJsonLd($);

  for (const entry of entries) {
    for (const key of keys) {
      const value = entry?.[key];

      if (typeof value === "string" && value.trim()) {
        return normalizeText(value);
      }
    }
  }

  return "";
}

function extractTitle($, url) {
  return (
    normalizeText($("article h1, main h1, h1").first().text()) ||
    getMetaContent($, "meta[property='og:title']") ||
    getMetaContent($, "meta[name='twitter:title']") ||
    pickFromJsonLd($, ["headline", "name"]) ||
    normalizeText($("title").first().text()) ||
    new URL(url).hostname
  );
}

function extractDate($) {
  const timeDate =
    normalizeText($("time[datetime]").first().attr("datetime") || "") ||
    normalizeText($("time").first().text());

  if (timeDate) {
    return timeDate;
  }

  for (const selector of DATE_META_SELECTORS) {
    const value = getMetaContent($, selector);

    if (value) {
      return value;
    }
  }

  return pickFromJsonLd($, ["datePublished", "dateCreated", "dateModified"]);
}

function extractParagraphs($, root) {
  return root
    .find("p")
    .map((_, paragraph) => normalizeText($(paragraph).text()))
    .get()
    .filter((text) => text.length > 40);
}

function extractContent($) {
  let bestParagraphs = [];

  for (const selector of CONTENT_SELECTORS) {
    $(selector).each((_, element) => {
      const root = $(element).clone();
      root
        .find(
          "script, style, noscript, nav, aside, form, button, input, footer, header, .ad, .ads, .advertisement, .share, .social, .comments",
        )
        .remove();

      const paragraphs = extractParagraphs($, root);

      if (paragraphs.join(" ").length > bestParagraphs.join(" ").length) {
        bestParagraphs = paragraphs;
      }
    });
  }

  if (bestParagraphs.length === 0) {
    bestParagraphs = $("p")
      .map((_, paragraph) => normalizeText($(paragraph).text()))
      .get()
      .filter((text) => text.length > 40)
      .slice(0, 12);
  }

  return bestParagraphs.join("\n\n");
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return Response.json({ error: "Некорректный запрос." }, { status: 400 });
    }

    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json({ error: "Поддерживаются только ссылки http и https." }, { status: 400 });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return Response.json(
        { error: "Не удалось загрузить статью по указанной ссылке." },
        { status: 502 },
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const parsedArticle = {
      date: extractDate($),
      title: extractTitle($, parsedUrl.toString()),
      content: extractContent($),
    };

    if (!parsedArticle.content) {
      return Response.json(
        { error: "Страница загружена, но основной текст статьи не найден." },
        { status: 422 },
      );
    }

    return Response.json(parsedArticle);
  } catch {
    return Response.json({ error: "Проверьте ссылку и попробуйте снова." }, { status: 400 });
  }
}
