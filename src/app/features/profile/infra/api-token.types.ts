export type ApiTokenApi = {
  id: string;
  nomAffiche: string;
  createdAt: string;
  derniereUtilisation?: string;
};

export type ApiTokenCreatedApi = ApiTokenApi & {
  token: string;
};
