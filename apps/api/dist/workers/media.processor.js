"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MediaProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
let MediaProcessor = MediaProcessor_1 = class MediaProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(MediaProcessor_1.name);
    async process(job) {
        const { productId, imageUrl, sellerId } = job.data;
        this.logger.log(`Procesando media para producto ${productId} del seller ${sellerId}`);
        // Aquí iría la lógica de optimización de imagen (Sharp) y subida a un bucket
        // O simplemente marcar la imagen como 'procesada' en la DB.
        // De momento, validamos que la URL es accesible
        try {
            const res = await fetch(imageUrl, { method: 'HEAD' });
            if (!res.ok)
                throw new Error('Imagen no accesible');
            this.logger.log(`Media validada para ${productId}`);
            return { status: 'processed', url: imageUrl };
        }
        catch (err) {
            this.logger.error(`Error procesando media: ${err.message}`);
            return { status: 'failed' };
        }
    }
};
exports.MediaProcessor = MediaProcessor;
exports.MediaProcessor = MediaProcessor = MediaProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('media')
], MediaProcessor);
