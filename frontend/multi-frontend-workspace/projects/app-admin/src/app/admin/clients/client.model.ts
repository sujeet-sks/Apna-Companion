export interface ClientInfo {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  submitted: string;
  status: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  documentType: string;
  documentUrl: string;
  approvalRemarks: string | null;
}

export interface ClientDetailField {
  label: string;
  value: string;
}

export interface ClientTableColumn {
  key: keyof ClientInfo;
  label: string;
}

export const clientTableColumns: ClientTableColumn[] = [
  { key: 'organizationName', label: 'Organization Name' },
  { key: 'organizationType', label: 'Organization Type' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
];

export function getClientId(client: ClientInfo): string {
  return client.organizationId;
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
    .filter(([key]) => key !== 'documentType' && key !== 'documentUrl')
    .map(([key, value]) => ({
      label: key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: formatClientValue(value),
    }));
}

export function formatDocumentType(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
