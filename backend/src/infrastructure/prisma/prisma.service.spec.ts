import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('builds with the pg adapter and disconnects on module destroy', async () => {
    const config = {
      getOrThrow: jest.fn(() => 'postgresql://u:p@localhost:5432/db'),
    };
    const service = new PrismaService(config as unknown as ConfigService);
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue();
    await service.onModuleDestroy();
    expect(config.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    expect(disconnect).toHaveBeenCalled();
  });
});
