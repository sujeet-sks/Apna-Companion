export interface PendingRequestDocument {
  name: string;
  link: string;
}

export interface PendingRequest {
  id: string;
  client: string;
  type: string;
  city: string;
  submitted: string;
  documentsVerified: number;
  documentsTotal: number;
  status: string;
  registrationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  documents: PendingRequestDocument[];
}
