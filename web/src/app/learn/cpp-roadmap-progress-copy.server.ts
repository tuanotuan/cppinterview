import { getTranslations } from "next-intl/server";

import type { CppRoadmapProgressCopy } from "./cpp-roadmap-map";

export async function getCppRoadmapProgressCopy(): Promise<CppRoadmapProgressCopy> {
  const [progress, auth] = await Promise.all([
    getTranslations("RoadmapProgress"),
    getTranslations("Auth.form"),
  ]);

  return {
    personalProgress: progress("personalProgress"),
    completed: progress("completed"),
    learning: progress("learning"),
    done: progress("done"),
    skipped: progress("skipped"),
    actionsAria: progress("actionsAria"),
    toggleAria: progress("toggleAria"),
    resetHint: progress("resetHint"),
    loading: progress("loading"),
    loadError: progress("loadError"),
    saveError: progress("saveError"),
    saved: progress("saved"),
    loginTitle: progress("loginTitle"),
    loginDescription: progress("loginDescription"),
    closeDialog: progress("closeDialog"),
    useEmail: progress("useEmail"),
    or: auth("or"),
    github: auth("github"),
    google: auth("google"),
  };
}
