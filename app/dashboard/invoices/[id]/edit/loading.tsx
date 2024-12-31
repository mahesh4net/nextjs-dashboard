'use client'


export default function Loading() {
    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <div className="spinner"></div>
          <style jsx>{`
            .spinner {
              border: 4px solid rgba(0, 0, 0, 0.1);
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border-left-color: #09f;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      );
  }