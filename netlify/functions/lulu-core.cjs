'use strict';

const SHIPPING_LEVELS=new Set(['MAIL','PRIORITY_MAIL','GROUND_HD','GROUND_BUS','GROUND','EXPEDITED','EXPRESS']);
const CURRENCIES=new Set(['AUD','CAD','EUR','GBP','USD']);

class InputError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const integer=(value,min,max,label)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new InputError(`${label} must be between ${min} and ${max}.`);return n;};
const money=value=>{const n=Number(value);if(!Number.isFinite(n)||n<0||n>1000000)throw new InputError('Retail price is invalid.');return n.toFixed(2);};
const identifier=(value,label='Identifier')=>{const s=text(value,100);if(!/^[A-Za-z0-9._-]{1,100}$/.test(s))throw new InputError(`${label} is invalid.`);return s;};
const pod=value=>{const s=text(value,40).toUpperCase();if(!/^[A-Z0-9]{20,40}$/.test(s))throw new InputError('Add a valid Lulu pod package ID.');return s;};
const pdfUrl=(value,label)=>{let url;try{url=new URL(text(value,2000));}catch{throw new InputError(`${label} must be a complete HTTPS URL.`);}if(url.protocol!=='https:'||url.username||url.password)throw new InputError(`${label} must be a public HTTPS URL without embedded credentials.`);return url.href;};
const currency=value=>{const s=text(value,3).toUpperCase()||'USD';if(!CURRENCIES.has(s))throw new InputError('Currency is not supported by Lulu.');return s;};
const shippingLevel=value=>{const s=text(value,30).toUpperCase();if(!SHIPPING_LEVELS.has(s))throw new InputError('Choose a supported shipping level.');return s;};
function address(raw={}){
 const out={name:text(raw.name,120),organization:text(raw.organization,120),street1:text(raw.street1,160),street2:text(raw.street2,160),city:text(raw.city,100),state_code:text(raw.state_code,10).toUpperCase(),postcode:text(raw.postcode,24),country_code:text(raw.country_code,2).toUpperCase(),phone_number:text(raw.phone_number,24),email:text(raw.email,254),is_business:raw.is_business===true};
 if(!out.name&&!out.organization)throw new InputError('Add a recipient or organization name.');
 for(const [key,label] of [['street1','street address'],['city','city'],['postcode','postal code'],['country_code','country code'],['phone_number','phone number']])if(!out[key])throw new InputError(`Add the ${label}.`);
 if(!/^[A-Z]{2}$/.test(out.country_code))throw new InputError('Use a two-letter country code.');
 if(!/^\+?[\d\s\-./()]{8,20}$/.test(out.phone_number))throw new InputError('Add a valid recipient phone number.');
 if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))throw new InputError('Add a valid recipient email.');
 if(['US','CA','AU','MX'].includes(out.country_code)&&!out.state_code)throw new InputError('Add the state or province code.');
 return out;
}
function quotePayload(raw={}){
 const item=raw.line_item||{};
 return {currency:currency(raw.currency),line_items:[{page_count:integer(item.page_count,1,3000,'Page count'),pod_package_id:pod(item.pod_package_id),quantity:integer(item.quantity,1,10000,'Quantity')}],shipping_address:address(raw.shipping_address),shipping_option:shippingLevel(raw.shipping_option)};
}
function shippingPayload(raw={}){
 const item=raw.line_item||{};
 return {country:text(raw.country,2).toUpperCase(),page_count:integer(item.page_count,1,3000,'Page count'),quantity:integer(item.quantity,1,10000,'Quantity'),pod_package_id:pod(item.pod_package_id),currency:currency(raw.currency)};
}
function orderPayload(raw={},fallbackEmail=''){
 const quote=quotePayload(raw),item=raw.line_item||{},contact=text(raw.contact_email||fallbackEmail,254);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))throw new InputError('Configure or provide a valid order contact email.');
 return {contact_email:contact,external_id:identifier(raw.external_id||`LT-${Date.now()}`,'Order reference'),line_items:[{external_id:identifier(item.external_id||`BOOK-${Date.now()}`,'Line-item reference'),printable_normalization:{cover:{source_url:pdfUrl(item.cover_url,'Cover PDF')},interior:{source_url:pdfUrl(item.interior_url,'Interior PDF')},pod_package_id:pod(item.pod_package_id)},quantity:integer(item.quantity,1,10000,'Quantity'),title:text(item.title,200)||'LifeTogether print edition'}],shipping_address:quote.shipping_address,shipping_level:quote.shipping_option};
}
function safeJobId(value){return identifier(value,'Lulu print-job ID');}
function publicError(error){return error instanceof InputError?{statusCode:error.status,message:error.message}:{statusCode:500,message:'The print service could not complete this request.'};}

module.exports={InputError,SHIPPING_LEVELS,CURRENCIES,text,integer,money,identifier,pod,pdfUrl,currency,shippingLevel,address,quotePayload,shippingPayload,orderPayload,safeJobId,publicError};
