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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitPublicOrderDto = exports.OrderItemDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class OrderItemDto {
    productId;
    /**
     * Quantity requested by the buyer (in the selected UOM).
     * Must be a positive integer — fractional quantities not allowed at order level.
     */
    quantity;
    /**
     * Unit of measure ID — optional; defaults to product base UOM if omitted.
     * Server resolves price from catalog snapshot, not from client.
     */
    uomId;
}
exports.OrderItemDto = OrderItemDto;
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'productId must be a valid UUID' }),
    __metadata("design:type", String)
], OrderItemDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: 'quantity must be an integer' }),
    (0, class_validator_1.IsPositive)({ message: 'quantity must be positive' }),
    __metadata("design:type", Number)
], OrderItemDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], OrderItemDto.prototype, "uomId", void 0);
class SubmitPublicOrderDto {
    /**
     * Slug of the active catalog — server resolves seller context from this.
     * Clients NEVER provide sellerId directly (multi-tenant security boundary).
     */
    catalogSlug;
    buyerName;
    /**
     * WhatsApp-compatible phone number.
     * Accepts international format: +18091234567 or local 8091234567.
     */
    buyerPhone;
    /**
     * Client-generated idempotency key to prevent duplicate order submission.
     * Should be a UUID v4 generated once per order form session.
     */
    idempotencyKey;
    items;
}
exports.SubmitPublicOrderDto = SubmitPublicOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^[a-z0-9-]+$/, { message: 'catalogSlug must be lowercase alphanumeric with dashes' }),
    __metadata("design:type", String)
], SubmitPublicOrderDto.prototype, "catalogSlug", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SubmitPublicOrderDto.prototype, "buyerName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\+?[1-9]\d{7,14}$/, { message: 'buyerPhone must be a valid phone number' }),
    __metadata("design:type", String)
], SubmitPublicOrderDto.prototype, "buyerPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], SubmitPublicOrderDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one item is required' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OrderItemDto),
    __metadata("design:type", Array)
], SubmitPublicOrderDto.prototype, "items", void 0);
