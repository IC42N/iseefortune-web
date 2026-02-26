export default function FullscreenError({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        backgroundColor: "#f0f0f0",
        color: "#333",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 720 }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>I SEE FORTUNE</div>
        <div style={{ marginTop: 10, color: "#b00020" }}>{message}</div>
      </div>
    </div>
  );
}