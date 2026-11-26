// Room dimensions are in metres. North is the window wall on the floor plan.
(() => {
    const dialog = document.querySelector('#office-view');
    const canvas = dialog.querySelector('canvas');
    const seatButton = document.querySelector('#office-seat');
    const hint = dialog.querySelector('footer span');
    let office, loading;
    const layouts = {
        'Атлас': {table: 2.7, plant: -3.1, accent: '#a96349'},
        'Меридиан': {table: 2.16, plant: -3.1, accent: '#54776e'},
        'Горизонт': {table: 3.24, plant: 3.1, accent: '#5d728b'}
    };
    let eye, yaw, pitch, seated, currentRoom, frame, drag;
    const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
    function draw() {
        frame = 0;
        if (office && eye && dialog.open) office.render(eye,yaw,pitch);
    }
    function redraw(){ if(!frame) frame=requestAnimationFrame(draw); }
    function viewpoint(atSeat){
        seated=atSeat;
        eye=seated?[layouts[currentRoom].table*.29,1.18,.29]:[2.48,1.58,1.54];
        yaw=seated?-.17:-.86; pitch=seated?-.14:-.22;
        seatButton.textContent=seated?'Вид от входа':'Вид с места';
        redraw();
    }
    async function openRoom(name){
        if(!layouts[name] || dialog.open) return;
        currentRoom=name;
        document.querySelector('#office-name').textContent=name+' · 3D';
        hint.textContent='Загружаем переговорную…';
        seatButton.disabled = true;
        dialog.showModal();
        try {
            loading ??= import('./office-scene.js?v=2').then(module => module.createOffice(canvas));
            office = await loading;
            if(!dialog.open || name!==currentRoom) return;
            office.configure(layouts[name]);
            viewpoint(false);
            seatButton.disabled=false;
            hint.textContent='Потяни, чтобы осмотреться';
            canvas.focus({preventScroll:true});
        } catch {
            loading=null;
            hint.textContent='Для обзора нужен браузер с поддержкой WebGL 2.';
        }
    }
    document.querySelector('#view-office').onclick=()=>openRoom(selectedName);
    let lastTap=null;
    const map=document.querySelector('.map-scroll');
    let start=null;
    map.addEventListener('touchstart', event=>{
        const room=event.target.closest('[data-room]:enabled');
        if(event.touches.length!==1 || !room){start=null;lastTap=null;return;}
        const finger=event.touches[0];
        start={room,x:finger.clientX,y:finger.clientY,time:performance.now()};
    }, {passive:true});
    map.addEventListener('touchmove',event=>{
        const finger=event.touches[0];
        if(start && (event.touches.length!==1 || Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>18)){
            start=null;lastTap=null;
        }
    },{passive:true});
    map.addEventListener('touchcancel',()=>{start=null;lastTap=null;});
    map.addEventListener('touchend',event=>{
        if(!start || event.touches.length) return;
        const tap=start;
        start=null;
        const now=performance.now();
        if(now-tap.time>420){lastTap=null;return;}
        if(lastTap?.room===tap.room && now-lastTap.time<520 && Math.hypot(tap.x-lastTap.x,tap.y-lastTap.y)<34){
            event.preventDefault();
            lastTap=null;
            openRoom(tap.room.dataset.room);
        } else lastTap={...tap,time:now};
    },{passive:false});
    for(const room of roomButtons){
        room.addEventListener('dblclick',()=>openRoom(room.dataset.room));
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
