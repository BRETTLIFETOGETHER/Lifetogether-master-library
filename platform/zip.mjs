// Small ZIP writer (stored entries). PDFs already compress their streams.
export function zipFiles(files){const encoder=new TextEncoder(),local=[],central=[];let offset=0;
 const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0};
 for(const {name,bytes} of files){const label=encoder.encode(name),sum=crc(bytes),header=new Uint8Array(30+label.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,label.length,true);header.set(label,30);local.push(header,bytes);
 const directory=new Uint8Array(46+label.length),d=new DataView(directory.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,sum,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,label.length,true);d.setUint32(42,offset,true);directory.set(label,46);central.push(directory);offset+=header.length+bytes.length;
 }
 const size=central.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);const out=new Uint8Array(offset+size+22);let pos=0;for(const a of [...local,...central,end]){out.set(a,pos);pos+=a.length}return out;
}
