import { useMemo, useState } from "react";
import Head from "next/head";
import styles from "@/styles/Home.module.css";

const PALETTE_SIZE = 5;

type Palette = string[];

const generateColor = () =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`.toUpperCase();

const generatePalette = (): Palette =>
  Array.from({ length: PALETTE_SIZE }, () => generateColor());

const getReadableTextColor = (hex: string) => {
  const parsed = hex.replace("#", "");
  const r = parseInt(parsed.substring(0, 2), 16);
  const g = parseInt(parsed.substring(2, 4), 16);
  const b = parseInt(parsed.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? "#0f172a" : "#f8fafc";
};

export default function Home() {
  const [palette, setPalette] = useState<Palette>(() => generatePalette());
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleGenerate = () => {
    setPalette(generatePalette());
    setCopiedColor(null);
  };

  const handleCopy = async (hex: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(hex);
        setCopiedColor(hex);
        return;
      }

      const input = document.createElement("input");
      input.value = hex;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedColor(hex);
    } catch (error) {
      console.error("Failed to copy color", error);
    }
  };

  const paletteForRender = useMemo(() => palette, [palette]);

  return (
    <>
      <Head>
        <title>Chromore</title>
        <meta
          name="description"
          content="Chromore — generate simple color palettes to use in your next project."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Chromore</h1>
          <p className={styles.subtitle}>
            Generate balanced color palettes and copy them with a click.
          </p>
          <button className={styles.button} onClick={handleGenerate}>
            Generate palette
          </button>
        </header>

        <main className={styles.palette}>
          {paletteForRender.map((color) => {
            const textColor = getReadableTextColor(color);
            const isCopied = copiedColor === color;

            return (
              <button
                key={color}
                style={{ backgroundColor: color, color: textColor }}
                className={styles.swatch}
                onClick={() => handleCopy(color)}
                type="button"
              >
                <span className={styles.colorValue}>{color}</span>
                <span className={styles.helper}>
                  {isCopied ? "Copied!" : "Click to copy"}
                </span>
              </button>
            );
          })}
        </main>
      </div>
    </>
  );
}
