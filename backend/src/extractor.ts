import Anthropic from '@anthropic-ai/sdk';
import pRetry from 'p-retry';
import dotenv from 'dotenv';
import { CrmRecordSchema, type CrmRecord } from './validator.js';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
const modelName = process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022';

const anthropic = new Anthropic({
  apiKey: apiKey || '',
});

export interface SkipRecord {
  row: any;
  reason: string;
}

export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkipRecord[];
  totalImported: number;
  totalSkipped: number;
}

const SYSTEM_PROMPT = `You are a high-performance CRM data extraction assistant. Your job is to extract CRM records from arbitrary raw CSV data rows and map them into the target CRM schema.

Here are the EXTRACTION RULES you must follow verbatim:
- crm_status: only one of GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE — else leave blank.
- data_source: only one of leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — else leave blank.
- created_at must parse successfully with JavaScript's \`new Date(created_at)\`.
- crm_note holds: remarks, follow-up notes, extra comments, extra phone numbers, extra email addresses, anything that doesn't fit another field.
- If multiple emails exist, use the first as \`email\` and append the rest to crm_note. Same rule for multiple mobile numbers.
- Each record must stay a single CSV-safe row — escape any necessary line breaks (e.g. \\n).
- Skip a record entirely if it has neither an email nor a mobile number; include the skip reason in the response.

Instructions:
1. For each item in the input array, extract the fields according to the schema.
2. Maintain the mapping of the raw row by returning the correct \`_original_index\` corresponding to the index of the row in the input array.
3. Be confident in your extraction. If a value does not fit any schema field, add it to \`crm_note\`.
4. Return the results by calling the \`extract_crm_records\` tool.
`;

const extractTool = {
  name: 'extract_crm_records',
  description: 'Extract and normalize CRM records from arbitrary raw CSV rows.',
  input_schema: {
    type: 'object',
    properties: {
      records: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            created_at: {
              type: 'string',
              description: 'Date and time of creation. Must be parseable by JavaScript Date constructor.'
            },
            name: { type: 'string', description: 'Name of the contact or lead.' },
            email: { type: 'string', description: 'Primary email address. If multiple exist, use the first and append the rest to crm_note.' },
            country_code: { type: 'string', description: 'Country dialing code, e.g. +1, +91.' },
            mobile_without_country_code: { type: 'string', description: 'Mobile phone number without country dial code or symbols.' },
            company: { type: 'string', description: 'Company name.' },
            city: { type: 'string', description: 'City.' },
            state: { type: 'string', description: 'State or region.' },
            country: { type: 'string', description: 'Country name.' },
            lead_owner: { type: 'string', description: 'Name of the lead owner.' },
            crm_status: {
              type: 'string',
              description: 'Must be one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. If not matching these, leave blank.'
            },
            crm_note: {
              type: 'string',
              description: 'Holds remarks, follow-ups, additional emails/mobiles, and metadata not fitting other fields.'
            },
            data_source: {
              type: 'string',
              description: 'Must be one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If not matching these, leave blank.'
            },
            possession_time: { type: 'string', description: 'Timeline or date/time for possession or inquiry interest.' },
            description: { type: 'string', description: 'General description, notes, or messages.' },
            _original_index: {
              type: 'integer',
              description: 'The 0-based index of the raw row in the input array. This is required.'
            }
          },
          required: ['_original_index']
        }
      }
    },
    required: ['records']
  }
};

/**
 * Call Claude to extract a batch of raw records.
 * Retries up to 2x using p-retry.
 */
function localMockExtract(batchWithIndex: any[]): any[] {
  return batchWithIndex.map(row => {
    const record: any = {
      _original_index: row._original_index
    };

    const findValue = (keywords: string[], excludeKeywords: string[] = []) => {
      const matchedKey = Object.keys(row).find(key => {
        const lowerKey = key.toLowerCase();
        return keywords.some(kw => lowerKey.includes(kw)) && !excludeKeywords.some(ex => lowerKey.includes(ex));
      });
      return matchedKey ? String(row[matchedKey]).trim() : undefined;
    };

    record.name = findValue(['name', 'fullname', 'first_name', 'lead']);
    record.email = findValue(['email', 'mail']);
    
    record.country_code = findValue(['country code', 'country_code', 'dial']);
    const phoneVal = findValue(['phone', 'mobile', 'contact', 'number', 'phn'], ['code']);
    if (phoneVal) {
      if (phoneVal.startsWith('+')) {
        const match = phoneVal.match(/^(\+\d{1,3})\s*(.*)$/);
        if (match) {
          if (!record.country_code) record.country_code = match[1];
          record.mobile_without_country_code = match[2].replace(/\D/g, '');
        } else {
          record.mobile_without_country_code = phoneVal.replace(/\D/g, '');
        }
      } else {
        record.mobile_without_country_code = phoneVal.replace(/\D/g, '');
      }
    }

    record.company = findValue(['company', 'org', 'firm']);
    record.city = findValue(['city', 'town']);
    record.state = findValue(['state', 'province', 'region']);
    record.country = findValue(['country', 'nation'], ['code']);
    record.lead_owner = findValue(['owner', 'agent', 'assignee']);
    
    const statusVal = findValue(['status', 'crm_status']);
    if (statusVal) {
      const lower = statusVal.toLowerCase();
      if (lower.includes('follow') || lower.includes('good')) {
        record.crm_status = 'GOOD_LEAD_FOLLOW_UP';
      } else if (lower.includes('did not') || lower.includes('connect')) {
        record.crm_status = 'DID_NOT_CONNECT';
      } else if (lower.includes('bad') || lower.includes('junk')) {
        record.crm_status = 'BAD_LEAD';
      } else if (lower.includes('sale') || lower.includes('done') || lower.includes('won')) {
        record.crm_status = 'SALE_DONE';
      } else {
        record.crm_status = '';
      }
    } else {
      record.crm_status = '';
    }

    const sourceVal = findValue(['source', 'data_source', 'medium']);
    if (sourceVal) {
      const lower = sourceVal.toLowerCase();
      if (lower.includes('demand') || lower.includes('leads')) {
        record.data_source = 'leads_on_demand';
      } else if (lower.includes('meridian') || lower.includes('tower')) {
        record.data_source = 'meridian_tower';
      } else if (lower.includes('eden') || lower.includes('park')) {
        record.data_source = 'eden_park';
      } else if (lower.includes('varah') || lower.includes('swamy')) {
        record.data_source = 'varah_swamy';
      } else if (lower.includes('sarjapur') || lower.includes('plot')) {
        record.data_source = 'sarjapur_plots';
      } else {
        record.data_source = '';
      }
    } else {
      record.data_source = '';
    }

    record.possession_time = findValue(['possession', 'time', 'timeline', 'when']);
    record.description = findValue(['desc', 'msg', 'message', 'query']);
    record.crm_note = findValue(['note', 'remark', 'comment', 'extra']);

    const dateVal = findValue(['date', 'created', 'time']);
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        record.created_at = d.toISOString();
      } else {
        record.created_at = new Date().toISOString();
      }
    } else {
      record.created_at = new Date().toISOString();
    }

    return record;
  });
}

/**
 * Call Claude to extract a batch of raw records.
 * Retries up to 2x using p-retry.
 */
async function extractBatchWithRetry(batchWithIndex: any[]): Promise<any[]> {
  if (!apiKey) {
    console.warn('[WARNING] ANTHROPIC_API_KEY is not defined. Using local rule-based fallback extractor for testing.');
    return localMockExtract(batchWithIndex);
  }

  return pRetry(
    async () => {
      const response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Here is the batch of raw records as JSON:\n${JSON.stringify(batchWithIndex, null, 2)}`
          }
        ],
        tools: [extractTool],
        tool_choice: { type: 'tool', name: 'extract_crm_records' }
      });

      const toolUseContent = response.content.find((c) => c.type === 'tool_use');
      if (!toolUseContent || toolUseContent.type !== 'tool_use') {
        throw new Error('Claude response did not contain the expected tool use block.');
      }

      const input = toolUseContent.input as any;
      if (!input || !Array.isArray(input.records)) {
        throw new Error('Claude response tool use input was invalid or missing records array.');
      }

      return input.records;
    },
    {
      retries: 2,
      onFailedAttempt: (error) => {
        console.warn(
          `Anthropic API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries remaining. Error: ${error.message}`
        );
      }
    }
  );
}

/**
 * Processes all CSV rows. Chunks them into batches, sends them to Claude, validates with Zod, and aggregates the results.
 * Supports a progress callback for streaming updates (e.g. SSE).
 */
export async function processCsvImport(
  rawRows: any[],
  onProgress?: (progress: { currentBatch: number; totalBatches: number; importedCount: number; skippedCount: number }) => void
): Promise<ImportResult> {
  const BATCH_SIZE = 25;
  const imported: CrmRecord[] = [];
  const skipped: SkipRecord[] = [];

  const totalBatches = Math.ceil(rawRows.length / BATCH_SIZE);

  for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
    const chunk = rawRows.slice(i, i + BATCH_SIZE);
    const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Attach original index to raw rows for correlation
    const batchWithIndex = chunk.map((row, index) => ({
      ...row,
      _original_index: i + index
    }));

    let extractedRecords: any[] = [];
    let batchFailed = false;
    let batchErrorReason = 'Unknown failure calling AI extraction';

    try {
      extractedRecords = await extractBatchWithRetry(batchWithIndex);
    } catch (err: any) {
      console.error(`Batch ${currentBatchNum}/${totalBatches} completely failed after retries:`, err);
      batchFailed = true;
      batchErrorReason = err.message || String(err);
    }

    if (batchFailed) {
      // If the entire batch failed (e.g. rate limit, API outage, etc.), we mark all records in the batch as skipped
      for (const item of batchWithIndex) {
        skipped.push({
          row: item,
          reason: `AI processing failure: ${batchErrorReason}`
        });
      }
    } else {
      // Process extracted records and correlate with input rows
      const extractedIndexes = new Set<number>();

      for (const record of extractedRecords) {
        const origIndex = record._original_index;
        if (typeof origIndex !== 'number' || origIndex < i || origIndex >= i + chunk.length) {
          continue; // Skip invalid indices
        }

        extractedIndexes.add(origIndex);
        const originalRow = rawRows[origIndex];

        // Validate the record using Zod
        const validationResult = CrmRecordSchema.safeParse(record);

        if (validationResult.success) {
          // Check line breaks and escape them in text fields
          const cleanRecord = { ...validationResult.data };
          for (const key of Object.keys(cleanRecord)) {
            const val = (cleanRecord as any)[key];
            if (typeof val === 'string') {
              (cleanRecord as any)[key] = val.replace(/\r?\n/g, '\\n');
            }
          }
          imported.push(cleanRecord);
        } else {
          // Extract validation reasons
          const errors = validationResult.error.errors;
          const reason = errors.map((e) => `${e.path.join('.') || 'record'}: ${e.message}`).join('; ');
          skipped.push({
            row: originalRow,
            reason
          });
        }
      }

      // Check if any original rows in this batch were completely ignored/omitted by Claude
      for (let idx = 0; idx < chunk.length; idx++) {
        const globalIdx = i + idx;
        if (!extractedIndexes.has(globalIdx)) {
          const originalRow = rawRows[globalIdx];
          // Check if it's because the row lacks both email and mobile
          const hasEmail = originalRow && (originalRow.email || originalRow.Email || Object.keys(originalRow).some(k => k.toLowerCase().includes('email') && originalRow[k]));
          const hasPhone = originalRow && (originalRow.phone || originalRow.mobile || Object.keys(originalRow).some(k => (k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile') || k.toLowerCase().includes('contact')) && originalRow[k]));

          let reason = 'AI skipped extraction: record missing key information';
          if (!hasEmail && !hasPhone) {
            reason = 'Record skipped: lacks both email and mobile/phone columns or values';
          }

          skipped.push({
            row: originalRow,
            reason
          });
        }
      }
    }

    if (onProgress) {
      onProgress({
        currentBatch: currentBatchNum,
        totalBatches,
        importedCount: imported.length,
        skippedCount: skipped.length
      });
    }
  }

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length
  };
}
