export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_CONTENT_CHARS = 200_000;
export const MAX_QUESTION_CHARS = 2_000;
export const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;
export const CATEGORIES = ['Academic', 'Financial', 'Career', 'Personal', 'Meeting', 'General'];
export const NOT_FOUND = "I couldn't find this information in your memories.";
export const FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
};
export function text(value: unknown, name: string, max: number, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${name} must be ${required ? 'nonempty ' : ''}text of at most ${max} characters.`);
  return value.trim();
}
export function tags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 20 || value.some(t => typeof t !== 'string' || t.length > 40)) throw new Error('Use at most 20 tags, each at most 40 characters.');
  return [...new Set(value.map(t => t.trim()).filter(Boolean))];
}
export function category(value: unknown): string {
  if (typeof value !== 'string' || !CATEGORIES.includes(value)) throw new Error('Invalid category.');
  return value;
}
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)) throw new Error('Invalid record ID.');
  return value;
}
export function fileType(file: {name: string; size: number; type?: string}): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = Object.prototype.hasOwnProperty.call(FILE_TYPES,ext)?FILE_TYPES[ext]:undefined;
  if (!mime) throw new Error('Supported files: PDF, DOCX, XLSX, TXT, MD, CSV, JSON, PNG, JPG, WEBP.');
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error('Choose a nonempty file no larger than 15 MB.');
  if (file.type && file.type !== 'application/octet-stream' && file.type !== mime && !(ext === 'md' && file.type === 'text/plain') && !(ext === 'csv' && ['application/vnd.ms-excel','text/plain'].includes(file.type))) throw new Error('File type does not match its extension.');
  return mime;
}
export function dueDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Choose a date and time with a timezone.');
  const parts=value.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/)!;
  const y=Number(parts[1]),m=Number(parts[2]),d=Number(parts[3]);
  const date=new Date(0);date.setUTCFullYear(y,m-1,d);
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d||Number(parts[4])>23||Number(parts[5])>59||Number(parts[6]||0)>59)throw new Error('Invalid calendar date.');
  return new Date(value).toISOString();
}
export async function validateSignature(file:File):Promise<void> {
  const mime=fileType(file);const b=new Uint8Array(await file.slice(0,12).arrayBuffer());const ascii=new TextDecoder().decode(b);
  const valid=mime==='application/pdf'?ascii.startsWith('%PDF-'):mime==='image/png'?b[0]===137&&ascii.slice(1,4)==='PNG':mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:mime==='image/webp'?ascii.startsWith('RIFF')&&ascii.slice(8)==='WEBP':mime.includes('openxmlformats')?b[0]===80&&b[1]===75:true;
  if(!valid)throw new Error('File contents do not match its extension.');
}
export interface Evidence { id: string; title: string; original_file_name?: string | null; type: string; content?: string }
export function verifiedAnswer(raw: unknown, memories: Evidence[]) {
  const result = raw as { answer?: unknown; foundInformation?: unknown; conflictDetected?: unknown; sources?: unknown } | null;
  if (!result || typeof result.answer !== 'string' || !result.answer.trim() || result.answer.length > 16_000 || result.foundInformation !== true || !Array.isArray(result.sources)) return { answer: NOT_FOUND, sources: [], foundInformation: false, conflictDetected: false };
  const sources = result.sources.slice(0, 12).flatMap((source: unknown) => {
    const s = source as {memoryId?: unknown; snippet?: unknown} | null;
    const memory = memories.find(m => m.id === s?.memoryId);
    if (!memory || typeof s?.snippet !== 'string' || s.snippet.trim().length < 5 || s.snippet.length > 1500 || !memory.content?.includes(s.snippet)) return [];
    return [{id: memory.id, memoryId: memory.id, title: memory.title, fileName: memory.original_file_name || memory.title, citation: memory.original_file_name || memory.title, type: memory.type, snippet:s.snippet}];
  });
  if (!sources.length || sources.length !== result.sources.length) return {answer:NOT_FOUND,sources:[],foundInformation:false,conflictDetected:false};
  return {answer:result.answer, sources, foundInformation:true, conflictDetected:result.conflictDetected === true && sources.length > 1};
}
export function chunks(content: string): string[] {
  const result: string[]=[];
  for(let i=0;i<content.length;i+=2600) result.push(content.slice(i,i+3000));
  return result;
}
