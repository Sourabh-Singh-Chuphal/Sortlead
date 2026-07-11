import { CrmRecordSchema } from '../validator.js';

describe('CrmRecordSchema Validation Tests', () => {
  it('should validate a correct CRM record', () => {
    const validRecord = {
      created_at: '2026-07-11T12:00:00.000Z',
      name: 'John Doe',
      email: 'john@example.com',
      country_code: '+1',
      mobile_without_country_code: '5551234567',
      company: 'Acme Corp',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      lead_owner: 'Alice Owner',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: 'Nice guy',
      data_source: 'leads_on_demand',
      possession_time: 'Immediate',
      description: 'Interested in product'
    };

    const result = CrmRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
      expect(result.data.data_source).toBe('leads_on_demand');
    }
  });

  it('should validate if email is missing but mobile is present', () => {
    const record = {
      name: 'John Doe',
      mobile_without_country_code: '5551234567'
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('should validate if mobile is missing but email is present', () => {
    const record = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('should fail validation if both email and mobile are missing', () => {
    const record = {
      name: 'John Doe',
      company: 'Acme Corp'
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      expect(messages).toContain('Record skipped: has neither email nor mobile number');
    }
  });

  it('should map invalid crm_status to empty string', () => {
    const record = {
      email: 'john@example.com',
      crm_status: 'INVALID_STATUS'
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crm_status).toBe('');
    }
  });

  it('should map invalid data_source to empty string', () => {
    const record = {
      email: 'john@example.com',
      data_source: 'unknown_source'
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data_source).toBe('');
    }
  });

  it('should fail validation if created_at is an invalid date string', () => {
    const record = {
      email: 'john@example.com',
      created_at: 'not-a-date'
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      expect(messages).toContain("created_at must parse successfully with JavaScript's new Date(created_at)");
    }
  });

  it('should pass validation if created_at is missing or empty', () => {
    const record = {
      email: 'john@example.com',
      created_at: ''
    };

    const result = CrmRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.created_at).toBeUndefined();
    }
  });
});
