import { getTranslations } from "next-intl/server";

export default async function RouteLoading() {
  const t = await getTranslations("Common.loading");

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-7 lg:px-10"
      aria-label={t("aria")}
      aria-busy="true"
    >
      <p role="status" className="sr-only">
        {t("status")}
      </p>
      <div className="mx-auto max-w-7xl animate-pulse">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="size-10 rounded-xl bg-[#0f3a69]" />
            <div className="space-y-2">
              <span className="block h-3 w-20 rounded bg-[#0f3a69]/15" />
              <span className="block h-2 w-28 rounded bg-[#0f3a69]/10" />
            </div>
          </div>
          <div className="flex gap-2">
            <span className="h-9 w-24 rounded-full bg-white/70" />
            <span className="h-9 w-20 rounded-full bg-white/70" />
            <span className="h-9 w-24 rounded-full bg-white/70" />
          </div>
        </header>

        <section className="py-10">
          <span className="block h-3 w-32 rounded bg-[#a65c0e]/15" />
          <span className="mt-5 block h-10 max-w-xl rounded-xl bg-[#0f3a69]/12" />
          <span className="mt-4 block h-4 max-w-2xl rounded bg-[#0f3a69]/8" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="h-[32rem] rounded-[1.25rem] border border-[#0f3a69]/10 bg-white/60" />
          <div className="space-y-4">
            <div className="h-36 rounded-[1.25rem] border border-[#0f3a69]/10 bg-white/55" />
            <div className="h-48 rounded-[1.25rem] border border-[#0f3a69]/10 bg-white/55" />
          </div>
        </section>
      </div>
    </main>
  );
}
