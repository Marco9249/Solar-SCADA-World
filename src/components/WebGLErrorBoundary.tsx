import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export default class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(135deg, #1A2A4A 0%, #0D1B2E 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#E8F0FF",
          fontFamily: "system-ui, sans-serif",
          padding: 32,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌞</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#7EC8E3", marginBottom: 12 }}>
            Solar SCADA — Omdurman, Sudan
          </div>
          <div style={{ fontSize: 14, color: "#8AABB8", maxWidth: 440, lineHeight: 1.6, marginBottom: 24 }}>
            This interactive 3D world requires WebGL support. Please open this app in a modern browser
            (Chrome, Firefox, Edge, or Safari) with hardware acceleration enabled.
          </div>
          <div style={{ fontSize: 12, color: "#4A6A7A", background: "rgba(0,0,0,0.3)", padding: "10px 18px", borderRadius: 8 }}>
            Error: {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
