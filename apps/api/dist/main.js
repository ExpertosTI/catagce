"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
async function bootstrap() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be set and at least 32 characters long');
    }
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    // Logger sencillo para depuración de rutas
    app.use((req, res, next) => {
        if (req.method !== 'OPTIONS') {
            common_1.Logger.log(`🚀 ${req.method} ${req.url}`, 'Network');
        }
        next();
    });
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: false, // Desactivar CSP temporalmente para asegurar carga de assets
    }));
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: true, // Permitir cualquier origen que coincida con la lógica de cookies
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: 'Content-Type, Accept, Authorization',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.enableShutdownHooks();
    const port = parseInt(process.env.PORT || '42100', 10);
    await app.listen(port, '0.0.0.0');
    common_1.Logger.log(`API ready on :${port}`, 'Bootstrap');
}
bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
});
