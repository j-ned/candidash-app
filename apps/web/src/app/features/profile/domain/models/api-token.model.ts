export type ApiToken = {
  id: string;
  nomAffiche: string;
  createdAt: Date;
  derniereUtilisation?: Date;
};

export type ApiTokenCreated = ApiToken & {
  token: string;
};
