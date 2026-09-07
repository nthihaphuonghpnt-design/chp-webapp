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
        <div style={{ color: "#ffffff", fontSize: 88, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: -2 }}>
          CHP
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
