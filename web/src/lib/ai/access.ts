type AiAccessEnvironment = {
  NODE_ENV?: string;
  ALLOW_UNMETERED_LOCAL_AI?: string;
};

export function isUnmeteredLocalAiEnabled(
  environment: AiAccessEnvironment = process.env,
): boolean {
  return (
    environment.NODE_ENV === "development" &&
    environment.ALLOW_UNMETERED_LOCAL_AI?.trim().toLowerCase() === "true"
  );
}
