import {describe,it,expect} from 'vitest';
import {verifiedAnswer,dueDate,fileType,MAX_FILE_BYTES,validateSignature} from '../shared/contracts';
describe('trusted boundaries',()=>{
 const source={id:'memory',title:'Actual source',type:'note',content:'Payment is due on 10 December 2026.'};
 it('rejects invented quotes and positive answers without evidence',()=>{for(const sources of [[],[{memoryId:'memory',snippet:'Invented evidence'}],[{memoryId:'other',snippet:source.content}]])expect(verifiedAnswer({answer:'made up',foundInformation:true,sources},[source]).foundInformation).toBe(false);});
 it('uses trusted metadata and exact excerpts',()=>{const result=verifiedAnswer({answer:'Due 10 December.',foundInformation:true,sources:[{memoryId:'memory',title:'Forged',snippet:source.content}]},[source]);expect(result.sources[0].title).toBe('Actual source');expect(result.foundInformation).toBe(true);});
 it('rejects malformed dates and dates without timezone',()=>{for(const date of ['2026-02-30T12:00:00Z','2026-01-01T24:00:00Z','tomorrow','2026-12-01T10:00'])expect(()=>dueDate(date)).toThrow();expect(dueDate('2026-12-01T10:00:00+05:30')).toBe('2026-12-01T04:30:00.000Z');});
 it('applies the same file limit and MIME checks to every upload',()=>{expect(()=>fileType({name:'a.pdf',size:MAX_FILE_BYTES+1,type:'application/pdf'})).toThrow();expect(()=>fileType({name:'a.png',size:20,type:'text/html'})).toThrow();expect(()=>fileType({name:'a.doc',size:20})).toThrow();});
 it('rejects an executable renamed to a PDF',async()=>{await expect(validateSignature(new File(['<script>evil</script>'],'a.pdf',{type:'application/pdf'}))).rejects.toThrow();});
 it('rejects inherited object-property names as file extensions',()=>{expect(()=>fileType({name:'file.__proto__',size:10})).toThrow();expect(()=>fileType({name:'file.constructor',size:10})).toThrow();});
});
