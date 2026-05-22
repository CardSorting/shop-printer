import { adminDb } from '../src/infrastructure/firebase/admin.ts';

async function run() {
  console.log('--- DETAILED TAXONOMY AUDIT ---');
  
  // 1. Check product_categories
  console.log('\n[product_categories]:');
  const catSnap = await adminDb.collection('product_categories').get();
  catSnap.forEach((doc: any) => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Slug: ${data.slug} | Name: ${data.name}`);
  });

  // 2. Check collections
  console.log('\n[collections]:');
  const colSnap = await adminDb.collection('collections').get();
  colSnap.forEach((doc: any) => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Handle: ${data.handle} | Name: ${data.name}`);
  });

  // 3. Check products category values
  console.log('\n[products - Unique Categories in use]:');
  const prodSnap = await adminDb.collection('products').get();
  const uniqueCats = new Set<string>();
  const productCountByCat: Record<string, number> = {};
  
  prodSnap.forEach((doc: any) => {
    const cat = doc.data().category;
    if (cat) {
      uniqueCats.add(cat);
      productCountByCat[cat] = (productCountByCat[cat] || 0) + 1;
    }
  });

  for (const cat of Array.from(uniqueCats)) {
    console.log(`- Category field value: "${cat}" | Count: ${productCountByCat[cat]}`);
  }
}

run().catch(console.error);
