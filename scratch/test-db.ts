import { adminDb } from '../src/infrastructure/firebase/admin.ts';

async function testDb() {
    console.log('--- DB PRODUCTS ---');
    const productsSnap = await adminDb.collection('products').get();
    console.log(`Total products: ${productsSnap.size}`);
    productsSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Product: "${data.name}" | category: "${data.category}" | productType: "${data.productType}" | collections: ${JSON.stringify(data.collections)}`);
    });

    console.log('--- DB CATEGORIES ---');
    const catsSnap = await adminDb.collection('product_categories').get();
    console.log(`Total categories: ${catsSnap.size}`);
    catsSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Category: "${data.name}" | slug: "${data.slug}" | id: "${doc.id}"`);
    });

    console.log('--- DB COLLECTIONS ---');
    const collsSnap = await adminDb.collection('collections').get();
    console.log(`Total collections: ${collsSnap.size}`);
    collsSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Collection: "${data.name}" | handle: "${data.handle}" | id: "${doc.id}"`);
    });
}

testDb().catch(console.error);
