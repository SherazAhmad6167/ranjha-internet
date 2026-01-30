import { LogsComponent } from './components/logs/logs.component';
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ApplayoutComponent } from './components/applayout/applayout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserDetailsComponent } from './components/user-details/user-details.component';
import { AreaDetailsComponent } from './components/area-details/area-details.component';
import { RecoveryOfficerComponent } from './components/recovery-officer/recovery-officer.component';
import { PackageDetailsComponent } from './components/package-details/package-details.component';
import { AuthGuard } from './shared/auth.guard';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { BillCreatorComponent } from './components/bill-creator/bill-creator.component';
import { UsersCollectionsComponent } from './components/users-collections/users-collections.component';
import { DefaulterUsersComponent } from './components/defaulter-users/defaulter-users.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    component: ApplayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: 'dashboard', data: { roles: ['admin'] }, component: DashboardComponent },
      { path: 'user-details', data: { roles: ['operator', 'admin'] }, component: UserDetailsComponent },
      { path: 'area-details', data: { roles: ['admin'] }, component: AreaDetailsComponent },
      { path: 'recovery-officer', data: { roles: ['admin'] }, component: RecoveryOfficerComponent },
      { path: 'package-details', data: { roles: ['admin'] }, component: PackageDetailsComponent },
      { path: 'bill-creator', data: { roles: ['admin'] }, component: BillCreatorComponent },
      { path: 'user-collections', data: { roles: ['admin', 'operator'] }, component: UsersCollectionsComponent },
      { path: 'logs', data: { roles: ['admin'] }, component: LogsComponent },
      { path: 'defaulter-users', data: { roles: ['admin'] }, component: DefaulterUsersComponent },
    ],
  },
  { path: 'not-found', component: PageNotFoundComponent }, // 👈 create a 404 component
{ path: '**', redirectTo: 'not-found' },
];
