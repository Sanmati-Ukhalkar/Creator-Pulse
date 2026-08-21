import { trendsController } from './src/controllers/trends.controller';
import { Request, Response } from 'express';

async function test() {
  const req = {
    user: { id: '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c' }
  } as unknown as Request;
  
  const res = {
    status: (code: number) => ({ json: (data: any) => console.log('STATUS', code, data) }),
    json: (data: any) => console.log('JSON', JSON.stringify(data, null, 2))
  } as unknown as Response;

  await trendsController.triggerResearch(req, res);
  process.exit(0);
}

test();
