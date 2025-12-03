import fs from "node:fs";
import path from "node:path";

export async function emitReportArtifact({ batchName, preview }) {
  const artifactDir = path.resolve("campaigns", "reports");
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, `${batchName.replace(/\W+/g, "_")}.preview.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    count: preview.length,
    messages: preview,
  };
  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Preview artifact written to ${artifactPath}`);
}
