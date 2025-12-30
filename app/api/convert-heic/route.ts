import { NextRequest, NextResponse } from 'next/server';
import convert from 'heic-convert';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if file is HEIC/HEIF
    const isHeic = file.type === 'image/heic' ||
                   file.type === 'image/heif' ||
                   file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif');

    if (!isHeic) {
      return NextResponse.json(
        { error: 'File is not a HEIC image' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert HEIC to JPEG
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9, // High quality
    });

    // Create response with JPEG data
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(outputBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.(heic|heif)$/i, '.jpg')}"`,
      },
    });
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error);
    return NextResponse.json(
      { error: 'Failed to convert HEIC image' },
      { status: 500 }
    );
  }
}
