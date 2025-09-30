// pages/index.tsx
import fs from "fs";
import path from "path";
import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";

const Dashboard = dynamic(() => import("../components/Dashboard"), { ssr: false });

export type UploadEntry = {
  receivedAt: string;
  payload: unknown; // unknown instead of `any` — safely narrowed downstream
};

// simple runtime guard
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function IndexPage({ uploads }: { uploads: UploadEntry[] }) {
  return <Dashboard uploads={uploads} />;
}

export const getServerSideProps: GetServerSideProps<{ uploads: UploadEntry[] }> = async () => {
  const dataFile = path.resolve(process.cwd(), "data", "usage-uploads.json");
  let uploads: UploadEntry[] = [];

  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, "utf8");
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        uploads = parsed.map((item: unknown) => {
          if (isObject(item)) {
            const receivedAt =
              typeof (item as Record<string, unknown>).receivedAt === "string"
                ? ((item as Record<string, unknown>).receivedAt as string)
                : new Date().toISOString();

            // If the shape is { receivedAt, payload } we preserve payload, otherwise store the whole item
            const payload =
              "payload" in item ? (item as Record<string, unknown>).payload : item;

            return { receivedAt, payload };
          }

          // fallback for non-object entries
          return { receivedAt: new Date().toISOString(), payload: item };
        });
      } else {
        // if file exists but is not an array, ignore gracefully
        uploads = [];
      }
    } else {
      uploads = [];
    }
  } catch (err) {
    console.error("Failed to read usage file:", err);
    uploads = [];
  }

  return { props: { uploads } };
};
