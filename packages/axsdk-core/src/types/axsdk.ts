import z from 'zod';

import type { DeferFn } from '../deferred';

export type AXHandler = (command: string, args: Record<string, unknown>, defer?: DeferFn) => Promise<unknown>;

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
  remote_knowledge: z.boolean().optional(),
  knowledge_url_fetch: z.boolean().optional(),
  knowledge: z.union([
    z.function().output(z.promise(z.record(z.string(), z.any()))),
    z.record(z.string(), z.any())
  ]).optional(),
});
export type AXSDKConfig = z.infer<typeof AXSDKConfigSchema>;
