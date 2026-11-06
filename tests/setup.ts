// Node has Blob/File but not the browser FileReader API.
class Reader {
 result:string|null=null;error:Error|null=null;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
 readAsDataURL(blob:Blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;this.onload?.();}).catch(error=>{this.error=error;this.onerror?.();});}
}
Object.defineProperty(globalThis,'FileReader',{value:Reader,configurable:true});
