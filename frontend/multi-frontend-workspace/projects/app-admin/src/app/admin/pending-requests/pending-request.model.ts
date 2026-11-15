export interface PendingRequestDocument {
  name: string;
  link: string;
}

export interface PendingRequest {
  id: string;
  client: string;
  type: string;
  submitted: string;
  status: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  approvalRemarks: string | null;
  documents: PendingRequestDocument[];
}
