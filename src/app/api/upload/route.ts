import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

export const runtime = 'nodejs';

const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 15MB limit' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, and WebP images are supported' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Auto-rotate original and strip EXIF metadata using Sharp
    let optimizedBuffer = buffer;
    try {
      optimizedBuffer = (await sharp(buffer)
        .rotate() // Auto-rotates image based on EXIF orientation tag
        .toBuffer()) as Buffer<ArrayBuffer>;
    } catch (sharpErr) {
      console.error('Sharp original optimization/rotation failed, saving raw buffer', sharpErr);
    }

    // Generate SHA-256 hash of the optimized buffer to deduplicate files
    const fileHash = crypto.createHash('sha256').update(optimizedBuffer).digest('hex');

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${fileHash}.${ext}`;
    const thumbFilename = `${fileHash}-thumb.webp`;

    const filePath = path.join(uploadsDir, filename);
    const thumbPath = path.join(uploadsDir, thumbFilename);

    // Check if the file already exists (deduplicate)
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    const thumbExists = await fs.access(thumbPath).then(() => true).catch(() => false);

    if (fileExists && thumbExists) {
      return NextResponse.json({ 
        url: `/uploads/${filename}`,
        thumbUrl: `/uploads/${thumbFilename}`,
        deduplicated: true
      });
    }

    // Save original file if not exists
    if (!fileExists) {
      await fs.writeFile(filePath, optimizedBuffer);
    }

    // Generate thumbnail if not exists
    if (!thumbExists) {
      try {
        await sharp(optimizedBuffer)
          .resize({ width: 200 })
          .webp({ quality: 80 })
          .toFile(thumbPath);
      } catch (sharpErr) {
        console.error('Sharp thumbnail generation failed, falling back to copying optimized buffer', sharpErr);
        await fs.writeFile(thumbPath, optimizedBuffer);
      }
    }

    return NextResponse.json({ 
      url: `/uploads/${filename}`,
      thumbUrl: `/uploads/${thumbFilename}`,
      deduplicated: false
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process upload' }, { status: 500 });
  }
}
