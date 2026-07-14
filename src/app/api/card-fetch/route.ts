import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { name, game } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 });
    }

    let imageUrl: string | null = null;

    if (game === 'magic') {
      try {
        const scryfallRes = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
          { headers: { 'User-Agent': 'DreamBeesArt/1.0' } }
        );
        if (scryfallRes.ok) {
          const cardData = await scryfallRes.json();
          imageUrl = cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || null;
        }
      } catch (err) {
        console.error('Scryfall API error:', err);
      }
    } else if (game === 'yugioh') {
      try {
        // Try exact match first
        let ygoRes = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`,
          { headers: { 'User-Agent': 'DreamBeesArt/1.0' } }
        );
        
        // Try fuzzy match if exact fails
        if (!ygoRes.ok) {
          ygoRes = await fetch(
            `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}`,
            { headers: { 'User-Agent': 'DreamBeesArt/1.0' } }
          );
        }

        if (ygoRes.ok) {
          const cardData = await ygoRes.json();
          imageUrl = cardData.data?.[0]?.card_images?.[0]?.image_url || null;
        }
      } catch (err) {
        console.error('YGOPRODeck API error:', err);
      }
    } else if (game === 'pokemon') {
      try {
        const pokeRes = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(name)}"`,
          { headers: { 'User-Agent': 'DreamBeesArt/1.0' } }
        );
        if (pokeRes.ok) {
          const cardData = await pokeRes.json();
          imageUrl = cardData.data?.[0]?.images?.large || cardData.data?.[0]?.images?.small || null;
        }
      } catch (err) {
        console.error('Pokémon TCG API error:', err);
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Card artwork not found' }, { status: 404 });
    }

    // Fetch the image from the source URL
    const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'DreamBeesArt/1.0' } });
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to download card artwork' }, { status: 502 });
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    
    // Auto-rotate and optimize fetched card using Sharp
    let optimizedBuffer = buffer;
    try {
      optimizedBuffer = await sharp(buffer)
        .rotate()
        .toBuffer();
    } catch (sharpErr) {
      console.error('Sharp fetch optimization failed, saving raw buffer', sharpErr);
    }

    // Save image locally to public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileHash = crypto.createHash('sha256').update(optimizedBuffer).digest('hex');
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'png';
    const filename = `fetched-${fileHash}.${ext}`;
    const thumbFilename = `fetched-${fileHash}-thumb.webp`;

    const filePath = path.join(uploadsDir, filename);
    const thumbPath = path.join(uploadsDir, thumbFilename);

    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    const thumbExists = await fs.access(thumbPath).then(() => true).catch(() => false);

    if (fileExists && thumbExists) {
      return NextResponse.json({ url: `/uploads/${filename}` });
    }

    if (!fileExists) {
      await fs.writeFile(filePath, optimizedBuffer);
    }

    if (!thumbExists) {
      try {
        await sharp(optimizedBuffer)
          .resize({ width: 200 })
          .webp({ quality: 80 })
          .toFile(thumbPath);
      } catch (sharpErr) {
        console.error('Failed to generate thumbnail for fetched card', name, sharpErr);
        await fs.writeFile(thumbPath, optimizedBuffer);
      }
    }

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch card' }, { status: 500 });
  }
}
