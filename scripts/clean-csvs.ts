import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// CSV PARSING & STRINGIFYING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const rawLines = text.split(/\r?\n/);
  
  for (const line of rawLines) {
    if (!line.trim()) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          // Escaped quote
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    lines.push(values);
  }
  return lines;
}

function toCSVRow(cells: string[]): string {
  return cells.map(cell => {
    // If the cell contains quotes, escape them
    const escaped = cell.replace(/"/g, '""');
    // Wrap in quotes if it contains commas, quotes, or newlines
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
      return `"${escaped}"`;
    }
    return escaped;
  }).join(',');
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE & FIELD CLEANING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function cleanTitle(title: string): string {
  let clean = title;
  
  // Remove brand and store prefixes
  const prefixes = [
    /^(Hasbro Gaming|USAOPOLY|Spin Master Games|Asmodee|Stonemaier Games|Bezier Games|Educational Insights|Regal Games|Winning Moves|Peaceable Kingdom|HABA|WS Game Company|Pressman|Mattel Games|Mattel|A&A|Queensell|DiFFY TOYS AND GAMES|DiFFY|Lost Boy Entertainment|Heldbergs|Days of Wonder|Stronghold Games|theory11|Goliath|Pandemic|Forbidden Island|Alley Cat Games|Relatable|WHAT DO YOU MEME\?|Point Games|CMYK|Joyin|Amerous|USAOPOLY|CGE Czech Games Edition|CGE|Loquacious Games|Roxley Games|Stronghold Games|Days of Wonder|MindWare|zeyce)\s+/i,
    /^(Visit the|Brand:)\s+.*?\s+Store\s*/i,
    /^Brand:\s+/i
  ];
  
  for (const prefix of prefixes) {
    clean = clean.replace(prefix, '');
  }

  // Extract useful parenthesized info
  let parenthesized = '';
  const parenMatches = clean.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const match of parenMatches) {
      const inner = match.slice(1, -1);
      if (/\b(Edition|Refresh|Base Game|Extension|Expansion|Version|Pack|Set|Dual|Double|Single|Theme|Collectible)\b/i.test(inner)) {
        parenthesized = match;
      }
    }
  }
  
  // Remove all parentheses for splitting
  clean = clean.replace(/\([^)]+\)/g, ' ');

  // Split on delimiters
  const parts = clean.split(/[,|:–—\-]/);
  let core = parts[0].trim();
  
  // Remove generic SEO keywords
  core = core
    .replace(/\b(Family\s+)?Board\s*Games?\b/gi, '')
    .replace(/\b(Family\s+)?Card\s*Games?\b/gi, '')
    .replace(/\b(Party\s+)?Games?\b/gi, '')
    .replace(/\b(for\s+)?(Kids|Adults|Families|Preschoolers|Toddlers|Boys\s*and\s*Girls|Boys|Girls|Seniors|Teens)\b/gi, '')
    .replace(/\b(Ages?\s*\d+\+?|Preschool|Classroom|Educational|Classic|Strategy|Cooperative|Learning|Trivia|Generational|Vibrant)\b/gi, '')
    .replace(/\bby\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, '') // remove author names
    .replace(/\bPresented\s+by\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip leading/trailing punctuation
  core = core.replace(/^[-–—,:|/\\+]+|[-–—,:|/\\+]+$/g, '').trim();

  let result = core;
  if (parenthesized) {
    result += ' ' + parenthesized;
  }
  
  // If the core is very short and there is a second part, append it if it's descriptive
  if (parts.length > 1 && core.length < 15) {
    const nextPart = parts[1].trim();
    if (!/\b(ages? \d+|players?|\bkids\b|\badults\b|\bfamily\b|game night|exclusive|gift|boys|girls|preschool|classroom|travel|portable|classic version|learning|educational|board\s*game|card\s*game|party\s*game|strategy\s*game|cooperative\s*game|minute\s*playtime|min\s*playtime)\b/i.test(nextPart)) {
      const cleanedNext = nextPart
        .replace(/\b(Family\s+)?Board\s*Games?\b/gi, '')
        .replace(/\b(Family\s+)?Card\s*Games?\b/gi, '')
        .replace(/\b(Party\s+)?Games?\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanedNext && cleanedNext.length > 2) {
        result = `${core}: ${cleanedNext}`;
        if (parenthesized) result += ' ' + parenthesized;
      }
    }
  }

  // Capitalize title
  result = result.split(' ').map(word => {
    if (word.startsWith('(') && word.length > 2) {
      return '(' + word.charAt(1).toUpperCase() + word.slice(2);
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');

  result = result.replace(/\s+/g, ' ').trim();

  // Final fallback
  if (!result) {
    result = title.split(/[,|:–—\-]/)[0].trim();
  }

  // Ensure it's under 60 characters
  if (result.length > 60) {
    result = result.substring(0, 57) + '...';
  }

  return result;
}

function cleanHandle(cleanedTitle: string): string {
  return cleanedTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars except spaces/hyphens
    .trim()
    .replace(/\s+/g, '-')       // replace spaces with single hyphen
    .replace(/-+/g, '-');        // replace multiple hyphens with single hyphen
}

function cleanVendor(vendor: string): string {
  if (!vendor || vendor.trim() === '') return 'Other';
  return vendor
    .replace(/^Visit the\s+(.*?)\s+Store/i, '$1')
    .replace(/^Brand:\s+(.*)/i, '$1')
    .replace(/\s+Store$/i, '')
    .trim();
}

function generateSKU(cleanedTitle: string, index: number): string {
  const code = cleanedTitle.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
  return `DB-BG-${code}-${String(index).padStart(3, '0')}`;
}

function generateTags(cleanedTitle: string, originalTitle: string): string {
  const tags = new Set<string>(['board-game']);
  const lowerOrig = originalTitle.toLowerCase();
  
  if (lowerOrig.includes('monopoly')) tags.add('monopoly');
  if (lowerOrig.includes('chess')) tags.add('chess');
  if (lowerOrig.includes('puzzle')) tags.add('puzzle');
  if (lowerOrig.includes('trivia') || lowerOrig.includes('pursuit')) tags.add('trivia');
  if (lowerOrig.includes('card') || lowerOrig.includes('uno')) tags.add('card-game');
  if (lowerOrig.includes('kid') || lowerOrig.includes('junior') || lowerOrig.includes('preschool') || lowerOrig.includes('toddler')) tags.add('kids-game');
  if (lowerOrig.includes('party') || lowerOrig.includes('shout') || lowerOrig.includes('charades')) tags.add('party-game');
  if (lowerOrig.includes('strategy') || lowerOrig.includes('catan') || lowerOrig.includes('ticket to ride')) tags.add('strategy-game');
  if (lowerOrig.includes('classic')) tags.add('classic');
  if (lowerOrig.includes('wooden') || lowerOrig.includes('wood')) tags.add('wooden');
  
  if (tags.size === 1) {
    tags.add('family-game');
  }

  return Array.from(tags).join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRIPT ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

const csvFiles = [
  'dreamshop_export-2026-05-26T01-10-59-261Z.csv',
  'dreamshop_export-2026-05-26T01-24-39-869Z.csv',
  'dreamshop_export-2026-05-26T02-03-37-515Z.csv'
];

async function main() {
  console.log('Starting CSV Export Cleaning script...');
  let totalCleaned = 0;
  let skuIndex = 1;

  for (const filename of csvFiles) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    console.log(`Processing file: ${filename}`);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(rawContent);

    if (rows.length < 2) {
      console.log(`File is empty or contains only header: ${filename}`);
      continue;
    }

    const headers = rows[0];
    
    // Find index of columns
    const handleIdx = headers.indexOf('Handle');
    const titleIdx = headers.indexOf('Title');
    const bodyIdx = headers.indexOf('Body (HTML)');
    const vendorIdx = headers.indexOf('Vendor');
    const typeIdx = headers.indexOf('Custom Product Type');
    const stdTypeIdx = headers.indexOf('Standardized Product Type');
    const tagsIdx = headers.indexOf('Tags');
    const publishedIdx = headers.indexOf('Published');
    const skuIdxCol = headers.indexOf('Variant SKU');
    const compareAtPriceIdx = headers.indexOf('Variant Compare At Price');
    const seoTitleIdx = headers.indexOf('SEO Title');
    const seoDescIdx = headers.indexOf('SEO Description');
    const costIdx = headers.indexOf('Variant Cost'); // might not exist in header, we'll check

    // Add cost column to headers if it doesn't exist
    let finalHeaders = [...headers];
    let costIndex = headers.indexOf('Cost');
    if (costIndex === -1) {
      costIndex = headers.indexOf('Variant Cost');
    }
    if (costIndex === -1) {
      finalHeaders.push('Cost');
      costIndex = finalHeaders.length - 1;
    }

    const cleanedRows: string[][] = [finalHeaders];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Pad row values if it has fewer columns than headers
      while (row.length < finalHeaders.length) {
        row.push('');
      }

      const origTitle = row[titleIdx] || '';
      if (!origTitle) continue;

      const newTitle = cleanTitle(origTitle);
      const newHandle = cleanHandle(newTitle);
      const newVendor = cleanVendor(row[vendorIdx] || '');
      const newSKU = generateSKU(newTitle, skuIndex++);
      const newTags = generateTags(newTitle, origTitle);
      
      const newDescription = `<p>Discover ${newTitle}, a fantastic and engaging game perfect for your next game night! Ideal for players looking for strategy, fun, and memorable moments. This game features high-quality components and is designed to bring family and friends together for hours of entertainment.</p>`;

      // Clean compare at price to prevent empty/fluff issues
      let compareAtPrice = '';

      // Set cost to 60% of the price if price is available
      const priceStr = row[headers.indexOf('Variant Price')] || '0';
      const priceVal = parseFloat(priceStr);
      let costStr = '';
      if (!isNaN(priceVal) && priceVal > 0) {
        costStr = (priceVal * 0.6).toFixed(2);
      }

      // Update fields in the row
      row[titleIdx] = newTitle;
      row[handleIdx] = newHandle;
      row[bodyIdx] = newDescription;
      row[vendorIdx] = newVendor;
      row[typeIdx] = 'Board Games';
      row[stdTypeIdx] = 'Board Games';
      row[tagsIdx] = newTags;
      row[publishedIdx] = 'true';
      row[skuIdxCol] = newSKU;
      row[seoTitleIdx] = newTitle;
      row[seoDescIdx] = `Get the fun and exciting ${newTitle}. Perfect for family game nights, parties, and gifts!`;
      row[costIndex] = costStr;

      cleanedRows.push(row);
      totalCleaned++;
    }

    // Write back the file
    const newCSVContent = cleanedRows.map(toCSVRow).join('\n');
    fs.writeFileSync(filePath, newCSVContent, 'utf-8');
    console.log(`Saved cleaned file: ${filename} (${cleanedRows.length - 1} products)`);
  }

  console.log(`CSV Cleaning complete! Cleaned ${totalCleaned} products in total.`);
}

main().catch(err => {
  console.error('Cleaning script failed:', err);
  process.exit(1);
});
