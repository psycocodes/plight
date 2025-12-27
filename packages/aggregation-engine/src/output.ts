import Ajv from 'ajv';
import { AggregationOutput } from './types';
import * as fs from 'fs';
import * as path from 'path';
import stringify from 'fast-json-stable-stringify';

const ajv = new Ajv();

export function validateAndSerializeOutput(output: AggregationOutput): string {
  // path.join(__dirname) resolves to dist/ in production/build or src/ in ts-node
  // We need to robustly find the schema.
  // In dist structure: dist/output.js -> dist/schemas/aggregation_v1.json (../schemas)
  // In src structure: src/output.ts -> src/schemas/aggregation_v1.json (../schemas)
  // The current code used '../../schemas' which was incorrect for the flattened dist structure.

  const schemaPath = path.resolve(__dirname, './schemas/output.schema.json');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  // Validate schema version matches what's in the schema file
  const expectedVersion = schema.properties.schema_version.const;
  if (output.schema_version !== expectedVersion) {
    throw new Error(`Schema version mismatch: output has ${output.schema_version}, expected ${expectedVersion}`);
  }

  const validate = ajv.compile(schema);
  const valid = validate(output);

  if (!valid) {
    throw new Error(`Output validation failed: ${ajv.errorsText(validate.errors)}`);
  }

  // Use canonical JSON stringify to ensure byte-for-byte deterministic output
  // This guarantees stable key ordering and identical output hashes across runs
  const canonicalJson = stringify(output);

  // Pretty-print for readability while maintaining determinism
  return JSON.stringify(JSON.parse(canonicalJson), null, 2);
}
