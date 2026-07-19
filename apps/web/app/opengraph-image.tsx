import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#100f0f",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#60a5fa" }}>
          shauryacodes.me
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 84,
            fontWeight: 700,
          }}
        >
          Shaurya Jha
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 36, color: "#a1a1a1" }}>
          Engineer · Founder
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 32, color: "#a1a1a1" }}>
          Building products, not just projects.
        </div>
      </div>
    ),
    { ...size },
  );
}
