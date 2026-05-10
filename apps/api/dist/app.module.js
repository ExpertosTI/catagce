"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const health_controller_1 = require("./health.controller");
const database_module_1 = require("./database/database.module");
const auth_module_1 = require("./auth/auth.module");
const products_module_1 = require("./products/products.module");
const catalogs_module_1 = require("./catalogs/catalogs.module");
const orders_module_1 = require("./orders/orders.module");
const bullmq_1 = require("@nestjs/bullmq");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            catalogs_module_1.CatalogsModule,
            orders_module_1.OrdersModule,
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST ?? 'localhost',
                    port: parseInt(process.env.REDIS_PORT ?? '6379'),
                },
            }),
        ],
        controllers: [health_controller_1.HealthController],
        providers: [],
    })
], AppModule);
