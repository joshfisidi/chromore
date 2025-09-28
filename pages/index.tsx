// pages/index.tsx
import fs from "fs";
import path from "path";
import { GetServerSideProps } from "next";
import dynamic from "next/dynamic";

// Load Dashboard as client-only (ssr: false)
const Dashboard = dynamic(() => import("../components/Dashboard"), { ssr: false });

type UploadEntry = {
  receivedAt: string;
  payload: any;
};

export default function IndexPage({ uploads }: { uploads: UploadEntry[] }) {
  return <Dashboard uploads={uploads} />;
}

export const getServerSideProps: GetServerSideProps = async () => {
  const dataFile = path.resolve(process.cwd(), "data", "usage-uploads.json");
  let uploads: UploadEntry[] = [];
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, "utf8");
      uploads = JSON.parse(raw);
    } else {
      uploads = [];
    }
  } catch (err) {
    console.error("Failed to read usage file:", err);
    uploads = [];
  }

  return { props: { uploads } };
};
