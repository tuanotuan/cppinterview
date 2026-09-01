import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  GeneralCppMockApp,
  type GeneralCppHistorySummary,
} from "@/app/mock-interview/general-cpp-mock-app";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/i18n/metadata";
import { parseGeneralCppHistoryDetail } from "@/lib/mock-interview/contracts-v5";
import { generalCppCatalogCoverage } from "@/lib/mock-interview/general-catalog";
import {
  createMockHistoryAdminClient,
  listMockInterviewAttempts,
  MockHistoryConfigurationError,
} from "@/lib/mock-interview/history.server";
import { loadGeneralCppPublishedBank } from "@/lib/mock-interview/published-bank.server";
import { loadCloudAccount } from "@/lib/practice/cloud-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Mock" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localizedAlternates("/mock-interview", locale),
  };
}

export default async function MockInterviewPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [accountContext, bank] = await Promise.all([
    loadCloudAccount(),
    loadGeneralCppPublishedBank(locale),
  ]);
  const history = await loadInitialHistory(accountContext.account?.id ?? null);

  return (
    <GeneralCppMockApp
      account={
        accountContext.account
          ? {
              id: accountContext.account.id,
              displayName: accountContext.account.displayName,
            }
          : null
      }
      sourceRevision={bank.manifest.sourceRevision}
      catalog={bank.catalog}
      coverage={generalCppCatalogCoverage(bank.catalog)}
      publicationAvailable={bank.publicationAvailable}
      initialHistory={history.items}
      historyAvailable={history.available}
      locale={locale}
    />
  );
}

async function loadInitialHistory(accountId: string | null): Promise<{
  available: boolean;
  items: GeneralCppHistorySummary[];
}> {
  if (!accountId) return { available: false, items: [] };
  try {
    const history = await listMockInterviewAttempts(
      createMockHistoryAdminClient(),
      {
        userId: accountId,
        limit: 5,
        roleProfileId: "cpp-engineer-general",
      },
    );
    return {
      available: true,
      items: history.items.flatMap((attempt) => {
        if (attempt.status !== "completed") return [];
        const detail = parseGeneralCppHistoryDetail({
          artifact: attempt.report,
          review: attempt.publicAttempt.review,
        });
        if (!detail) return [];
        const artifact = detail.artifact;
        return [
          {
            attemptId: attempt.attemptId,
            sessionId: artifact.sessionId,
            completedAt: artifact.completedAt,
            durationMinutes: artifact.plan.durationMinutes,
            overallScore: artifact.report.overallScore,
            readiness: artifact.report.readiness,
            standardScores: artifact.report.standardScores,
            detail,
          },
        ];
      }),
    };
  } catch (error) {
    if (!(error instanceof MockHistoryConfigurationError)) {
      console.error("General C++ mock history load failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
    return { available: false, items: [] };
  }
}
