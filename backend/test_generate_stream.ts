import { generateController } from './src/controllers/generate.controller';
import { Request, Response } from 'express';
import { GenerateContentInput } from './src/middleware/validate.middleware';

async function test() {
  const req = {
    user: { id: '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c' },
    body: { hook_text: "Imagine a world where..." },
    validatedBody: {
      topic: "AI in Healthcare",
      description: "AI in Healthcare is big.",
      content_type: "linkedin_short",
      keywords: ["ai", "healthcare"]
    }
  } as unknown as Request;
  
  const res = {
    setHeader: (name: string, value: string) => {},
    write: (data: any) => console.log('WRITE:', data),
    end: () => console.log('END'),
    status: (code: number) => ({ json: (data: any) => console.log('STATUS', code, data) }),
    json: (data: any) => console.log('JSON', JSON.stringify(data, null, 2))
  } as unknown as Response;

  await generateController.generateStream(req, res);
  process.exit(0);
}

test();
