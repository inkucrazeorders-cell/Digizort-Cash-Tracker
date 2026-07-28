import { CurrencyCode, Transaction } from '../types';

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const symbols: Record<CurrencyCode, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    CAD: 'CA$',
  };

  const symbol = symbols[currency] || '₹';
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);

  return `${symbol}${formatted}`;
}

export function generateAvatarSvg(name: string): string {
  const colors = [
    ['#E53935', '#B71C1C'], // Red DIGIZORT
    ['#3B82F6', '#1E40AF'], // Blue
    ['#10B981', '#065F46'], // Emerald
    ['#8B5CF6', '#4C1D95'], // Violet
    ['#F59E0B', '#78350F'], // Amber
    ['#EC4899', '#831843'], // Pink
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  const [c1, c2] = colors[index];

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#grad-${hash})" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="38">${initials || 'D'}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateWhatsAppMessage(
  tx: Transaction,
  currencySymbol: string = '₹'
): string {
  const formattedDate = new Date(tx.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `Hi ${tx.friendName},
You still have ${currencySymbol}${tx.amount} pending for "${tx.purpose}" on ${formattedDate}.
Please send it whenever convenient.

Thank you!
— Sent via DIGIZORT Cash Tracker`;
}

export function exportToCSV(transactions: Transaction[], filename = 'digizort_cash_tracker.csv') {
  const headers = ['Friend Name', 'Phone', 'Amount', 'Purpose', 'Category', 'Date', 'Status', 'Notes'];
  const rows = transactions.map((t) => [
    `"${t.friendName.replace(/"/g, '""')}"`,
    `"${t.phone || ''}"`,
    t.amount,
    `"${t.purpose.replace(/"/g, '""')}"`,
    `"${t.category}"`,
    t.date,
    t.status,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
