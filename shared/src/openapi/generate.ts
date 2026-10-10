import * as fs from 'fs';
import * as path from 'path';
import { generateOpenAPISpec } from './spec';

const spec = generateOpenAPISpec();
const outPath = path.resolve(__dirname, '../../openapi.json');
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf-8');
console.log(`OpenAPI specification generated successfully at ${outPath}`);
