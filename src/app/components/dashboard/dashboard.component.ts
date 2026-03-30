import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { collection, doc, Firestore, getDoc, getDocs } from '@angular/fire/firestore';
import { NgApexchartsModule } from 'ng-apexcharts';

interface ChartState {
  categories: string[];
  series: number[] | any[];
  currentPage: number;
  pageSize: number;
  chartOptions: any;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  showDashboard = false;
    expandedChartId: string | null = null;
     charts: Record<string, ChartState> = {};

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadAreaUsersChart();
    await this.loadPackageUsersChart();
    await this.loadBillCollectionChart();
    await this.loadBillCreatorPieChart();
  }

  /* ================================
      🔥 GENERIC FIRESTORE METHODS
  ================================= */

  async getDocument(path: string) {
    const docRef = doc(this.firestore, path);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  async getCollection(collectionName: string) {
    const colRef = collection(this.firestore, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data());
  }

  getTotalAreas(chartId: string): number {
  return this.charts[chartId]?.categories?.length || 0;
}

getTotalUsers(chartId: string): number {
  return this.charts[chartId]?.series?.reduce((a, b) => a + b, 0) || 0;
}

  /* ================================
      📊 GENERIC DATA PROCESSING
  ================================= */

  groupAndCount(data: any[], key: string): Record<string, number> {
    const result: Record<string, number> = {};

    data.forEach(item => {
      const value = item[key];
      if (!result[value]) result[value] = 0;
      result[value]++;
    });

    return result;
  }

  convertToChartArrays(obj: Record<string, number>) {
    return {
      categories: Object.keys(obj),
      series: Object.values(obj)
    };
  }

  paginate(array: any[], page: number, pageSize: number) {
    const start = page * pageSize;
    return array.slice(start, start + pageSize);
  }

  /* ================================
      🎯 CHART INITIALIZER (GENERIC)
  ================================= */

  initializeChart(chartId: string, categories: string[], series: number[], title: string) {

    this.charts[chartId] = {
      categories,
      series,
      currentPage: 0,
      pageSize: 9,
      chartOptions: {}
    };

    this.updateChart(chartId, title);
  }

  updateChart(chartId: string, title: string) {

    const chart = this.charts[chartId];

    const paginatedCategories = this.paginate(
      chart.categories,
      chart.currentPage,
      chart.pageSize
    );

    const paginatedSeries = this.paginate(
      chart.series,
      chart.currentPage,
      chart.pageSize
    );

    chart.chartOptions = {
      series: [{
        name: title,
        data: paginatedSeries
      }],
      chart: {
        type: 'bar',
        height: 350
      },
       plotOptions: {
      bar: {
        distributed: true   
      }
    },
      xaxis: {
        categories: paginatedCategories
      },
      dataLabels: {
        enabled: true
      },
      title: {
        text: title
      }
    };
  }

  nextPage(chartId: string, title: string) {
    const chart = this.charts[chartId];

    if ((chart.currentPage + 1) * chart.pageSize < chart.categories.length) {
      chart.currentPage++;
      this.updateChart(chartId, title);
    }
  }

  prevPage(chartId: string, title: string) {
    const chart = this.charts[chartId];

    if (chart.currentPage > 0) {
      chart.currentPage--;
      this.updateChart(chartId, title);
    }
  }

  /* ================================
      🚀 AREA USERS CHART
  ================================= */

  async loadAreaUsersChart() {

    const users = await this.getCollection('users');

    const grouped = this.groupAndCount(users, 'sublocality');

    const chartData = this.convertToChartArrays(grouped);

    this.initializeChart(
      'areaUsers',
      chartData.categories,
      chartData.series,
      'Users by Area'
    );
  }

  /* ================================
      🚀 LOAD PACKAGE USERS CHART
================================ */

async loadPackageUsersChart() {

  // 1️⃣ Get all packages from internetPackageDoc
  const packageDocRef = doc(this.firestore, 'internetPackage/internetPackageDoc');
  const packageSnap = await getDoc(packageDocRef);

  let packages: string[] = [];
  if (packageSnap.exists()) {
    const data: any = packageSnap.data();
    packages = data.internetPackage.map((p: any) => p.package_name);
  }

  // 2️⃣ Get users
  const users = await this.getCollection('users');

  // 3️⃣ Count users per package
  const grouped: Record<string, number> = {};
  packages.forEach(pkg => grouped[pkg] = 0); // initialize all packages with 0

  users.forEach(user => {
    const pkg = user['select_package'];
    if (grouped[pkg] !== undefined) {
      grouped[pkg]++;
    }
  });

  const chartData = this.convertToChartArrays(grouped);

  // 4️⃣ Initialize chart (generic)
  this.initializeChart(
    'packageUsers',
    chartData.categories,
    chartData.series,
    'Users by Package'
  );
}


async loadBillCollectionChart() {
  // 1️⃣ Get all users
  const users = await this.getCollection('users');

  // 2️⃣ Prepare month-year sums
  const monthYearMap: Record<string, number> = {};

  users.forEach(user => {
    if (Array.isArray(user['bills'])) {
      user['bills'].forEach((bill: any) => {
        if (bill.status === 'paid' && bill.collected_amount) {
          const key = `${bill.month}-${bill.year}`.toLowerCase();
          if (!monthYearMap[key]) monthYearMap[key] = 0;
          monthYearMap[key] += bill.collected_amount;
        }
      });
    }
  });

  // 3️⃣ Sort keys by year+month order
  const monthOrder = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];

  const sortedKeys = Object.keys(monthYearMap).sort((a, b) => {
    const [monthA, yearA] = a.split('-');
    const [monthB, yearB] = b.split('-');

    if (parseInt(yearA) !== parseInt(yearB)) {
      return parseInt(yearA) - parseInt(yearB);
    }
    return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
  });

  const series = sortedKeys.map(k => monthYearMap[k]);

  // 4️⃣ Initialize Bill Collection chart (direct ApexCharts object)
  this.charts['billCollection'] = {
    categories: sortedKeys.map(k => k.toUpperCase()),
    series: series,
    currentPage: 0,
    pageSize: 12,
    chartOptions: {
      series: [
        {
          name: 'Monthly Bill Collection',
          data: series
        }
      ],
      chart: {
        type: 'line',
        height: 350
      },
      stroke: {
        curve: 'smooth'
      },
      xaxis: {
        categories: sortedKeys.map(k => k.toUpperCase())
      },
      dataLabels: {
        enabled: true
      },
      title: {
        text: 'Monthly Bill Collection'
      },
      tooltip: {
        y: {
          formatter: (val: number) => 'Rs. ' + val
        }
      }
    }
  };
}


async loadBillCreatorPieChart() {
  // 1️⃣ Get billCreator collection
  const bills = await this.getCollection('billCreator');

  // 2️⃣ Group by month-year (bill amount)
  const monthYearMap: Record<string, number> = {};

  bills.forEach((bill: any) => {
    const key = `${bill.month}-${bill.year}`.toLowerCase();
    if (!monthYearMap[key]) monthYearMap[key] = 0;

    monthYearMap[key] += bill.amount || 0;
  });

  // 3️⃣ Sort keys by month-year
  const monthOrder = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];

  const sortedKeys = Object.keys(monthYearMap).sort((a, b) => {
    const [monthA, yearA] = a.split('-');
    const [monthB, yearB] = b.split('-');
    if (parseInt(yearA) !== parseInt(yearB)) return parseInt(yearA) - parseInt(yearB);
    return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
  });

  // 4️⃣ Prepare data for pie chart
  const series = sortedKeys.map(k => monthYearMap[k]);
  const labels = sortedKeys.map(k => k.toUpperCase());

  // 5️⃣ Initialize chart
  this.charts['billCreatorPie'] = {
    categories: labels,
    series: series,
    currentPage: 0,
    pageSize: 12,
    chartOptions: {
      series: series,
      chart: {
        type: 'pie',
        height: 400
      },
      labels: labels,
      title: {
        text: 'Monthly Bill Amount Generation'
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          const label = opts.w.globals.labels[opts.seriesIndex];
          return `${label}: ${val}%`;
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => 'Rs. ' + val
        }
      }
    }
  };
}


  goToDashboard(){
    this.showDashboard = true;
  }

  goBack(){
    this.showDashboard = false;
  }

  toggleExpand(chartId: string): void {
    this.expandedChartId = this.expandedChartId === chartId ? null : chartId;
  }

}
