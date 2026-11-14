import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SushiRoll Sueldos",
    short_name: "Sueldos",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4f1",
    theme_color: "#2d333d",
    icons: [{ src: "/logo.png", sizes: "832x832", type: "image/png" }],
  };
}
