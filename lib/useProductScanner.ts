/**
 * lib/useProductScanner.ts
 * Reusable camera/library scanner hook — powers Shopping, Pantry, Receipts
 */

import * as ImagePicker from 'expo-image-picker';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

export type ScannedItem = {
  name: string;
  qty: string;
  category: string;
};

export type ScannedReceipt = {
  store: string;
  date: string;
  items: { name: string; price: string }[];
  total: string;
};

type ScanMode = 'product' | 'pantry' | 'receipt';

// ── Pick image from camera or library ─────────────────────────
export async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
  try {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return null;
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return null;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      });
    }

    if (result.canceled || !result.assets?.[0]?.base64) return null;
    return result.assets[0].base64;
  } catch (e) {
    console.log('pickImage error:', e);
    return null;
  }
}

// ── Scan product photo → shopping list item(s) ─────────────────
export async function scanProduct(base64: string): Promise<ScannedItem[]> {
  const prompt = `You are scanning a product photo for a shopping list app.
Look at the image and identify the product(s) visible.
For each product return its name, size/quantity (e.g. "2L", "500g", "6 pack"), and the best category.
Valid categories: Fruit & Veg, Dairy & Eggs, Meat & Seafood, Bakery, Pantry, Frozen, Drinks, Snacks, Household, Other.
Respond ONLY as a JSON array, no extra text:
[{"name": "Full cream milk", "qty": "2L", "category": "Dairy & Eggs"}]`;

  return callVision(base64, prompt, 'product');
}

// ── Scan pantry shelf → multiple items ────────────────────────
export async function scanPantry(base64: string): Promise<ScannedItem[]> {
  const prompt = `You are scanning a pantry shelf or fridge for a home inventory app.
Identify ALL products visible in the image.
For each product return its name, approximate quantity if visible, and category.
Valid categories: Fruit & Veg, Dairy & Eggs, Meat & Seafood, Bakery, Pantry, Frozen, Drinks, Snacks, Household, Other.
Be thorough — list every item you can see.
Respond ONLY as a JSON array, no extra text:
[{"name": "Weet-Bix", "qty": "1 box", "category": "Pantry"}]`;

  return callVision(base64, prompt, 'pantry');
}

// ── Scan receipt → structured data ────────────────────────────
export async function scanReceipt(base64: string): Promise<ScannedReceipt> {
  const prompt = `You are scanning a shopping receipt.
Extract: store name, date, all line items with prices, and total.
Respond ONLY as JSON, no extra text:
{"store": "Woolworths", "date": "2026-03-13", "items": [{"name": "Full cream milk 2L", "price": "$2.50"}], "total": "$47.30"}
If you can't read something clearly, use an empty string.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    const data = await res.json();
    const raw = data?.content?.[0]?.text || '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.log('scanReceipt error:', e);
    return { store: '', date: '', items: [], total: '' };
  }
}

// ── Shared vision caller ───────────────────────────────────────
async function callVision(base64: string, prompt: string, mode: ScanMode): Promise<ScannedItem[]> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    const data = await res.json();
    const raw = data?.content?.[0]?.text || '[]';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.log('callVision error:', e);
    return [];
  }
}