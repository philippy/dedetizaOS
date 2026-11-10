/* Dedetizadora Impacto — animações aprovadas, sem dependências. */
'use strict';
const poly=(c,p,color)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill()};
      const ellipse=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill()};
      function box(c,x,y,w,d,h,front,side,top){poly(c,[[x,y-h],[x+d,y-h-d*.48],[x+w+d,y-h-d*.48],[x+w,y-h]],top);poly(c,[[x+w,y-h],[x+w+d,y-h-d*.48],[x+w+d,y-d*.48],[x+w,y]],side);poly(c,[[x,y-h],[x+w,y-h],[x+w,y],[x,y]],front)}
      function tree(c,x,y,s=1){ellipse(c,x+4,y+1,12*s,3,'#edf2f4');c.fillStyle='#a7b6b3';c.fillRect(x-1,y-14*s,3,14*s);ellipse(c,x,y-21*s,9*s,13*s,'#cfe4dd');ellipse(c,x-3,y-23*s,6*s,10*s,'#e1eee8')}
      function building(c,x,y,w,h,type){
        ellipse(c,x+w*.6+6,y+2,w*.72,4,'#edf0f5');
        box(c,x,y,w,12,h,'#f0f3f8','#dce3ed','#fafbfe');
        box(c,x-2,y-h+4,w+4,12,4,'#d7e0ee','#c4cfdf','#e8edf5');
        c.fillStyle='#c3d6ec';c.fillRect(x+5,y-19,10,14);c.fillStyle='#9fbada';c.fillRect(x+w-14,y-20,9,20);
        c.fillStyle=type===1?'#91bac4':type===2?'#90a9e5':'#aab8d5';c.fillRect(x+3,y-26,w-6,6);
        if(type===1){c.fillStyle='#fff';c.fillRect(x+w/2-1,y-h+9,3,10);c.fillRect(x+w/2-4.5,y-h+12.5,10,3)}
        else{c.fillStyle='#c3d1e2';c.fillRect(x+7,y-h+11,w-14,4)}
      }
      function street(c,w,t){
        c.clearRect(0,0,w,100);c.fillStyle='#fff';c.fillRect(0,0,w,100);
        poly(c,[[0,73],[w,73],[w,96],[0,96]],'#f4f6fa');
        poly(c,[[0,69],[w,69],[w,74],[0,74]],'#e8edf4');
        c.strokeStyle='#d9e2ed';c.lineWidth=1;c.setLineDash([10,13]);c.beginPath();c.moveTo(0,86);c.lineTo(w,86);c.stroke();c.setLineDash([]);
        const points=[w*.16,w*.48,w*.79];
        building(c,points[0]-19,65,37,34,0);building(c,points[1]-19,65,36,47,1);building(c,points[2]-22,65,42,37,2);
        tree(c,w*.035,65,.8);tree(c,w*.34,65,.8);tree(c,w*.69,65,.9);tree(c,w*.95,65,.75);
        const keys=[[0,-65],[.17,points[0]-22],[.27,points[0]-22],[.43,points[1]-22],[.53,points[1]-22],[.69,points[2]-22],[.79,points[2]-22],[1,w+12]];
        const u=(t%16000)/16000;let i=0;while(i<keys.length-2&&u>keys[i+1][0])i++;
        let p=(u-keys[i][0])/(keys[i+1][0]-keys[i][0]);p=p*p*(3-2*p);
        const x=keys[i][1]+(keys[i+1][1]-keys[i][1])*p,y=88;
        ellipse(c,x+26,y+2,28,4,'#dce4ef');
        box(c,x,y-3,31,9,19,'#3267e7','#1f49b6','#8fb2ff');
        poly(c,[[x+31,y-21],[x+41,y-21],[x+49,y-10],[x+49,y-3],[x+31,y-3]],'#4b7aec');
        poly(c,[[x+31,y-21],[x+40,y-25],[x+47,y-25],[x+41,y-21]],'#a2bdff');
        poly(c,[[x+41,y-21],[x+47,y-25],[x+55,y-14],[x+49,y-10]],'#bdd9f1');
        poly(c,[[x+49,y-10],[x+55,y-14],[x+55,y-7],[x+49,y-3]],'#2454c7');
        poly(c,[[x+34,y-19],[x+40,y-19],[x+45,y-12],[x+34,y-12]],'#d8ecff');
        ellipse(c,x+9,y-2,5,5,'#263b59');ellipse(c,x+9,y-2,2.1,2.1,'#cbd7e7');ellipse(c,x+40,y-2,5,5,'#263b59');ellipse(c,x+40,y-2,2.1,2.1,'#cbd7e7');
        c.fillStyle='#f0f6ff';c.fillRect(x+8,y-17,14,3);c.fillStyle='#a5c4ff';c.fillRect(x+8,y-12,9,2);
        c.fillStyle='#f6df9a';c.fillRect(x+47,y-9,3,3);
        const grad=c.createLinearGradient(0,0,w,0);grad.addColorStop(0,'#fff');grad.addColorStop(.04,'#ffffff00');grad.addColorStop(.96,'#ffffff00');grad.addColorStop(1,'#fff');c.fillStyle=grad;c.fillRect(0,0,w,100);
      }
      const clamp=v=>Math.max(0,Math.min(1,v));
      const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
      function hand(c,x,y,grip,alpha){
        c.save();c.globalAlpha=alpha;c.translate(x,y);
        ellipse(c,12,12,45,5,'#edf0f5');
        poly(c,[[28,0],[55,8],[48,22],[23,13]],'#3267e7');
        poly(c,[[28,0],[34,-4],[61,4],[55,8]],'#8fb2ff');
        poly(c,[[55,8],[61,4],[54,18],[48,22]],'#214ebd');
        poly(c,[[22,-2],[31,1],[26,14],[18,11]],'#f0f5ff');
        c.beginPath();c.moveTo(24,0);c.bezierCurveTo(15,-1,10,-9,1,-10);
        c.bezierCurveTo(-8,-11,-18,-9,-30,-13);c.bezierCurveTo(-36,-15,-38,-10,-33,-7);
        c.lineTo(-16,4);c.bezierCurveTo(-6,11,5,14,15,10);c.lineTo(23,10);c.closePath();c.fillStyle='#e9bea2';c.fill();
        c.beginPath();c.moveTo(-33,-9);c.bezierCurveTo(-19,-4,-11,6,1,7);c.bezierCurveTo(10,9,13,5,20,6);c.lineTo(22,10);c.bezierCurveTo(8,17,-4,12,-16,4);c.closePath();c.fillStyle='#d7a58b';c.fill();
        c.strokeStyle='#ce9b81';c.lineWidth=.8;c.lineCap='round';
        [-23,-16,-9].forEach((v,i)=>{c.beginPath();c.moveTo(v,-6+i*2);c.lineTo(v+7,-2+i*2);c.stroke()});
        c.restore();
      }
      function thumb(c,x,y,grip,alpha){
        c.save();c.translate(x,y);c.globalAlpha=alpha;
        c.beginPath();c.moveTo(13,2);c.bezierCurveTo(8,-1,3,-7,-4,-8-grip*3);
        c.bezierCurveTo(-10,-11-grip*3,-13,-6-grip*3,-8,-3);c.lineTo(4,6);c.bezierCurveTo(9,9,13,7,16,5);c.closePath();c.fillStyle='#f2cdb1';c.fill();
        c.beginPath();c.moveTo(-6,-7-grip*2);c.lineTo(-2,-5-grip*2);c.strokeStyle='#fce5d4';c.lineWidth=2;c.lineCap='round';c.stroke();c.restore();
      }
      function paidCheck(c,x,y,scale,alpha){
        c.save();c.translate(x,y);c.scale(scale,scale);c.globalAlpha=alpha;
        const face=[[-22,-1],[-14,-7],[-4,3],[17,-22],[25,-16],[-3,17]];
        const dx=6,dy=4;
        poly(c,face.map(([a,b])=>[a+dx,b+dy]),'#168264');
        for(let i=0;i<face.length;i++){let a=face[i],b=face[(i+1)%face.length];poly(c,[a,b,[b[0]+dx,b[1]+dy],[a[0]+dx,a[1]+dy]],i<3?'#8ed9bb':'#229778')}
        poly(c,face,'#53bc96');
        c.strokeStyle='#a9e4cc';c.lineWidth=1;c.beginPath();c.moveTo(-20,-1);c.lineTo(-14,-5);c.lineTo(-4,5);c.lineTo(17,-20);c.stroke();c.restore();
      }
      function payment(c,w,t){
        c.clearRect(0,0,w,100);c.fillStyle='#fff';c.fillRect(0,0,w,100);
        const u=(t%9600)/9600, mid=w*.5-14;
        const arrive=ease(u/.25), depart=ease((u-.69)/.24);
        const grip=ease((u-.22)/.07)*(1-ease((u-.65)/.07));
        const showHand=ease((u-.11)/.12)*(1-ease((u-.72)/.13));
        const hx=mid+13+(1-showHand)*23,hy=77+(1-showHand)*14;
        const x=-48+(mid+48)*arrive+(w-mid+65)*depart;
        const y=47-(1-arrive)*10-19*depart+Math.sin(u*32)*(1-arrive)*4;
        const angle=-.15*(1-arrive)-.19*depart;
        const opacity=ease(u/.055)*(1-ease((u-.76)/.17));
        const sign=clamp((u-.35)/.12);
        const checkIn=clamp((u-.49)/.075), checkOut=1-ease((u-.71)/.10);
        const checkScale=checkIn<1?1-Math.pow(1-checkIn,3)+Math.sin(checkIn*Math.PI)*.13:1;
        hand(c,hx,hy,grip,showHand);
        c.save();c.globalAlpha=opacity*.7;ellipse(c,x+8,88,26*(1-.3*depart),3,'#e8edf5');c.restore();
        c.save();c.translate(x,y);c.rotate(angle);c.transform(1,-.15,.20,.94,0,0);c.globalAlpha=opacity;
        const paper=[[-22,-28],[13,-28],[23,-18],[23,29],[-22,29]];
        poly(c,paper.map(([a,b])=>[a+3,b+3]),'#ccd8e8');poly(c,paper,'#f4f7fc');
        c.strokeStyle='#dce5f1';c.lineWidth=.8;c.beginPath();paper.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.stroke();
        poly(c,[[13,-28],[13,-18],[23,-18]],'#c3d3eb');
        c.fillStyle='#7e9dca';c.fillRect(-14,-20,14,4);c.fillStyle='#c5d3e6';c.fillRect(-14,-10,28,2);c.fillRect(-14,-5,22,2);c.fillRect(-14,0,26,2);
        c.fillStyle='#98acc8';let bx=-14;[1,2,1,3,1,1,2,1,2].forEach((bw,i)=>{c.fillRect(bx,18,bw,6);bx+=bw+(i%2?1:2)});
        let px=-9,py=8;
        if(sign>0){c.strokeStyle='#299c77';c.lineWidth=2.3;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(-9,8);
          if(sign<.33){px=-9+5*sign/.33;py=8+5*sign/.33;c.lineTo(px,py)}
          else{c.lineTo(-4,13);const p=(sign-.33)/.67;px=-4+14*p;py=13-12*p;c.lineTo(px,py)}c.stroke()}
        if(u>.32&&u<.49){
          const pa=ease((u-.32)/.025)*(1-ease((u-.47)/.02));c.save();c.globalAlpha*=pa;c.translate(px,py);
          poly(c,[[0,0],[5,-2],[20,-26],[16,-29]],'#3267e7');poly(c,[[16,-29],[20,-26],[22,-29],[18,-32]],'#a6c4fa');poly(c,[[0,0],[1,-5],[5,-2]],'#a6b6ca');
          c.restore();
        }
        c.restore();
        thumb(c,hx,hy,grip,showHand*grip);
        if(checkIn>0&&checkOut>0){
          const cx=mid+50,cy=38-4*ease(checkIn);
          c.save();c.globalAlpha=checkIn*checkOut*.6;ellipse(c,cx+3,82,20,3,'#dceee6');c.restore();
          paidCheck(c,cx,cy,checkScale,checkIn*checkOut);
          if(checkIn<1){c.save();c.globalAlpha=Math.sin(checkIn*Math.PI)*.55;[[32,-19],[-30,-22],[29,18]].forEach(([a,b])=>{ellipse(c,cx+a*(.8+checkIn*.3),cy+b,1.4,1.4,'#8dd5b7')});c.restore()}
        }
      }
      

  function mount(canvas,type){
    if(!(canvas instanceof HTMLCanvasElement))throw new TypeError('Use um elemento canvas.');
    if(!['street','payment'].includes(type))throw new TypeError('Use street ou payment.');
    const c=canvas.getContext('2d');if(!c)throw new Error('Canvas 2D indisponível.');
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    let width=0,elapsed=2400,last=0,raf=0,visible=true,paused=false,dead=false;
    const render=()=>{if(width)(type==='street'?street:payment)(c,width,elapsed)};
    const active=()=>!dead&&!paused&&!reduce.matches&&visible&&!document.hidden;
    function tick(now){raf=0;if(!active())return;if(last)elapsed+=Math.min(now-last,50);last=now;render();raf=requestAnimationFrame(tick)}
    function sync(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(active())raf=requestAnimationFrame(tick);else render()}
    function resize(){width=canvas.getBoundingClientRect().width;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*d);canvas.height=100*d;c.setTransform(d,0,0,d,0,0);render()}
    canvas.style.display='block';canvas.style.width='100%';canvas.style.height='100px';canvas.style.background='#fff';
    canvas.setAttribute('aria-hidden','true');
    const ro=new ResizeObserver(resize);ro.observe(canvas);
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()});io.observe(canvas);
    reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);resize();sync();
    return {pause(){paused=true;sync()},play(){paused=false;sync()},destroy(){dead=true;if(raf)cancelAnimationFrame(raf);ro.disconnect();io.disconnect();reduce.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync)}};
  }
  export { mount as mountImpactoAnimation };
