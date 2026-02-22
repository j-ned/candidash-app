import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { JobtrackGateway } from '../gateways/jobtrack.gateway';

@Injectable({ providedIn: 'root' })
export class DeleteJobtrackUseCase {
  private readonly gateway = inject(JobtrackGateway);

  execute(id: string): Observable<void> {
    return this.gateway.delete(id);
  }
}
