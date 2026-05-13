import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('media')
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    const { productId, imageUrl, sellerId } = job.data;
    
    this.logger.log(`Procesando media para producto ${productId} del seller ${sellerId}`);

    // Aquí iría la lógica de optimización de imagen (Sharp) y subida a un bucket
    // O simplemente marcar la imagen como 'procesada' en la DB.
    
    // De momento, validamos que la URL es accesible
    try {
      const res = await fetch(imageUrl, { method: 'HEAD' });
      if (!res.ok) throw new Error('Imagen no accesible');
      
      this.logger.log(`Media validada para ${productId}`);
      return { status: 'processed', url: imageUrl };
    } catch (err: any) {
      this.logger.error(`Error procesando media: ${err.message}`);
      return { status: 'failed' };
    }
  }
}
