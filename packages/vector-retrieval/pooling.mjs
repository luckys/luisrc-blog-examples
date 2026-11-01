export function maskedMeanPool(hidden, mask) {
  const [batch, tokens, dimensions] = hidden.dims;
  if (hidden.dims.length !== 3 || mask.dims.length !== 2 || mask.dims[0] !== batch || mask.dims[1] !== tokens || hidden.data.length !== batch*tokens*dimensions || mask.data.length !== batch*tokens) throw Error('Tensor shape mismatch');
  return Array.from({length:batch},(_,b)=>{
    const vector=Array(dimensions).fill(0);let count=0;
    for(let t=0;t<tokens;t++) {
      const active=Number(mask.data[b*tokens+t]);
      if(active!==0&&active!==1)throw Error('Binary attention mask required');
      if(!active)continue;
      count++;
      for(let d=0;d<dimensions;d++) {
        const value=hidden.data[(b*tokens+t)*dimensions+d];
        if(!Number.isFinite(value))throw Error('Nonfinite hidden state');
        vector[d]+=value;
      }
    }
    if(!count)throw Error('Empty unmasked sequence');
    return Array.from(Float32Array.from(vector,value=>value/count));
  });
}
