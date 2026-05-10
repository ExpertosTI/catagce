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
exports.PublicOrdersController = exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const orders_service_1 = require("./orders.service");
const submit_public_order_dto_1 = require("./dto/submit-public-order.dto");
const user_decorator_1 = require("../common/decorators/user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    // Seller: view own orders
    findAll(user) {
        return this.ordersService.findAll(user.sellerId);
    }
    // Seller: confirm / reject / update status
    updateStatus(user, id, status) {
        return this.ordersService.updateStatus(id, user.sellerId, status);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateStatus", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
// Public buyer endpoint — separate controller prefix so it cannot be confused
// with seller-authenticated order management
let PublicOrdersController = class PublicOrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    /**
     * Zero-login order submission from buyer.
     * Rate-limited to 20 req/min per IP to prevent flooding.
     * unitPrice is resolved server-side from catalog snapshot — never trusted from client.
     */
    submit(body) {
        return this.ordersService.submitPublicOrder(body);
    }
};
exports.PublicOrdersController = PublicOrdersController;
__decorate([
    (0, throttler_1.Throttle)({ default: { ttl: 60_000, limit: 20 } }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_public_order_dto_1.SubmitPublicOrderDto]),
    __metadata("design:returntype", void 0)
], PublicOrdersController.prototype, "submit", null);
exports.PublicOrdersController = PublicOrdersController = __decorate([
    (0, common_1.Controller)('public/orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], PublicOrdersController);
