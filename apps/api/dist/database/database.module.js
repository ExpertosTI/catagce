"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DatabaseModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = exports.DRIZZLE = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@catagce/db");
const migrations_1 = require("./migrations");
exports.DRIZZLE = 'DRIZZLE';
let DatabaseModule = DatabaseModule_1 = class DatabaseModule {
    db;
    logger = new common_1.Logger(DatabaseModule_1.name);
    constructor(db) {
        this.db = db;
    }
    async onModuleInit() {
        if (process.env.SKIP_MIGRATIONS === '1') {
            this.logger.warn('SKIP_MIGRATIONS=1 — skipping embedded migrations.');
            return;
        }
        this.logger.log('Running embedded migrations...');
        try {
            await (0, migrations_1.runEmbeddedMigrations)(this.db, this.logger);
            this.logger.log('Database schema is up to date.');
        }
        catch (err) {
            this.logger.error(`Migrations failed: ${err.message}`);
            if (process.env.MIGRATIONS_STRICT === '1') {
                throw err;
            }
        }
    }
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = DatabaseModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.DRIZZLE,
                useFactory: () => {
                    const dbUrl = process.env.DATABASE_URL;
                    if (!dbUrl) {
                        throw new Error('DATABASE_URL is not defined');
                    }
                    const max = parseInt(process.env.DB_POOL_MAX || '20', 10);
                    const idle = parseInt(process.env.DB_POOL_IDLE || '30', 10);
                    const connect = parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '10', 10);
                    return (0, db_1.createClient)(dbUrl, {
                        max,
                        idleTimeout: idle,
                        connectTimeout: connect,
                        disablePreparedStatements: process.env.DB_PGBOUNCER === '1',
                    });
                },
            },
        ],
        exports: [exports.DRIZZLE],
    }),
    __param(0, (0, common_1.Inject)(exports.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], DatabaseModule);
