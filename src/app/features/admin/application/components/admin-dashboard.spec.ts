import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Config } from '@core/services/config';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  const API = 'https://api.example.test/api/v1';
  let http: HttpTestingController;

  const USERS = [
    {
      id: 'u1',
      email: 'camille@example.com',
      username: 'Camille',
      role: 'USER',
      totpEnabled: true,
      createdAt: '2026-10-01T10:00:00.000Z',
      applicationsCount: 3,
      lastActivityAt: '2026-10-15T08:00:00.000Z',
    },
    {
      id: 'u2',
      email: 'julien@example.com',
      username: null,
      role: 'ADMIN',
      totpEnabled: false,
      createdAt: '2026-09-01T10:00:00.000Z',
      applicationsCount: 0,
      lastActivityAt: null,
    },
  ];

  const STATS = {
    days: 7,
    visitors: 5,
    pageviews: 12,
    daily: [
      { date: '2026-10-16', visitors: 2, pageviews: 4 },
      { date: '2026-10-17', visitors: 3, pageviews: 8 },
    ],
    topPages: [{ label: '/', count: 7 }],
    topReferrers: [{ label: 'www.google.com', count: 2 }],
  };

  async function setup(): Promise<ComponentFixture<AdminDashboard>> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Config, useValue: { apiUrl: API } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    return fixture;
  }

  async function flush(
    fixture: ComponentFixture<AdminDashboard>,
    url: string,
    body: unknown,
  ): Promise<void> {
    TestBed.tick();
    http.expectOne(url).flush(body);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function byTestId(fixture: ComponentFixture<AdminDashboard>, id: string): HTMLElement {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  afterEach(() => http.verify());

  it('lists the registered users with their activity', async () => {
    // Given
    const fixture = await setup();

    // When
    await flush(fixture, `${API}/admin/users`, USERS);

    // Then
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="admin-user-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('camille@example.com');
    expect(rows[0].textContent).toContain('3');
    expect(byTestId(fixture, 'admin-users-count').textContent).toContain('2');
  });

  it('loads the visit statistics when the traffic tab is opened', async () => {
    // Given
    const fixture = await setup();
    await flush(fixture, `${API}/admin/users`, USERS);

    // When
    byTestId(fixture, 'admin-tab-analytics').click();
    fixture.detectChanges();
    await flush(fixture, `${API}/admin/analytics?days=30`, { ...STATS, days: 30 });

    // Then
    expect(byTestId(fixture, 'admin-visitors').textContent).toContain('5');
    expect(byTestId(fixture, 'admin-pageviews').textContent).toContain('12');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="admin-day-row"]').length).toBe(2);
    expect(byTestId(fixture, 'admin-top-referrers').textContent).toContain('www.google.com');
  });

  it('reloads the statistics for another period', async () => {
    // Given
    const fixture = await setup();
    await flush(fixture, `${API}/admin/users`, USERS);
    byTestId(fixture, 'admin-tab-analytics').click();
    fixture.detectChanges();
    await flush(fixture, `${API}/admin/analytics?days=30`, { ...STATS, days: 30 });

    // When
    const select = byTestId(fixture, 'admin-period') as HTMLSelectElement;
    select.value = '7';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // Then
    await flush(fixture, `${API}/admin/analytics?days=7`, STATS);
  });
});
