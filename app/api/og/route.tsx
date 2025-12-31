import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Large S Logo */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 20,
            textShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          S
        </div>

        {/* Showly Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 10,
          }}
        >
          Showly
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: 'white',
            opacity: 0.95,
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          Schedule property showings without the back-and-forth
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
