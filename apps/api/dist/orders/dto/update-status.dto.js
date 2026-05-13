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
exports.UpdateOrderStatusDto = exports.ORDER_STATUS_VALUES = void 0;
const class_validator_1 = require("class-validator");
exports.ORDER_STATUS_VALUES = [
    'submitted',
    'reserved',
    'pending_seller_review',
    'confirmed',
    'partially_confirmed',
    'rejected',
    'cancelled',
    'expired',
];
class UpdateOrderStatusDto {
    status;
}
exports.UpdateOrderStatusDto = UpdateOrderStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.ORDER_STATUS_VALUES),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "status", void 0);
