import z from 'zod';

export type AXHandler = (command: string, args: Record<string, unknown>) => Promise<unknown>;

export const AXSDKTranslationsSchema = z.record(z.string(), z.string());
export type AXSDKTranslationsSchema = z.infer<typeof AXSDKTranslationsSchema>;

export const AXSDKConfigSchema = z.object({
  baseUrl: z.string().optional(),
  basePath: z.string().optional(),
  apiKey: z.string(),
  appId: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  axHandler: z.custom<AXHandler>(),
  language: z.string().optional(),
  debug: z.boolean().optional(),
  translations: z.record(z.string(), AXSDKTranslationsSchema).optional(),
  env: z.union([
    z.function().output(z.promise(z.record(z.string(), z.any()))),
    z.record(z.string(), z.any())
  ]).optional(),
  data: z.union([
    z.function().output(z.promise(z.record(z.string(), z.any()))),
    z.record(z.string(), z.any())
  ]).optional(),
  reopen_closed: z.boolean().optional(),
  remote_knowledge: z.boolean().optional(),
  knowledge: z.union([
    z.function().output(z.promise(z.record(z.string(), z.any()))),
    z.record(z.string(), z.any())
  ]).optional(),
});
export type AXSDKConfig = z.infer<typeof AXSDKConfigSchema>;
