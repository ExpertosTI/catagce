"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CreateOrderSchema: () => CreateOrderSchema,
  SellerSchema: () => SellerSchema
});
module.exports = __toCommonJS(index_exports);
var import_zod = require("zod");
var SellerSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  name: import_zod.z.string().min(1),
  slug: import_zod.z.string().min(1)
});
var CreateOrderSchema = import_zod.z.object({
  buyerName: import_zod.z.string().min(2),
  buyerPhone: import_zod.z.string().min(8),
  items: import_zod.z.array(import_zod.z.object({
    productId: import_zod.z.string().uuid(),
    quantity: import_zod.z.number().positive(),
    uomId: import_zod.z.number()
  }))
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CreateOrderSchema,
  SellerSchema
});
