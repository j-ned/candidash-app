import { Component } from '@angular/core';
import { Layout } from '@shared/ui/layout/layout';
import { AdminDashboard } from '../../application/components/admin-dashboard';

@Component({
  selector: 'app-admin',
  imports: [Layout, AdminDashboard],
  template: `
    <app-layout>
      <app-admin-dashboard />
    </app-layout>
  `,
})
export class Admin {}
