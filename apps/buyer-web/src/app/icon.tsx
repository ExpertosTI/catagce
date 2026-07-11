import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#00D1FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0A0A0A',
            fontSize: 14,
            fontWeight: 900,
          }}
        >
          C
        </div>
      </div>
    ),
    { ...size },
  );
}
