import { adminDb } from '../src/infrastructure/firebase/admin.ts';

async function cleanupTaxonomy() {
    console.log('=== STARTING DATABASE TAXONOMY CLEANUP ===');

    // 1. Delete duplicate card-games category
    const cardGamesCatId = '5caXQ2XyGO0yNFxXvnoV';
    console.log(`Checking category 'card-games' (ID: ${cardGamesCatId})...`);
    const cardGamesCatRef = adminDb.collection('product_categories').doc(cardGamesCatId);
    const cardGamesCatDoc = await cardGamesCatRef.get();
    if (cardGamesCatDoc.exists) {
        await cardGamesCatRef.delete();
        console.log(`✓ Deleted duplicate 'card-games' category (ID: ${cardGamesCatId}).`);
    } else {
        console.log(`duplicate 'card-games' category (ID: ${cardGamesCatId}) does not exist or was already deleted.`);
    }

    // 2. Delete duplicate accessories category
    const dupAccCatId = 'M8bp1Wae7tddfhmJWSzm';
    console.log(`Checking duplicate 'accessories' category (ID: ${dupAccCatId})...`);
    const dupAccCatRef = adminDb.collection('product_categories').doc(dupAccCatId);
    const dupAccCatDoc = await dupAccCatRef.get();
    if (dupAccCatDoc.exists) {
        await dupAccCatRef.delete();
        console.log(`✓ Deleted duplicate 'accessories' category (ID: ${dupAccCatId}).`);
    } else {
        console.log(`duplicate 'accessories' category (ID: ${dupAccCatId}) does not exist or was already deleted.`);
    }

    // 3. Delete duplicate card-games collection
    const cardGamesColId = 'fIw7Gal5bYOOajP1XxZv';
    console.log(`Checking collection 'card-games' (ID: ${cardGamesColId})...`);
    const cardGamesColRef = adminDb.collection('collections').doc(cardGamesColId);
    const cardGamesColDoc = await cardGamesColRef.get();
    if (cardGamesColDoc.exists) {
        await cardGamesColRef.delete();
        console.log(`✓ Deleted duplicate 'card-games' collection (ID: ${cardGamesColId}).`);
    } else {
        console.log(`duplicate 'card-games' collection (ID: ${cardGamesColId}) does not exist or was already deleted.`);
    }

    // 4. Update any products that might still reference the duplicate categories or collections
    console.log('Scanning products to resolve references...');
    const productsSnap = await adminDb.collection('products').get();
    let updatedCount = 0;

    for (const doc of productsSnap.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updates: any = {};

        // Fix category field
        if (data.category === 'card-games' || data.category === 'Card Games') {
            updates.category = 'card-game';
            needsUpdate = true;
            console.log(`Product "${data.name}" uses obsolete category "${data.category}". Normalizing to "card-game".`);
        }

        // Fix collections array if it references card-games
        if (Array.isArray(data.collections) && data.collections.includes('card-games')) {
            updates.collections = data.collections.map((col: string) => col === 'card-games' ? 'card-game' : col);
            needsUpdate = true;
            console.log(`Product "${data.name}" references obsolete collection "card-games" in collections array. Normalizing to "card-game".`);
        }

        if (needsUpdate) {
            await adminDb.collection('products').doc(doc.id).update(updates);
            updatedCount++;
        }
    }

    console.log(`✓ Scan complete. Updated ${updatedCount} products.`);
    console.log('=== DATABASE TAXONOMY CLEANUP COMPLETE ===');
}

cleanupTaxonomy().catch(console.error);
