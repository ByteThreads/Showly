import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

// Apple icon - iOS/Safari uses this
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          borderRadius: '50%',
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            background: 'linear-gradient(to right, #2563EB, #10B981)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
          }}
        >
          S
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
