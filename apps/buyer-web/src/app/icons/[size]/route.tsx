import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const SIZES: Record<string, number> = {
  'icon-192': 192,
  'icon-512': 512,
};

export async function GET(
  _req: Request,
  ctx: { params: { size: string } },
) {
  const key = ctx.params.size;
  const size = SIZES[key] || 192;
  const box = Math.round(size * 0.72);
  const radius = Math.round(size * 0.18);
  const font = Math.round(size * 0.36);

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
            width: box,
            height: box,
            borderRadius: radius,
            background: '#00D1FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0A0A0A',
            fontSize: font,
            fontWeight: 900,
          }}
        >
          C
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
