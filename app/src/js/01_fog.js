/* ===== 雾与颗粒（原样取自 Trianon v8）===== */
(()=>{const cv=document.getElementById('fog');
const gl=cv.getContext('webgl');
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;uniform vec2 uRes;uniform float uT;uniform float uD;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;mat2 r=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p;a*=0.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/uRes;vec2 p=uv;p.x*=uRes.x/uRes.y;float t=uT*0.022;
vec2 q=vec2(fbm(p*1.4+vec2(0.,t)),fbm(p*1.4+vec2(5.2,-t*0.8)));float f=fbm(p*1.8+q*1.1+vec2(t*0.5,-t*0.3));
vec3 cream=vec3(0.937,0.945,0.925);vec3 lavL=vec3(0.725,0.741,0.847);vec3 blue=vec3(0.651,0.745,0.875);vec3 silver=vec3(0.875,0.894,0.933);vec3 champ=vec3(0.918,0.851,0.651);
vec3 col=mix(cream,lavL,smoothstep(0.25,1.0,uv.y+(f-0.5)*0.42));
col=mix(col,blue,smoothstep(0.50,1.02,uv.x*0.45+uv.y*0.55+(f-0.5)*0.32)*0.62);
col=mix(col,silver,smoothstep(0.60,0.98,f)*0.20);
float beam=smoothstep(0.55,0.96,fbm(vec2((p.x+p.y)*1.5-uT*0.045,2.0)));col+=champ*beam*0.16*(1.0-uv.y*0.4);
float d=distance(uv,vec2(0.5,0.5));col*=1.0-d*0.10;
vec3 k1=vec3(0.098,0.122,0.231);vec3 k2=vec3(0.161,0.196,0.341);vec3 k3=vec3(0.212,0.267,0.435);vec3 kc=vec3(0.78,0.70,0.49);
vec3 dc=mix(k1,k2,smoothstep(0.0,1.0,uv.y+(f-0.5)*0.42));
dc=mix(dc,k3,smoothstep(0.50,1.02,uv.x*0.45+uv.y*0.55+(f-0.5)*0.32)*0.55);
dc+=vec3(0.45,0.52,0.72)*smoothstep(0.60,0.98,f)*0.06;dc+=kc*beam*0.05*(1.0-uv.y*0.4);dc*=1.0-d*0.18;
gl_FragColor=vec4(mix(col,dc,uD),1.0);}`;
if(gl){const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const l=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
const fit=()=>{cv.width=Math.max(2,innerWidth*.6|0);cv.height=Math.max(2,innerHeight*.6|0);gl.viewport(0,0,cv.width,cv.height)};fit();addEventListener('resize',fit);
const uR=gl.getUniformLocation(pr,'uRes'),uT=gl.getUniformLocation(pr,'uT'),uD=gl.getUniformLocation(pr,'uD');let dk=0;const t0=performance.now()-40000;
const rmF=matchMedia('(prefers-reduced-motion: reduce)');/* 夜间主题：body[data-theme=dark] 时雾慢慢变成深墨蓝 */
const want=()=>document.body.dataset.theme==='dark'?1:0;
const draw=n=>{gl.uniform2f(uR,cv.width,cv.height);gl.uniform1f(uT,(n-t0)/1000);gl.uniform1f(uD,dk);gl.drawArrays(gl.TRIANGLES,0,3)};
(function loop(n){const w=want();dk+=(w-dk)*(rmF.matches?1:.06);if(Math.abs(w-dk)<.002)dk=w;draw(n);if(!rmF.matches)requestAnimationFrame(loop)})(performance.now());
window.__fogRedraw=()=>{dk=want();draw(performance.now())};}
(function(){const n=document.createElement('canvas');n.width=n.height=128;const g=n.getContext('2d'),d=g.createImageData(128,128);let s=1387;
for(let i=0;i<d.data.length;i+=4){s=(s*1664525+1013904223)>>>0;const v=s>>>24;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
g.putImageData(d,0,0);document.getElementById('grain').style.backgroundImage='url('+n.toDataURL()+')'})();
})();
