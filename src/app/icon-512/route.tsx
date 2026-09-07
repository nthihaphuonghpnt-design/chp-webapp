import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
        }}
      >
        <div style={{ color: "#ffffff", fontSize: 232, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: -6 }}>
          CHP
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
