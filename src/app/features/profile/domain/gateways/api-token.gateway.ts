import { Observable } from 'rxjs';
import type { ApiToken, ApiTokenCreated } from '../models/api-token.model';

export abstract class ApiTokenGateway {
  abstract create(nomAffiche: string): Observable<ApiTokenCreated>;
  abstract list(): Observable<ApiToken[]>;
  abstract revoke(id: string): Observable<{ message: string }>;
}
