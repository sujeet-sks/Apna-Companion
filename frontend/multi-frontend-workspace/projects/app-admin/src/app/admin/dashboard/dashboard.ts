import { Component } from '@angular/core';

type MetricTrend = 'positive' | 'negative' | 'neutral';

interface DashboardMetric {
  label: string;
  value: string;
  wide: boolean;
}

interface DashboardClient {
  name: string;
  bookings: number;
  revenue: string;
  rating: string;
  cancellationRate: number;
}

interface ServiceBookings {
  name: string;
  percentage: number;
}

interface DashboardData {
  title: string;
  periods: string[];
  cities: string[];
  metrics: DashboardMetric[];
  clientSortOptions: string[];
  topClients: DashboardClient[];
  bookingsByServiceTitle: string;
  bookingsByServiceNote: string;
  bookingsByService: ServiceBookings[];
}

@Component({
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  dashboardData: DashboardData = {
    title: 'Dashboard',
    periods: ['Today', '7 days', '30 days', 'Custom'],
    cities: ['All cities', 'Mumbai', 'Pune', 'Bengaluru'],
    metrics: [
      {
        label: 'Total bookings',
        value: '1,284',
        wide: false,
      },
      {
        label: 'Completed',
        value: '1,126',
        wide: false,
      },
      {
        label: 'Cancelled',
        value: '58',
        wide: false,
      },
      {
        label: 'Gross booking value',
        value: '₹ 4.82L',
        wide: false,
      },
      {
        label: 'Platform revenue',
        value: '₹ 62,400',
        wide: true,
      },
      {
        label: 'Active clients',
        value: '46',
        wide: true,
      },
    ],
    clientSortOptions: ['Best', 'Highest cancellation'],
    topClients: [
      { name: 'Client A', bookings: 42, revenue: '₹ 84,000', rating: '4.9', cancellationRate: 4 },
      { name: 'Client B', bookings: 35, revenue: '₹ 72,500', rating: '4.8', cancellationRate: 7 },
      { name: 'Client C', bookings: 28, revenue: '₹ 56,000', rating: '4.7', cancellationRate: 9 },
      { name: 'Client D', bookings: 21, revenue: '₹ 43,200', rating: '4.6', cancellationRate: 12 },
      { name: 'Client E', bookings: 17, revenue: '₹ 31,800', rating: '4.5', cancellationRate: 15 },
    ],
    bookingsByServiceTitle: 'Bookings by service',
    bookingsByServiceNote: 'Bar lengths are illustrative',
    bookingsByService: [
      { name: 'Hospital', percentage: 80 },
      { name: 'Airport', percentage: 55 },
      { name: 'Govt office', percentage: 40 },
      { name: 'Temple', percentage: 28 },
      { name: 'Park / walk', percentage: 20 },
    ],
  };

  selectedPeriod = '30 days';
  selectedCity = 'All cities';
  selectedClientSort = this.dashboardData.clientSortOptions[0];

  get sortedTopClients(): DashboardClient[] {
    const clients = [...this.dashboardData.topClients];

    return this.selectedClientSort === 'Highest cancellation'
      ? clients.sort((first, second) => second.cancellationRate - first.cancellationRate)
      : clients.sort((first, second) => second.bookings - first.bookings);
  }

  onCityChange(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.selectedCity = event.target.value;
    }
  }
}
