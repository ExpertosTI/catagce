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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_module_1 = require("./database/database.module");
let HealthController = class HealthController {
    db;
    constructor(db) {
        this.db = db;
    }
    async check() {
        const checks = { app: 'ok', database: 'ok' };
        let migrations = null;
        try {
            await this.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
        }
        catch {
            checks.database = 'error';
        }
        if (checks.database === 'ok') {
            try {
                const rows = await this.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*)::int AS count FROM __catagce_migrations__`);
                migrations = rows[0]?.count ?? null;
            }
            catch {
                migrations = null;
            }
        }
        return {
            status: Object.values(checks).every((v) => v === 'ok') ? 'ok' : 'degraded',
            checks,
            migrations,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '0.1.0',
            env: process.env.NODE_ENV || 'unknown',
        };
    }
    ready() {
        return { ready: true, at: new Date().toISOString() };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], HealthController);
