import { getTranslations } from "next-intl/server";

export default async function RouteLoading() {
  const t = await getTranslations("Common.loading");

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-7 lg:px-10"
      aria-label={t("aria")}
      aria-busy="true"
    >
      <div className="ui-route-loading-track" aria-hidden="true">
        <span className="ui-route-loading-progress" />
      </div>

      <div className="mx-auto max-w-7xl">
        <header className="ui-app-header flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="ui-route-loading-shimmer size-10 rounded-xl bg-[#0f3a69]" />
            <div className="space-y-2">
              <span className="ui-route-loading-shimmer block h-3 w-20 rounded bg-[#0f3a69]/20" />
              <span className="ui-route-loading-shimmer block h-2 w-28 rounded bg-[#0f3a69]/12" />
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <p
              role="status"
              className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-[#22b8a7]/30 bg-[#e6f8f5] px-3 text-xs font-bold text-[#0f3a69] shadow-sm"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[#22b8a7] shadow-[0_0_0_4px_rgb(34_184_167_/_14%)]"
              />
              <span className="min-w-0">{t("status")}</span>
            </p>
            <span className="ui-route-loading-shimmer hidden h-9 w-20 rounded-full bg-[#dce4ec] sm:block" />
            <span className="ui-route-loading-shimmer hidden h-9 w-24 rounded-full bg-[#dce4ec] md:block" />
          </div>
        </header>

        <section className="py-10">
          <span className="ui-route-loading-shimmer block h-3 w-32 rounded bg-[#a65c0e]/20" />
          <span className="ui-route-loading-shimmer mt-5 block h-10 max-w-xl rounded-xl bg-[#0f3a69]/15" />
          <span className="ui-route-loading-shimmer mt-4 block h-4 max-w-2xl rounded bg-[#0f3a69]/10" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="h-[32rem] rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/75 p-6 shadow-[0_6px_20px_rgb(15_58_105_/_5%)] sm:p-8">
            <span className="ui-route-loading-shimmer block h-3 w-24 rounded bg-[#0f3a69]/12" />
            <span className="ui-route-loading-shimmer mt-5 block h-8 max-w-md rounded-lg bg-[#0f3a69]/14" />
            <span className="ui-route-loading-shimmer mt-4 block h-4 max-w-xl rounded bg-[#0f3a69]/9" />
            <span className="ui-route-loading-shimmer mt-8 block h-40 rounded-2xl bg-[#eaf2f8]" />
          </div>
          <div className="space-y-4">
            <div className="h-36 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/75 p-5 shadow-[0_6px_20px_rgb(15_58_105_/_5%)]">
              <span className="ui-route-loading-shimmer block h-3 w-20 rounded bg-[#0f3a69]/12" />
              <span className="ui-route-loading-shimmer mt-5 block h-4 w-full rounded bg-[#0f3a69]/9" />
              <span className="ui-route-loading-shimmer mt-3 block h-4 w-3/4 rounded bg-[#0f3a69]/9" />
            </div>
            <div className="h-48 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/75 p-5 shadow-[0_6px_20px_rgb(15_58_105_/_5%)]">
              <span className="ui-route-loading-shimmer block h-3 w-24 rounded bg-[#0f3a69]/12" />
              <span className="ui-route-loading-shimmer mt-5 block h-20 w-full rounded-xl bg-[#eaf2f8]" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
