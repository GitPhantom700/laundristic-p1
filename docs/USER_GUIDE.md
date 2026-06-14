# User Guide

Welcome to Laundristic! This guide will walk you through the core flows of the app.

## 1. The Wardrobe (Cataloging)

Before you can drop off items, you need to add them to your Wardrobe.

1. Tap the **Camera Icon** at the top right of the Wardrobe screen.
2. The live viewfinder will open. Point it at your garment and tap the shutter.
3. Select the category (e.g., Shirt, Trousers, Bedsheet).
4. A unique ID pill (like `SHT-01`) is generated. The item is saved! You can immediately snap the next item.

![Wardrobe Screen](file:///C:/Users/chand/Documents/GitHub/laundristic/docs/qa/01_wardrobe.png)

## 2. Dropping Off Laundry

Once your items are in the Wardrobe, you can create a drop-off batch.

1. Go to the **Drop-offs** tab and tap **New Drop-off**.
2. Tap the items in your Wardrobe grid that you are sending to the shop.
3. Snap a photo of the paper receipt the shop gives you.
4. Enter the shop name and the total amount. (The app remembers your last shop name for faster entry).
5. Tap **Confirm**. The batch is now **Active**.

![Drop-offs Screen](file:///C:/Users/chand/Documents/GitHub/laundristic/docs/qa/02_dropoffs.png)

## 3. Checking In (Reconciliation)

When you pick up your laundry, it's time to check it in.

1. On the **Drop-offs** tab, tap your active batch.
2. **Happy Path:** If you count your clothes and the number matches the receipt, just tap **Check In All Items** at the bottom. The batch closes instantly.
3. **Missing Items:** If you are short, un-tick the items that are missing. Tap **Save**.
   - The batch will now move to the **Awaiting items** section.
   - The un-ticked items are flagged as **missing**.

## 4. The Proof Screen & Resolving Missing Items

If a batch is stuck in "Awaiting items", you need to deal with the shop.

1. Tap **Proof** on the awaiting batch.
2. The app will display a full-screen, high-contrast **Proof Screen** showing the missing garment's photo, the receipt, the shop name, and the date. You can safely hand your phone to the shopkeeper to prove what is missing.
3. When the shopkeeper responds:
   - If they find it: Tap the item and mark it as **Found**.
   - If they lost it: Tap the item and mark it as **Lost**. (This removes the item from your active Wardrobe).
4. Once all missing items are resolved, the batch automatically closes!

## 5. Stats

Tap the **Stats** tab to see your laundry economics.

- View your 30-day spend, all-time spend, and averages.
- Check the 6-month bar chart to see spending trends over time.

![Stats Screen](file:///C:/Users/chand/Documents/GitHub/laundristic/docs/qa/03_stats.png)

## 6. Settings (Backup & Restore)

Tap the **Settings** tab (the gear icon) to manage your data.

- **Export Data:** Downloads a `.zip` file containing all your garments, receipts, and history.
- **Import Data:** Restores a `.zip` file from a previous export. _Warning: Importing will replace your current data._

![Settings Screen](file:///C:/Users/chand/Documents/GitHub/laundristic/docs/qa/04_settings.png)
