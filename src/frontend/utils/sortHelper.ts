import { SortOption } from '../components/TableControlPanel';

export function sortItems<T>(
  items: T[], 
  sortOption: SortOption,
  qtyInputs?: Record<string, number>,
  itemPrices?: Record<string, number>
): T[] {
  return [...items].sort((a: any, b: any) => {
    const nameA = typeof a === 'string' ? a : (a.itemName || a.name || '');
    const nameB = typeof b === 'string' ? b : (b.itemName || b.name || '');
    
    let qtyA = typeof a === 'object' && a !== null ? (a.qtyRequested ?? 0) : 0;
    let qtyB = typeof b === 'object' && b !== null ? (b.qtyRequested ?? 0) : 0;

    if (qtyInputs) {
      if (typeof a === 'string' && qtyInputs[a] !== undefined) qtyA = qtyInputs[a];
      if (typeof b === 'string' && qtyInputs[b] !== undefined) qtyB = qtyInputs[b];
      if (typeof a === 'object' && a.id && qtyInputs[a.id] !== undefined) qtyA = qtyInputs[a.id];
      if (typeof b === 'object' && b.id && qtyInputs[b.id] !== undefined) qtyB = qtyInputs[b.id];
    }

    let priceA = typeof a === 'object' && a !== null ? (a.unitPrice ?? a.price ?? 0) : 0;
    let priceB = typeof b === 'object' && b !== null ? (b.unitPrice ?? b.price ?? 0) : 0;

    if (itemPrices) {
      if (typeof a === 'string' && itemPrices[a] !== undefined) priceA = itemPrices[a];
      if (typeof b === 'string' && itemPrices[b] !== undefined) priceB = itemPrices[b];
      if (typeof a === 'object' && a.itemName && itemPrices[a.itemName] !== undefined) priceA = itemPrices[a.itemName];
      if (typeof b === 'object' && b.itemName && itemPrices[b.itemName] !== undefined) priceB = itemPrices[b.itemName];
    }

    const totalA = qtyA * priceA;
    const totalB = qtyB * priceB;

    switch (sortOption) {
      case 'qty-desc':
        return qtyB - qtyA;
      case 'qty-asc':
        return qtyA - qtyB;
      case 'price-desc':
        return priceB - priceA;
      case 'price-asc':
        return priceA - priceB;
      case 'total-desc':
        return totalB - totalA;
      case 'total-asc':
        return totalA - totalB;
      case 'name-asc':
      default:
        return nameA.localeCompare(nameB, 'th');
    }
  });
}
