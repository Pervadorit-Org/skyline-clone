/** Keep in sync with backend GC_STORE_CODES (services/wallet/gcWallet.service.js). */
export const GC_STORE_CODES = ['goldendragon', 'dragonfury', 'luckybet']

export function isGcStore(storeCode) {
  return GC_STORE_CODES.includes(String(storeCode || '').trim().toLowerCase())
}
