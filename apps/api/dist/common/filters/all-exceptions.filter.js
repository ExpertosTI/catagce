"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger = new common_1.Logger('Http');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const r = exception.getResponse();
            message = typeof r === 'string' ? r : r?.message || r;
            code = typeof r === 'object' ? r?.error : undefined;
        }
        else if (exception && typeof exception === 'object') {
            const anyEx = exception;
            message = anyEx.message || message;
            code = anyEx.code;
        }
        if (status >= 500) {
            this.logger.error(`${req.method} ${req.originalUrl || req.url} → ${status} [${code ?? 'ERROR'}]`, exception instanceof Error ? exception.stack : undefined);
        }
        else {
            this.logger.warn(`${req.method} ${req.originalUrl || req.url} → ${status} [${code ?? 'BAD_REQUEST'}] ${typeof message === 'string' ? message : JSON.stringify(message)}`);
        }
        res.status(status).json({
            statusCode: status,
            error: code,
            message,
            path: req.originalUrl || req.url,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
