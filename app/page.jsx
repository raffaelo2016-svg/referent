"use client";

import { useMemo, useState } from "react";

const actions = [
  {
    id: "summary",
    label: "О чем статья?",
    icon: "?",
  },
  {
    id: "theses",
    label: "Тезисы",
    icon: "1.",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    icon: "@",
  },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [selectedAction, setSelectedAction] = useState("summary");
  const [result, setResult] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedLabel = useMemo(
    () => actions.find((action) => action.id === selectedAction)?.label,
    [selectedAction],
  );

  async function handleAnalyze(actionId = selectedAction) {
    setError("");
    setResult("");
    setArticleTitle("");
    setSelectedAction(actionId);

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      setError("Введите корректный адрес статьи.");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setError("Поддерживаются только ссылки http и https.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: parsedUrl.toString(), action: actionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось обработать статью.");
      }

      setArticleTitle(data.title || parsedUrl.hostname);
      setResult(
        JSON.stringify(
          {
            date: data.date || "",
            title: data.title || "",
            content: data.content || "",
          },
          null,
          2,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#161616]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-3 border-b border-[#d8d0c4] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#316857]">Referent</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
              Анализ англоязычных статей
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#5f615d]">
            Вставьте ссылку, выберите формат и получите готовый результат.
          </p>
        </header>

        <section className="grid flex-1 gap-6 lg:grid-cols-[420px_1fr]">
          <form
            className="flex flex-col gap-5 rounded-lg border border-[#d8d0c4] bg-[#fffdf8] p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              handleAnalyze();
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#30312f]">
                URL англоязычной статьи
              </span>
              <input
                className="h-12 rounded-md border border-[#beb7ad] bg-white px-4 text-base outline-none transition focus:border-[#316857] focus:ring-4 focus:ring-[#316857]/15"
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/article"
                type="url"
                value={url}
              />
            </label>

            <div className="grid gap-3">
              {actions.map((action) => {
                const isActive = selectedAction === action.id;

                return (
                  <button
                    className={`flex h-12 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#316857] bg-[#316857] text-white"
                        : "border-[#beb7ad] bg-white text-[#30312f] hover:border-[#316857] hover:bg-[#edf5f1]"
                    }`}
                    disabled={isLoading}
                    key={action.id}
                    onClick={() => handleAnalyze(action.id)}
                    type="button"
                  >
                    {isLoading && isActive ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <span className="flex h-4 min-w-4 items-center justify-center text-xs">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </button>
                );
              })}
            </div>

            <button
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-md bg-[#1f1f1d] px-4 text-sm font-semibold text-white transition hover:bg-[#316857] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <span className="flex h-4 min-w-4 items-center justify-center text-xs">*</span>
              )}
              Сгенерировать
            </button>

            {error ? (
              <p className="rounded-md border border-[#d9a9a1] bg-[#fff4f1] px-3 py-2 text-sm text-[#8a2f22]">
                {error}
              </p>
            ) : null}
          </form>

          <section className="flex min-h-[460px] flex-col rounded-lg border border-[#d8d0c4] bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b border-[#e4ded5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#316857]">{selectedLabel}</p>
                <h2 className="mt-1 text-xl font-bold">
                  {articleTitle || "Результат появится здесь"}
                </h2>
              </div>
            </div>

            <pre className="flex-1 overflow-auto whitespace-pre-wrap px-5 py-5 font-mono text-sm leading-6 text-[#30312f]">
              {isLoading
                ? "Идет обработка статьи..."
                : result || "Вставьте ссылку на статью и нажмите одну из кнопок."}
            </pre>
          </section>
        </section>
      </div>
    </main>
  );
}
