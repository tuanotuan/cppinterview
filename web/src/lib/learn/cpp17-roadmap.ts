import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { z } from "zod";

import type { GeneratedLesson } from "../content/schema";

const roadmapLocaleSchema = z.enum(["vi", "en"]);
const localizedTextSchema = z.object({
  vi: z.string().trim().min(1),
  en: z.string().trim().min(1),
});
const coverageSchema = z.enum(["ready", "partial", "planned"]);

const cpp17RoadmapSourceSchema = z.object({
  schemaVersion: z.literal(1),
  track: z.literal("cpp17"),
  phases: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      order: z.number().int().positive(),
      title: localizedTextSchema,
      summary: localizedTextSchema,
    }),
  ),
  days: z.array(
    z.object({
      day: z.number().int().positive(),
      phase: z.string().regex(/^[a-z0-9-]+$/),
      title: localizedTextSchema,
      objective: localizedTextSchema,
      dependsOn: z.array(z.number().int().positive()),
      lessonIds: z.array(z.string().min(1)),
      coverage: coverageSchema,
    }),
  ),
});

type Cpp17RoadmapSource = z.infer<typeof cpp17RoadmapSourceSchema>;
export type RoadmapCoverage = z.infer<typeof coverageSchema>;
export type RoadmapLocale = z.infer<typeof roadmapLocaleSchema>;

export type Cpp17RoadmapLesson = {
  id: string;
  title: string;
};

export type Cpp17RoadmapDay = {
  day: number;
  phaseId: string;
  title: string;
  objective: string;
  dependsOn: number[];
  lessons: Cpp17RoadmapLesson[];
  coverage: RoadmapCoverage;
};

export type Cpp17RoadmapPhase = {
  id: string;
  order: number;
  title: string;
  summary: string;
  days: Cpp17RoadmapDay[];
};

export type Cpp17Roadmap = {
  track: "cpp17";
  phases: Cpp17RoadmapPhase[];
  days: Cpp17RoadmapDay[];
  coverageCounts: Record<RoadmapCoverage, number>;
};

function assertUnique<T>(values: readonly T[], label: string) {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  if (duplicates.size) {
    throw new Error(`Duplicate ${label}: ${[...duplicates].join(", ")}`);
  }
}

function validateRoadmapSource(
  source: Cpp17RoadmapSource,
  lessons: readonly Pick<GeneratedLesson, "id" | "track">[],
) {
  assertUnique(source.phases.map((phase) => phase.id), "roadmap phase IDs");
  assertUnique(source.phases.map((phase) => phase.order), "roadmap phase order values");
  assertUnique(source.days.map((entry) => entry.day), "roadmap day values");

  const expectedDays = Array.from({ length: 50 }, (_, index) => index + 1);
  const actualDays = source.days.map((entry) => entry.day).sort((a, b) => a - b);
  if (actualDays.join(",") !== expectedDays.join(",")) {
    throw new Error("The C++17 roadmap must contain every day from 1 through 50 exactly once");
  }

  const phaseIds = new Set(source.phases.map((phase) => phase.id));
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const dayNumbers = new Set(actualDays);

  for (const entry of source.days) {
    if (!phaseIds.has(entry.phase)) {
      throw new Error(`Roadmap day ${entry.day} uses unknown phase ${entry.phase}`);
    }

    assertUnique(entry.dependsOn, `dependencies for roadmap day ${entry.day}`);
    assertUnique(entry.lessonIds, `lesson IDs for roadmap day ${entry.day}`);

    for (const dependency of entry.dependsOn) {
      if (!dayNumbers.has(dependency)) {
        throw new Error(`Roadmap day ${entry.day} depends on unknown day ${dependency}`);
      }
      if (dependency >= entry.day) {
        throw new Error(
          `Roadmap day ${entry.day} must only depend on an earlier day, received ${dependency}`,
        );
      }
    }

    if (entry.coverage === "planned" && entry.lessonIds.length) {
      throw new Error(`Planned roadmap day ${entry.day} cannot link published lessons`);
    }
    if (entry.coverage !== "planned" && !entry.lessonIds.length) {
      throw new Error(`Roadmap day ${entry.day} requires at least one published lesson`);
    }

    for (const lessonId of entry.lessonIds) {
      const lesson = lessonById.get(lessonId);
      if (!lesson) {
        throw new Error(`Roadmap day ${entry.day} links unknown lesson ${lessonId}`);
      }
      if (lesson.track !== "cpp17") {
        throw new Error(`Roadmap day ${entry.day} links non-C++17 lesson ${lessonId}`);
      }
    }
  }

  const usedPhaseIds = new Set(source.days.map((entry) => entry.phase));
  for (const phase of source.phases) {
    if (!usedPhaseIds.has(phase.id)) {
      throw new Error(`Roadmap phase ${phase.id} has no days`);
    }
  }
}

export function buildCpp17Roadmap(
  input: unknown,
  localeInput: string,
  lessons: readonly Pick<GeneratedLesson, "id" | "title" | "track">[],
): Cpp17Roadmap {
  const source = cpp17RoadmapSourceSchema.parse(input);
  const locale = roadmapLocaleSchema.parse(localeInput);
  validateRoadmapSource(source, lessons);

  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const days = source.days
    .map((entry) => ({
      day: entry.day,
      phaseId: entry.phase,
      title: entry.title[locale],
      objective: entry.objective[locale],
      dependsOn: [...entry.dependsOn],
      lessons: entry.lessonIds.map((lessonId) => {
        const lesson = lessonById.get(lessonId)!;
        return { id: lesson.id, title: lesson.title };
      }),
      coverage: entry.coverage,
    }))
    .sort((left, right) => left.day - right.day);

  const daysByPhase = new Map<string, Cpp17RoadmapDay[]>();
  for (const entry of days) {
    const phaseDays = daysByPhase.get(entry.phaseId) ?? [];
    phaseDays.push(entry);
    daysByPhase.set(entry.phaseId, phaseDays);
  }
  const phases = source.phases
    .map((phase) => ({
      id: phase.id,
      order: phase.order,
      title: phase.title[locale],
      summary: phase.summary[locale],
      days: daysByPhase.get(phase.id) ?? [],
    }))
    .sort((left, right) => left.order - right.order);

  return {
    track: source.track,
    phases,
    days,
    coverageCounts: {
      ready: days.filter((entry) => entry.coverage === "ready").length,
      partial: days.filter((entry) => entry.coverage === "partial").length,
      planned: days.filter((entry) => entry.coverage === "planned").length,
    },
  };
}

function roadmapFilePath() {
  const workingDirectory = process.cwd();
  return path.basename(workingDirectory).toLowerCase() === "web"
    ? path.join(workingDirectory, "content", "roadmaps", "cpp17.yaml")
    : path.join(workingDirectory, "web", "content", "roadmaps", "cpp17.yaml");
}

export async function loadCpp17Roadmap(
  locale: string,
  lessons: readonly Pick<GeneratedLesson, "id" | "title" | "track">[],
) {
  const source = parseYaml(await readFile(roadmapFilePath(), "utf8"));
  return buildCpp17Roadmap(source, locale, lessons);
}
