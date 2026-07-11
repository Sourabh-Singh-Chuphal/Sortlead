import { z } from 'zod';

export const CrmStatusSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'].includes(cleaned)) {
      return cleaned;
    }
  }
  return '';
}, z.string());

export const DataSourceSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'].includes(cleaned)) {
      return cleaned;
    }
  }
  return '';
}, z.string());

export const CreatedAtSchema = z.preprocess((val) => {
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    return undefined;
  }
  return val;
}, z.string().optional().refine((val) => {
  if (val === undefined) return true;
  const date = new Date(val);
  return !isNaN(date.getTime());
}, {
  message: "created_at must parse successfully with JavaScript's new Date(created_at)"
}));

export const CrmRecordSchema = z.object({
  created_at: CreatedAtSchema,
  name: z.string().optional().nullable().transform(val => val?.trim() || ''),
  email: z.string().optional().nullable().transform(val => val?.trim() || ''),
  country_code: z.string().optional().nullable().transform(val => val?.trim() || ''),
  mobile_without_country_code: z.string().optional().nullable().transform(val => val?.trim() || ''),
  company: z.string().optional().nullable().transform(val => val?.trim() || ''),
  city: z.string().optional().nullable().transform(val => val?.trim() || ''),
  state: z.string().optional().nullable().transform(val => val?.trim() || ''),
  country: z.string().optional().nullable().transform(val => val?.trim() || ''),
  lead_owner: z.string().optional().nullable().transform(val => val?.trim() || ''),
  crm_status: CrmStatusSchema,
  crm_note: z.string().optional().nullable().transform(val => val?.trim() || ''),
  data_source: DataSourceSchema,
  possession_time: z.string().optional().nullable().transform(val => val?.trim() || ''),
  description: z.string().optional().nullable().transform(val => val?.trim() || ''),
  _original_index: z.number().optional()
}).refine((data) => {
  const hasEmail = typeof data.email === 'string' && data.email.trim() !== '';
  const hasMobile = typeof data.mobile_without_country_code === 'string' && data.mobile_without_country_code.trim() !== '';
  return hasEmail || hasMobile;
}, {
  message: "Record skipped: has neither email nor mobile number",
  path: ["email", "mobile_without_country_code"]
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;
