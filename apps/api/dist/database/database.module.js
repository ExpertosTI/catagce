"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = exports.DRIZZLE = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@catagce/db");
exports.DRIZZLE = 'DRIZZLE';
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
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
                    return (0, db_1.createClient)(dbUrl);
                },
            },
        ],
        exports: [exports.DRIZZLE],
    })
], DatabaseModule);
