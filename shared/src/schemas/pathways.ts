import { z } from 'zod';
import { PathwayCodeEnum } from './enums';

export const PathwayDTO = z.object({
  id: z.string().uuid(),
  code: PathwayCodeEnum,
  name: z.string()
});
export type Pathway = z.infer<typeof PathwayDTO>;
