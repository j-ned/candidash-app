import type { ApiToken, ApiTokenCreated } from '../domain/models/api-token.model';
import type { ApiTokenApi, ApiTokenCreatedApi } from './api-token.types';

/** Fonction pure : DTO API → modèle domain (dates ISO → Date). */
export function toApiToken(api: ApiTokenApi): ApiToken {
  return {
    id: api.id,
    nomAffiche: api.nomAffiche,
    createdAt: new Date(api.createdAt),
    derniereUtilisation: api.derniereUtilisation
      ? new Date(api.derniereUtilisation)
      : undefined,
  };
}

export function toApiTokenCreated(api: ApiTokenCreatedApi): ApiTokenCreated {
  return { ...toApiToken(api), token: api.token };
}
