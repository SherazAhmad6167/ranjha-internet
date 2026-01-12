import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ApplayoutComponent } from './components/applayout/applayout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserDetailsComponent } from './components/user-details/user-details.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    component: ApplayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'user-details', component: UserDetailsComponent },
    ],
  },
];
