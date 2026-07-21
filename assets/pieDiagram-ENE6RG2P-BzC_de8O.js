import{p as nt}from"./chunk-JWPE2WC7-CxKRxees.js";import{a9 as T,a1 as G,b6 as rt,y as it,n as ot,o as st,s as lt,g as ct,c as ut,b as dt,_ as g,l as B,p as gt,d as pt,z as ht,D as ft,M as mt,k as vt}from"./index-BGrutUb-.js";import{p as xt}from"./cynefin-VYW2F7L2-Daz2lU9r.js";import{d as q}from"./arc-CzFIb4N3.js";import{o as yt}from"./ordinal-Cboi1Yqb.js";import"./init-Gi6I4Gst.js";function St(t,r){return r<t?-1:r>t?1:r>=t?0:NaN}function wt(t){return t}function At(){var t=wt,r=St,S=null,b=T(0),l=T(G),p=T(0);function i(e){var n,s=(e=rt(e)).length,h,w,$=0,f=new Array(s),o=new Array(s),D=+b.apply(this,arguments),M=Math.min(G,Math.max(-G,l.apply(this,arguments)-D)),k,L=Math.min(Math.abs(M)/s,p.apply(this,arguments)),u=L*(M<0?-1:1),A;for(n=0;n<s;++n)(A=o[f[n]=n]=+t(e[n],n,e))>0&&($+=A);for(r!=null?f.sort(function(E,m){return r(o[E],o[m])}):S!=null&&f.sort(function(E,m){return S(e[E],e[m])}),n=0,w=$?(M-s*u)/$:0;n<s;++n,D=k)h=f[n],A=o[h],k=D+(A>0?A*w:0)+u,o[h]={data:e[h],index:n,value:A,startAngle:D,endAngle:k,padAngle:L};return o}return i.value=function(e){return arguments.length?(t=typeof e=="function"?e:T(+e),i):t},i.sortValues=function(e){return arguments.length?(r=e,S=null,i):r},i.sort=function(e){return arguments.length?(S=e,r=null,i):S},i.startAngle=function(e){return arguments.length?(b=typeof e=="function"?e:T(+e),i):b},i.endAngle=function(e){return arguments.length?(l=typeof e=="function"?e:T(+e),i):l},i.padAngle=function(e){return arguments.length?(p=typeof e=="function"?e:T(+e),i):p},i}var J=it.pie,I={sections:new Map,showData:!1,config:J},F=I.sections,V=I.showData,Ct=structuredClone(J),$t=g(()=>structuredClone(Ct),"getConfig"),Dt=g(()=>{F=new Map,V=I.showData,gt()},"clear"),Tt=g(({label:t,value:r})=>{if(r<0)throw new Error(`"${t}" has invalid value: ${r}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);F.has(t)||(F.set(t,r),B.debug(`added new section: ${t}, with value: ${r}`))},"addSection"),bt=g(()=>F,"getSections"),kt=g(t=>{V=t},"setShowData"),zt=g(()=>V,"getShowData"),K={getConfig:$t,clear:Dt,setDiagramTitle:ot,getDiagramTitle:st,setAccTitle:lt,getAccTitle:ct,setAccDescription:ut,getAccDescription:dt,addSection:Tt,getSections:bt,setShowData:kt,getShowData:zt},Mt=g((t,r)=>{nt(t,r),r.setShowData(t.showData),t.sections.map(r.addSection)},"populateDb"),Et={parse:g(async t=>{const r=await xt("pie",t);B.debug(r),Mt(r,K)},"parse")},Rt=g(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieCircle.highlighted{
    scale: 1.05;
    opacity: 1;
  }
  .pieCircle.highlightedOnHover:hover{
    transition-duration: 250ms;
    scale: 1.05;
    opacity: 1;
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),Lt=Rt,Wt=g(t=>{const r=[...t.values()].reduce((l,p)=>l+p,0),S=[...t.entries()].map(([l,p])=>({label:l,value:p})).filter(l=>l.value/r*100>=1);return At().value(l=>l.value).sort(null)(S)},"createPieArcs"),_t=g((t,r,S,b)=>{B.debug(`rendering pie chart
`+t);const l=b.db,p=pt(),i=ht(l.getConfig(),p.pie),e=40,n=18,s=4,h=450,w=h,$=ft(r),f=$.append("g");f.attr("transform","translate("+w/2+","+h/2+")");const{themeVariables:o}=p;let[D]=mt(o.pieOuterStrokeWidth);D??=2;const M=i.legendPosition,k=i.textPosition,L=i.donutHole>0&&i.donutHole<=.9?i.donutHole:0,u=Math.min(w,h)/2-e,A=q().innerRadius(L*u).outerRadius(u),E=q().innerRadius(u*k).outerRadius(u*k),m=f.append("g");m.append("circle").attr("cx",0).attr("cy",0).attr("r",u+D/2).attr("class","pieOuterCircle");const W=l.getSections(),Q=Wt(W),Y=[o.pie1,o.pie2,o.pie3,o.pie4,o.pie5,o.pie6,o.pie7,o.pie8,o.pie9,o.pie10,o.pie11,o.pie12];let H=0;W.forEach(a=>{H+=a});const U=Q.filter(a=>(a.data.value/H*100).toFixed(0)!=="0"),N=yt(Y).domain([...W.keys()]);m.selectAll("mySlices").data(U).enter().append("path").attr("d",A).attr("fill",a=>N(a.data.label)).attr("class",a=>{let c="pieCircle";return i.highlightSlice==="hover"?c+=" highlightedOnHover":i.highlightSlice===a.data.label&&(c+=" highlighted"),c}),m.selectAll("mySlices").data(U).enter().append("text").text(a=>(a.data.value/H*100).toFixed(0)+"%").attr("transform",a=>"translate("+E.centroid(a)+")").style("text-anchor","middle").attr("class","slice");const tt=f.append("text").text(l.getDiagramTitle()).attr("x",0).attr("y",-(h-50)/2).attr("class","pieTitleText"),R=[...W.entries()].map(([a,c])=>({label:a,value:c})),C=f.selectAll(".legend").data(R).enter().append("g").attr("class","legend");C.append("rect").attr("width",n).attr("height",n).style("fill",a=>N(a.label)).style("stroke",a=>N(a.label)),C.append("text").attr("x",n+s).attr("y",n-s).text(a=>l.getShowData()?`${a.label} [${a.value}]`:a.label);const z=Math.max(...C.selectAll("text").nodes().map(a=>a?.getBoundingClientRect().width??0));let _=h,O=w+e;const d=n+s,P=R.length*d;switch(M){case"center":C.attr("transform",(a,c)=>{const v=d*R.length/2,x=-z/2-(n+s),y=c*d-v;return"translate("+x+","+y+")"});break;case"top":_+=P,C.attr("transform",(a,c)=>{const v=u,x=-z/2-(n+s),y=c*d-v;return`translate(${x}, ${y})`}),m.attr("transform",()=>`translate(0, ${P+d})`);break;case"bottom":_+=P,C.attr("transform",(a,c)=>{const v=-u-d,x=-z/2-(n+s),y=c*d-v;return"translate("+x+","+y+")"});break;case"left":O+=n+s+z,C.attr("transform",(a,c)=>{const v=d*R.length/2,x=-u-(n+s),y=c*d-v;return"translate("+x+","+y+")"}),m.attr("transform",()=>`translate(${z+n+s}, 0)`);break;case"right":default:O+=n+s+z,C.attr("transform",(a,c)=>{const v=d*R.length/2,x=12*n,y=c*d-v;return"translate("+x+","+y+")"});break}const j=tt.node()?.getBoundingClientRect().width??0,et=w/2-j/2,at=w/2+j/2,X=Math.min(0,et),Z=Math.max(O,at)-X;$.attr("viewBox",`${X} 0 ${Z} ${_}`),vt($,_,Z,i.useMaxWidth)},"draw"),Ft={draw:_t},Vt={parser:Et,db:K,renderer:Ft,styles:Lt};export{Vt as diagram};
