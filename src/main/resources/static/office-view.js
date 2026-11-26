// Room dimensions are in metres. North is the window wall on the floor plan.
(() => {
    const dialog = document.querySelector('#office-view');
    const canvas = dialog.querySelector('canvas');
    const seatButton = document.querySelector('#office-seat');
    const ctx = canvas.getContext('2d');
    const layouts = {
        'Атлас': {table: 2.7, plant: -3.1, accent: '#a96349'},
        'Меридиан': {table: 2.16, plant: -3.1, accent: '#54776e'},
        'Горизонт': {table: 3.24, plant: 3.1, accent: '#5d728b'}
    };
    let surfaces = [], eye, yaw, pitch, seated, currentRoom, frame, drag;
    const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
    function face(points, color, layer = 1) { surfaces.push({points, color, layer}); }
    function shade(color, factor) {
        const rgb = parseInt(color.slice(1), 16);
        return 'rgb(' + [16, 8, 0].map(shift => Math.round(((rgb >> shift) & 255) * factor)).join(',') + ')';
    }
    function box(x, y, z, w, h, d, color, layer = 1) {
        const l=x-w/2, r=x+w/2, n=z-d/2, f=z+d/2, t=y+h;
        face([[l,t,n],[r,t,n],[r,t,f],[l,t,f]],color,layer);
        face([[l,y,n],[r,y,n],[r,t,n],[l,t,n]],shade(color,.82),layer);
        face([[l,y,f],[r,y,f],[r,t,f],[l,t,f]],shade(color,.94),layer);
        face([[l,y,n],[l,y,f],[l,t,f],[l,t,n]],shade(color,.76),layer);
        face([[r,y,n],[r,y,f],[r,t,f],[r,t,n]],shade(color,.88),layer);
        face([[l,y,n],[r,y,n],[r,y,f],[l,y,f]],shade(color,.7),layer);
    }
    function buildRoom({table,plant,accent}) {
        surfaces = [];
        const north = (x,y,w,h,color,layer=0) => face([[x,y,-2],[x+w,y,-2],[x+w,y+h,-2],[x,y+h,-2]],color,layer);
        face([[-3.7,3,-2],[3.7,3,-2],[3.7,3,2],[-3.7,3,2]],'#f3ece1',-8);
        for(let i=0;i<20;i++) {
            const z=-2+i*.2;
            for(let x=-3.7-(i%2)*.8;x<3.7;x+=1.6) {
                const left=Math.max(x,-3.7),right=Math.min(x+1.597,3.7);
                face([[left,0,z],[right,0,z],[right,0,z+.198],[left,0,z+.198]],['#bfab94','#c8b69e','#cfbba2'][Math.abs(i+Math.round(x))%3],-7);
            }
        }
        north(-3.7,0,7.4,3,'#e6dfd2',-7);
        north(-1.68,.83,3.36,1.78,'#465663',-6);
        north(-1.62,.89,3.24,1.66,'#c4dce1',-5);
        for(let i=0;i<18;i++) {
            const height=.12+Math.sin(i*7)**2*.44;
            north(-1.62+i*.18,.89,.18,height,'#97adb3',-4);
        }
        for(const x of [-1.63,0,1.6]) north(x,.88,.035,1.69,'#54626a',-3);
        for(const side of [-1,1]) face([[side*3.7,0,-2],[side*3.7,3,-2],[side*3.7,3,2],[side*3.7,0,2]],side<0?'#d4ccbd':'#c9c3b6',-2);
        face([[-3.7,0,2],[3.7,0,2],[3.7,3,2],[-3.7,3,2]],'#dbd3c7',-2);
        box(2.85,0,1.97,.93,2.25,.04,'#9a826d');
        box(2.85,.23,1.93,.72,1.83,.03,'#adc2c4');
        box(2.52,.94,1.89,.12,.035,.035,'#49535c');
        // Display and timber acoustic slats on the west wall.
        for(let i=0;i<23;i++) box(-3.64,.32,-1.56+i*.13,.08,2.36,.09,'#b59b81');
        box(-3.54,1.05,-.22,.08,.87,1.54,'#303d46');
        box(-3.48,1.1,-.22,.025,.77,1.43,'#475b68');
        for(const x of [-table*.29,table*.29]) {
            box(x,0,-.49,.1,.73,.62,'#555960');
            for(const side of [-1,1]) {
                const z=-.49+side*.76;
                box(x,0,z,.055,.44,.055,'#58616a');
                box(x,.045,z,.48,.045,.07,'#58616a');
                box(x,.045,z,.07,.045,.46,'#58616a');
                box(x,.42,z,.49,.1,.47,accent);
                box(x,.49,z+side*.19,.49,.39,.09,accent);
            }
        }
        box(0,.72,-.49,table,.075,1.02,'#d4af84');
        box(0,.8,-.49,.4,.025,.12,'#515a60');
        for(const x of [-1.32,1.32]) box(x,2.92,-.35,1.45,.04,.12,'#fff7dd');
        box(plant,0,-1.45,.41,.43,.41,'#ae9279');
        for(let i=0;i<20;i++) {
            const angle=i*2.4, x=Math.cos(angle)*.31,z=Math.sin(angle)*.31,h=.9+(i%5)*.1;
            face([[plant,.4,-1.45],[plant+x-z*.27,h-.24,-1.45+z+x*.27],[plant+x,h,-1.45+z],[plant+x+z*.27,h-.24,-1.45+z-x*.27]],i%2?'#657c58':'#788b65');
        }
    }
    // Clip at the camera plane before perspective division, including when looking straight up a wall.
    function draw() {
        frame = 0;
        if (!dialog.open) return;
        const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,2);
        if (!w || !h) return;
        if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)) {
            canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
        }
        ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.fillStyle='#ae9e89'; ctx.fillRect(0,0,w,h);
        const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
        const focal=Math.min(h*.91,w*.95), visible=[];
        for(const surface of surfaces) {
            const vertices=surface.points.map(([x,y,z])=>{
                const dx=x-eye[0],dy=y-eye[1],dz=z-eye[2],forward=dx*sy-dz*cy;
                return [dx*cy+dz*sy,dy*cp-forward*sp,forward*cp+dy*sp];
            });
            const poly=[];
            for(let i=0;i<vertices.length;i++){
                const a=vertices[i],b=vertices[(i+1)%vertices.length];
                if(a[2]>=.04) poly.push(a);
                if((a[2]>=.04)!==(b[2]>=.04)){
                    const t=(.04-a[2])/(b[2]-a[2]);
                    poly.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),.04]);
                }
            }
            if(poly.length>=3) visible.push({surface,poly,depth:vertices.reduce((s,v)=>s+v[2],0)/vertices.length});
        }
        visible.sort((a,b)=>a.surface.layer-b.surface.layer || b.depth-a.depth);
        for(const {surface,poly} of visible){
            ctx.beginPath();
            poly.forEach(([x,y,z],i)=>ctx[i?'lineTo':'moveTo'](w/2+focal*x/z,h/2-focal*y/z));
            ctx.closePath(); ctx.fillStyle=surface.color;ctx.fill();
        }
    }
    function redraw(){ if(!frame) frame=requestAnimationFrame(draw); }
    function viewpoint(atSeat){
        seated=atSeat;
        eye=seated?[layouts[currentRoom].table*.29,1.18,.29]:[2.48,1.58,1.54];
        yaw=seated?-.17:-.86; pitch=seated?-.14:-.22;
        seatButton.textContent=seated?'Вид от входа':'Вид с места';
        redraw();
    }
    function openRoom(name){
        if(!layouts[name] || dialog.open) return;
        currentRoom=name; buildRoom(layouts[name]);
        document.querySelector('#office-name').textContent=name+' · 3D';
        dialog.showModal(); viewpoint(false); canvas.focus({preventScroll:true});
    }
    document.querySelector('#view-office').onclick=()=>openRoom(selectedName);
    let lastTap=null;
    for(const room of roomButtons){
        room.addEventListener('dblclick',()=>openRoom(room.dataset.room));
        room.addEventListener('click',event=>{
            if(event.pointerType==='mouse' || !event.detail) return;
            const now=performance.now();
            if(lastTap?.room===room && now-lastTap.time<420 && Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<28) openRoom(room.dataset.room);
            lastTap={room,time:now,x:event.clientX,y:event.clientY};
        });
    }
    canvas.onpointerdown=e=>{if(!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
    canvas.onpointermove=e=>{
        if(drag?.id!==e.pointerId)return;
        yaw-=(e.clientX-drag.x)*.006; pitch=clamp(pitch+(e.clientY-drag.y)*.006,-1.32,1.32);
        drag.x=e.clientX;drag.y=e.clientY;redraw();
    };
    canvas.onlostpointercapture=()=>{drag=null;};
    canvas.onkeydown=e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
        e.preventDefault(); yaw+=(e.key==='ArrowRight')*.1-(e.key==='ArrowLeft')*.1;
        pitch=clamp(pitch+(e.key==='ArrowUp')*.1-(e.key==='ArrowDown')*.1,-1.32,1.32); redraw();
    };
    seatButton.onclick=()=>viewpoint(!seated);
    document.querySelector('#exit-office').onclick=()=>dialog.close();
    dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
    dialog.onclose=()=>{drag=null;lastTap=null;};
    new ResizeObserver(redraw).observe(canvas);
})();
