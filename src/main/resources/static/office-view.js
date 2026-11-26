// Room dimensions are in metres. North is the window wall on the floor plan.
(() => {
    const dialog = document.querySelector('#office-view');
    const canvas = dialog.querySelector('canvas');
    const entryButton = document.querySelector('#office-entry');
    const markers = dialog.querySelector('.seat-markers');
    const stage = dialog.querySelector('.office-stage');
    let places = [];
    const hint = dialog.querySelector('footer span');
    let office, loading;
    const layouts = {
        'Атлас': {style: 'presentation', table: 2.7, plant: -3.1, accent: '#a96349'},
        'Меридиан': {style: 'workshop', table: 2.16, plant: -3.1, accent: '#54776e'},
        'Горизонт': {style: 'lounge', table: 3.24, plant: 3.1, accent: '#5d728b'},
        'Студия': {style: 'studio', table: 3.05, plant: 3.1, accent: '#977046'},
        'Библиотека': {style: 'library', table: 1.8, plant: -3.1, accent: '#66765e'}
    };
    let eye, yaw, pitch, seated, currentRoom, frame, drag;
    const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
    let travel = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function draw(time) {
        frame = 0;
        if (!office || !eye || !dialog.open) return;
        if (travel) {
            travel.start ??= time;
            const t = reducedMotion.matches ? 1 : clamp((time-travel.start)/travel.duration, 0, 1);
            const progress = t*t*(3-2*t);
            eye = travel.origin.map((value, i) => value + (travel.target[i]-value)*progress);
            if (travel.turn) {
                yaw = travel.initialYaw + travel.yawDelta*progress;
                pitch = travel.initialPitch + (travel.targetPitch-travel.initialPitch)*progress;
            }
            if (t === 1) travel = null;
        }
        office.render(eye,yaw,pitch);
        if (travel) {
            redraw();
            return;
        }
        markers.hidden = false;
        places.forEach((place,index) => {
            const marker = markers.children[index];
            const point = place === seated ? null : office.projectSeat(place);
            marker.hidden = !point;
            if (point) {
                marker.style.left = point.left+'%';
                marker.style.top = point.top+'%';
            }
        });
    }
    function redraw(){ if(!frame) frame=requestAnimationFrame(draw); }
    function viewpoint(place, animate = true){
        seated = place;
        const target = place ? place.eye : [2.48,1.58,1.54];
        const targetYaw = place ? place.yaw : -.86;
        const targetPitch = place ? -.17 : -.22;
        if (animate && eye && !reducedMotion.matches) {
            const distance = Math.hypot(...target.map((value,i) => value-eye[i]));
            const angle = targetYaw-yaw;
            travel = {
                origin:eye, target, initialYaw:yaw, initialPitch:pitch, targetPitch,
                yawDelta:Math.atan2(Math.sin(angle),Math.cos(angle)), turn:true,
                duration:clamp(550 + distance*130,650,1150)
            };
            markers.hidden = true;
        } else {
            travel = null;
            eye = target;
            yaw = targetYaw;
            pitch = targetPitch;
        }
        entryButton.hidden = !place;
        canvas.focus({preventScroll:true});
        redraw();
    }
    async function openRoom(name){
        if(!layouts[name] || dialog.open) return;
        currentRoom=name;
        document.querySelector('#office-name').textContent=name+' · 3D';
        hint.textContent='Загружаем переговорную…';
        places = [];
        markers.replaceChildren();
        entryButton.hidden = true;
        dialog.showModal();
        try {
            loading ??= import('./office-scene.js?v=4').then(module => module.createOffice(canvas));
            office = await loading;
            if(!dialog.open || name!==currentRoom) return;
            places = office.configure(layouts[name]);
            places.forEach((place,index) => {
                const marker = document.createElement('button');
                marker.type = 'button';
                marker.className = 'seat-marker';
                marker.hidden = true;
                marker.setAttribute('aria-label',place.kind+' · место '+(index+1));
                marker.onclick = event => {
                    if (!event.detail || !moved) viewpoint(place);
                };
                markers.append(marker);
            });
            viewpoint(null,false);
            hint.textContent='Нажми на круг, чтобы сесть. Потяни, чтобы осмотреться.';
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
    let moved = false;
    stage.onpointerdown = e => {
        if(!e.isPrimary) return;
        moved = false;
        drag = {id:e.pointerId, startX:e.clientX, startY:e.clientY, x:e.clientX, y:e.clientY};
        e.target.setPointerCapture(e.pointerId);
    };
    stage.onpointermove = e => {
        if(drag?.id!==e.pointerId) return;
        if(!moved && Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6) return;
        moved = true;
        if (travel) travel.turn = false;
        yaw-=(e.clientX-drag.x)*.006;
        pitch=clamp(pitch+(e.clientY-drag.y)*.006,-1.32,1.32);
        drag.x=e.clientX;drag.y=e.clientY;redraw();
    };
    stage.onlostpointercapture=()=>{drag=null;};
    canvas.onkeydown=e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
        if (travel) travel.turn = false;
        e.preventDefault(); yaw+=(e.key==='ArrowRight')*.1-(e.key==='ArrowLeft')*.1;
        pitch=clamp(pitch+(e.key==='ArrowUp')*.1-(e.key==='ArrowDown')*.1,-1.32,1.32); redraw();
    };
    entryButton.onclick=()=>viewpoint(null);
    document.querySelector('#exit-office').onclick=()=>dialog.close();
    dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
    dialog.onclose=()=>{drag=null;lastTap=null;travel=null;cancelAnimationFrame(frame);frame=0;};
    new ResizeObserver(redraw).observe(canvas);
})();
