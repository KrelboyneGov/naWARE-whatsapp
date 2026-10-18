import type {
  IClock,
  IDataSourceRepository,
  IIdGenerator,
  IOfficialNoticeImporter,
  IOfficialNoticeRepository,
} from "@emergency-map/domain/repositories";

export type SourcesDeps = {
  dataSources: IDataSourceRepository;
  notices: IOfficialNoticeRepository;
  /** One importer per source, looked up by `sourceId`. */
  importers: IOfficialNoticeImporter[];
  clock: IClock;
  ids: IIdGenerator;
};
