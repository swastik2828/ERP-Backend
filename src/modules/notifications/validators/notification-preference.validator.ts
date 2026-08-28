import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        notificationType: z.string().min(1, 'Notification type is required'),
        enabled: z.boolean(),
      })
    )
    .min(1, 'At least one preference must be provided'),
});
