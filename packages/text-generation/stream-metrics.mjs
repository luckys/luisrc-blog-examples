export function summarize(arrivals,doneMs) {
 if(!arrivals.length || !Number.isFinite(doneMs) || arrivals.some((t,i)=>!Number.isFinite(t)||t<0||(i>0&&t<arrivals[i-1])) || doneMs<arrivals.at(-1))throw Error('Invalid monotonic timing');
 return {tokens:arrivals.length,ttftMs:arrivals[0],totalMs:doneMs,meanInterTokenMs:arrivals.length>1?(arrivals.at(-1)-arrivals[0])/(arrivals.length-1):null};
}
export function median(values){if(!values.length||values.some(x=>!Number.isFinite(x)))throw Error('Finite samples required');const x=values.toSorted((a,b)=>a-b),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2;}
