import type { Sequelize } from '@sequelize/core';
import { AbstractDialect } from '@sequelize/core';
import type { SupportableNumericOptions } from '@sequelize/core/_non-semver-use-at-your-own-risk_/abstract-dialect/dialect.js';
import {
  createUnspecifiedOrderedBindCollector,
  escapeMysqlMariaDbString,
} from '@sequelize/core/_non-semver-use-at-your-own-risk_/utils/sql.js';
import { getSynchronizedTypeKeys } from '@sequelize/utils';
import { registerMariaDbDbDataTypeParsers } from './_internal/data-types-db.js';
import * as DataTypes from './_internal/data-types-overrides.js';
import type { MariaDbConnectionOptions, MariaDbModule } from './connection-manager.js';
import { MariaDbConnectionManager } from './connection-manager.js';
import { MariaDbQueryGenerator } from './query-generator.js';
import { MariaDbQueryInterface } from './query-interface.js';
import { MariaDbQuery } from './query.js';

export interface MariaDbDialectOptions {
  /**
   * The mariadb library to use.
   * If not provided, the mariadb npm library will be used.
   * Must be compatible with the mariadb npm library API.
   *
   * Using this option should only be considered as a last resort,
   * as the Sequelize team cannot guarantee its compatibility.
   */
  mariaDbModule?: MariaDbModule;
}

const DIALECT_OPTION_NAMES = getSynchronizedTypeKeys<MariaDbDialectOptions>({
  mariaDbModule: undefined,
});

const CONNECTION_OPTION_NAMES = getSynchronizedTypeKeys<MariaDbConnectionOptions>({
  database: undefined,
  host: undefined,
  port: undefined,
  socketPath: undefined,
  connectTimeout: undefined,
  socketTimeout: undefined,
  debug: undefined,
  debugCompress: undefined,
  debugLen: undefined,
  logParam: undefined,
  trace: undefined,
  multipleStatements: undefined,
  ssl: undefined,
  compress: undefined,
  logPackets: undefined,
  forceVersionCheck: undefined,
  foundRows: undefined,
  initSql: undefined,
  sessionVariables: undefined,
  maxAllowedPacket: undefined,
  keepAliveDelay: undefined,
  rsaPublicKey: undefined,
  cachingRsaPublicKey: undefined,
  allowPublicKeyRetrieval: undefined,
  prepareCacheLength: undefined,
  stream: undefined,
  metaEnumerable: undefined,
  infileStreamFactory: undefined,
  connectAttributes: undefined,
  charset: undefined,
  collation: undefined,
  user: undefined,
  password: undefined,
  permitSetMultiParamEntries: undefined,
  bulk: undefined,
  pipelining: undefined,
  permitLocalInfile: undefined,
  timeout: undefined,
  autoJsonMap: undefined,
  arrayParenthesis: undefined,
  checkDuplicate: undefined,
  checkNumberRange: undefined,
  logger: undefined,
});

const numericOptions: SupportableNumericOptions = {
  zerofill: true,
  unsigned: true,
};

export class MariaDbDialect extends AbstractDialect<
  MariaDbDialectOptions,
  MariaDbConnectionOptions
> {
  static supports = AbstractDialect.extendSupport({
    'VALUES ()': true,
    'LIMIT ON UPDATE': true,
    lock: true,
    forShare: 'LOCK IN SHARE MODE',
    settingIsolationLevelDuringTransaction: false,
    schemas: true,
    inserts: {
      ignoreDuplicates: ' IGNORE',
      updateOnDuplicate: ' ON DUPLICATE KEY UPDATE',
    },
    index: {
      collate: false,
      length: true,
      parser: true,
      type: true,
      using: 1,
    },
    constraints: {
      foreignKeyChecksDisableable: true,
      removeOptions: { ifExists: true },
    },
    indexViaAlter: true,
    indexHints: true,
    dataTypes: {
      COLLATE_BINARY: true,
      GEOMETRY: true,
      INTS: numericOptions,
      FLOAT: { ...numericOptions, scaleAndPrecision: true },
      REAL: { ...numericOptions, scaleAndPrecision: true },
      DOUBLE: { ...numericOptions, scaleAndPrecision: true },
      DECIMAL: numericOptions,
      JSON: true,
    },
    REGEXP: true,
    jsonOperations: true,
    jsonExtraction: {
      unquoted: true,
      quoted: true,
    },
    uuidV1Generation: true,
    globalTimeZoneConfig: true,
    removeColumn: {
      ifExists: true,
    },
    createSchema: {
      charset: true,
      collate: true,
      // TODO [>=2024-06-19]: uncomment when MariaDB 10.5 is oldest supported version
      // comment: true,
      ifNotExists: true,
      replace: true,
    },
    dropSchema: {
      ifExists: true,
    },
    startTransaction: {
      readOnly: true,
    },
  });

  readonly queryGenerator: MariaDbQueryGenerator;
  readonly connectionManager: MariaDbConnectionManager;
  readonly queryInterface: MariaDbQueryInterface;

  readonly Query = MariaDbQuery;

  constructor(sequelize: Sequelize, options: MariaDbDialectOptions) {
    super({
      dataTypesDocumentationUrl: 'https://mariadb.com/kb/en/library/resultset/#field-types',
      identifierDelimiter: '`',
      minimumDatabaseVersion: '10.4.30',
      name: 'mariadb',
      options,
      sequelize,
      dataTypeOverrides: DataTypes,
    });

    this.connectionManager = new MariaDbConnectionManager(this);
    this.queryGenerator = new MariaDbQueryGenerator(this);
    this.queryInterface = new MariaDbQueryInterface(this);

    registerMariaDbDbDataTypeParsers(this);
  }

  createBindCollector() {
    return createUnspecifiedOrderedBindCollector();
  }

  escapeString(value: string) {
    return escapeMysqlMariaDbString(value);
  }

  canBackslashEscape() {
    return true;
  }

  getDefaultSchema(): string {
    return (this.sequelize as Sequelize<MariaDbDialect>).options.replication.write.database ?? '';
  }

  static getDefaultPort() {
    return 3306;
  }

  static getSupportedOptions() {
    return DIALECT_OPTION_NAMES;
  }

  static getSupportedConnectionOptions() {
    return CONNECTION_OPTION_NAMES;
  }
}
