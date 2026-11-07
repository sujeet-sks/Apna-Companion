export interface ClientInfo {
  [key: string]: unknown;
}

export interface ClientDetailField {
  label: string;
  value: string;
}

export interface ClientStatistic {
  label: string;
  value: string;
  wide?: boolean;
}

export interface ClientStatistics {
  metrics: ClientStatistic[];
  bookingOutcomes: {
    completed: number;
    cancelled: number;
    upcoming: number;
  };
  bookingOutcomesNote: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isClientStatistics(value: unknown): value is ClientStatistics {
  if (!isRecord(value)) {
    return false;
  }

  const outcomes = value['bookingOutcomes'];
  const metrics = value['metrics'];

  if (
    !Array.isArray(metrics) ||
    !metrics.every(
      (metric) =>
        isRecord(metric) &&
        typeof metric['label'] === 'string' &&
        typeof metric['value'] === 'string',
    ) ||
    typeof value['bookingOutcomesNote'] !== 'string' ||
    !isRecord(outcomes)
  ) {
    return false;
  }

  return (
    typeof outcomes['completed'] === 'number' &&
    typeof outcomes['cancelled'] === 'number' &&
    typeof outcomes['upcoming'] === 'number'
  );
}

export const clientTableColumns = [
  'clientId',
  'clientName',
  'type',
  'city',
  'contactName',
  'email',
  'phone',
];

export const clientData: { approvedClients: ClientInfo[] } = {
  approvedClients: [
  {
    clientId: 'CL001',
    clientName: 'Client A',
    type: 'NGO',
    city: 'Mumbai',
    contactName: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    phone: '+91 98765 43210',
    registrationNumber: 'NGO-MH-2024-01842',
    address: '24 Seva Marg, Andheri East, Mumbai',
    approvedOn: 'Nov 8, 2026',
    description:
      'Community organization providing local support and companion services for people who need assistance with daily activities.',
    statistics: {
      metrics: [
        { label: 'Total bookings', value: '128' },
        { label: 'Revenue', value: '₹ 4.82L' },
        { label: 'Average rating', value: '4.8' },
        { label: 'Cancellation rate', value: '4%' },
        { label: 'On-time rate', value: '96%' },
        { label: 'Active companions', value: '18', wide: true },
      ],
      bookingOutcomes: { completed: 108, cancelled: 5, upcoming: 15 },
      bookingOutcomesNote: 'Booking split is illustrative',
    },
  },
  {
    clientId: 'CL002',
    clientName: 'Client B',
    type: 'Company',
    city: 'Pune',
    contactName: 'Rohan Deshmukh',
    email: 'rohan.deshmukh@example.com',
    phone: '+91 97654 32109',
    registrationNumber: 'CIN-U74999PN2024PTC224810',
    address: '6 Business Park, Shivajinagar, Pune',
    approvedOn: 'Nov 7, 2026',
    description:
      'Registered company providing companion and assistance services in Pune.',
    statistics: {
      metrics: [
        { label: 'Total bookings', value: '96' },
        { label: 'Revenue', value: '₹ 3.64L' },
        { label: 'Average rating', value: '4.6' },
        { label: 'Cancellation rate', value: '6%' },
        { label: 'On-time rate', value: '93%' },
        { label: 'Active companions', value: '14', wide: true },
      ],
      bookingOutcomes: { completed: 78, cancelled: 6, upcoming: 12 },
      bookingOutcomesNote: 'Booking split is illustrative',
    },
  },
  {
    clientId: 'CL003',
    clientName: 'Client C',
    type: 'NGO',
    city: 'Bengaluru',
    contactName: 'Meera Rao',
    email: 'meera.rao@example.com',
    phone: '+91 99887 76655',
    registrationNumber: 'NGO-KA-2023-00917',
    address: '18 Green Avenue, Indiranagar, Bengaluru',
    approvedOn: 'Nov 6, 2026',
    description:
      'Non-profit organization providing community assistance programs.',
    statistics: {
      metrics: [
        { label: 'Total bookings', value: '74' },
        { label: 'Revenue', value: '₹ 2.91L' },
        { label: 'Average rating', value: '4.7' },
        { label: 'Cancellation rate', value: '5%' },
        { label: 'On-time rate', value: '95%' },
        { label: 'Active companions', value: '11', wide: true },
      ],
      bookingOutcomes: { completed: 62, cancelled: 4, upcoming: 8 },
      bookingOutcomesNote: 'Booking split is illustrative',
    },
  },
  ],
};

export function getClientId(client: ClientInfo): string {
  const idEntry = Object.entries(client).find(([key]) =>
    ['clientid', 'client_id', 'id', '_id'].includes(key.replace(/[-\s]/g, '').toLowerCase()),
  );
  const id = idEntry?.[1];
  return typeof id === 'string' || typeof id === 'number' ? String(id) : '';
}

export function getClientTableColumns(client: ClientInfo): string[] {
  return Object.keys(client).filter((key) => {
    const normalizedKey = key.replace(/[-\s_]/g, '').toLowerCase();
    const value = client[key];

    return (
      normalizedKey !== 'status' &&
      !normalizedKey.endsWith('status') &&
      (value === null ||
        ['string', 'number', 'boolean'].includes(typeof value))
    );
  });
}

export function formatClientValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function getClientDetailFields(client: ClientInfo): ClientDetailField[] {
  return Object.entries(client)
    .filter(([key]) => key !== 'statistics')
    .map(([key, value]) => ({
        label: key
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: formatClientValue(value),
      }));
}
