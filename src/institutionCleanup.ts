export type InstitutionRecord = {
  institutionId?: string;
  productId?: string;
  [key: string]: unknown;
};

export const pruneInstitutionRecords = <T extends InstitutionRecord>(records: T[], institutionId: string) =>
  records.filter((record) => record.institutionId !== institutionId);

export const institutionIdsFrom = <T extends { id?: string }>(items: T[]) =>
  new Set(items.map((item) => item.id).filter((id): id is string => Boolean(id)));
