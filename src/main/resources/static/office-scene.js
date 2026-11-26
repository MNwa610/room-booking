import * as T from './vendor/three/three.module.min.js';
import {RoundedBoxGeometry} from './vendor/three/RoundedBoxGeometry.js';

function oakTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ceac85';
    ctx.fillRect(0, 0, 1024, 256);
    let seed = 4567;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2400; i++) {
        const x = random()*1024, y = random()*256, length = 30 + random()*450;
        ctx.strokeStyle = random()>.5 ? '#59371d22' : '#fff0cd44';
        ctx.lineWidth = .2 + random()*.85;
        ctx.beginPath(); ctx.moveTo(x,y);
        ctx.bezierCurveTo(x+length*.3,y-3,x+length*.7,y+4,x+length,y);
        ctx.stroke();
    }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
}

// A cutout canopy keeps the small leaves legible without thousands of separate meshes.
function canopyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    let seed = 191;
    const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    function branch(x, y, angle, length, depth) {
        const endX = x + Math.cos(angle)*length, endY = y + Math.sin(angle)*length;
        ctx.strokeStyle = depth > 2 ? '#665a47' : '#777453';
        ctx.lineWidth = 1 + depth*depth*.43;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(endX,endY); ctx.stroke();
        if (depth) {
            for (const side of [-1,1]) branch(endX,endY,angle+side*(.25+random()*.54),length*(.67+random()*.1),depth-1);
        } else {
            const colors = ['#597344','#6d874d','#8da460','#a9b978','#789958'];
            for (let i=0;i<150;i++) {
                const a=random()*Math.PI*2, r=Math.sqrt(random())*25;
                ctx.fillStyle=colors[Math.floor(random()*colors.length)];
                ctx.beginPath(); ctx.ellipse(endX+Math.cos(a)*r,endY+Math.sin(a)*r,2+random()*4,2+random()*2,a,0,Math.PI*2); ctx.fill();
            }
        }
    }
    branch(256,508,-Math.PI/2,126,6);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
}

export function createOffice(canvas) {
    const renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    const camera = new T.PerspectiveCamera(67, 1, .035, 60);
    camera.rotation.order = 'YXZ';
    const scene = new T.Scene();
    scene.background = new T.Color('#d0e4ef');
    scene.fog = new T.FogExp2('#d0e4ef', .035);
    scene.add(new T.HemisphereLight(0xfff3dc, 0xb2a795, 1.75));
    const sun = new T.DirectionalLight(0xffefcf, 3.1);
    sun.position.set(-1.8,3.4,-4.4);
    sun.target.position.set(.9,.25,1.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera,{left:-5,right:5,top:4,bottom:-4,near:.1,far:16});
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias=.009;
    scene.add(sun,sun.target);
    const wood = oakTexture();
    wood.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const material = (color,options={}) => new T.MeshStandardMaterial({color,roughness:.76,...options});
    const oak=material('#ffffff',{map:wood}), plaster=material('#e6e0d5'), steel=material('#424c52',{metalness:.42,roughness:.38});
    const leaf=material('#537659'), pot=material('#b6977d'), windowFrame=material('#625e56');
    function mesh(geometry,mat,x,y,z) {
        const obj = new T.Mesh(geometry,mat);
        obj.position.set(x,y,z); obj.castShadow=true; obj.receiveShadow=true; scene.add(obj);
        return obj;
    }
    function box(x,y,z,w,h,d,mat,r=0) {
        return mesh(r ? new RoundedBoxGeometry(w,h,d,3,r) : new T.BoxGeometry(w,h,d),mat,x,y,z);
    }
    function cylinder(x,y,z,top,bottom,h,mat) {
        return mesh(new T.CylinderGeometry(top,bottom,h,32),mat,x,y,z);
    }
    box(0,-.055,0,7.5,.09,4.1,steel);
    for(let row=0;row<16;row++) {
        for(let left=-3.7-(row%2)*.85;left<3.7;left+=1.7) {
            const a=Math.max(-3.7,left), b=Math.min(3.7,left+1.7);
            box((a+b)/2,-.012,-1.875+row*.25,b-a-.002,.024,.248,oak);
        }
    }
    box(0,3.07,0,7.55,.14,4.2,plaster);
    for(const side of [-1,1]) box(side*3.76,1.5,0,.12,3,4,plaster);
    box(0,1.5,2.08,7.52,3,.16,plaster);
    // Actual opening lets daylight and the view through without coplanar overlays.
    for(const side of [-1,1]) box(side*2.75,1.5,-2.07,1.9,3,.14,plaster);
    box(0,.4,-2.07,3.6,.8,.14,plaster);
    box(0,2.83,-2.07,3.6,.34,.14,plaster);
    for(const x of [-1.78,0,1.78]) box(x,1.73,-2.035,.045,1.86,.09,windowFrame);
    for(const y of [.82,2.64]) box(0,y,-2.035,3.6,.04,.09,windowFrame);
    box(0,.79,-1.95,3.73,.06,.32,oak,.016);
    const facades = ['#c69f84','#c6c0ae','#b6aaa0'].map(color => material(color));
    const glazing = material('#829eab',{roughness:.32});
    const parapet = material('#ddd4c6');
    for (let i=0;i<9;i++) {
        const x=(i-4)*5.8, z=-20-(i%3)*2.1, roof=2+Math.cos(i*2.4)*1.6;
        box(x,roof-4,z,5.2,8,3,facades[i%3]);
        box(x,roof+.06,z,5.32,.12,3.12,parapet);
        for (let row=0;row<4;row++) {
            for (let col=0;col<5;col++) box(x+(col-2)*1.01,roof-.8-row*1.45,z+1.52,.74,.91,.045,glazing);
        }
    }
    box(0,-3.62,-14,65,.2,27,material('#94a577'));
    box(0,-3.50,-9.6,60,.04,1.7,parapet);
    const foliage = new T.SpriteMaterial({map:canopyTexture(), alphaTest:.28, transparent:false});
    for (const [x,z,height] of [[-10,-11,6.8],[-5.2,-8,6.4],[-2.1,-12,5.4],[2.3,-10,6.6],[7,-13,7.5],[12,-9,6.3]]) {
        const tree = new T.Sprite(foliage);
        tree.center.set(.5,0); tree.position.set(x,-3.5,z); tree.scale.set(height,height,1);
        scene.add(tree);
    }
    // A recessed painted leaf, stop and architrave give the doorway a visible reveal.
    const doorPaint = material('#60746f',{roughness:.58});
    const trim = material('#cfc6b5'), brass = material('#b99b69',{metalness:.55,roughness:.36});
    box(2.85,1.10,1.973,1.03,2.20,.045,steel);
    box(2.85,1.089,1.935,.93,2.15,.047,doorPaint,.012);
    for(const x of [2.335,3.365]) box(x,1.122,1.916,.077,2.244,.12,trim,.009);
    box(2.85,2.24,1.916,1.107,.076,.12,trim,.009);
    box(2.85,.014,1.924,.98,.028,.12,steel,.008);
    box(2.62,1.56,1.904,.205,.77,.021,brass,.009);
    box(2.62,1.56,1.887,.178,.74,.016,material('#99b1b4',{roughness:.32}),.008);
    for (const y of [.37,1.83]) cylinder(3.318,y,1.887,.012,.012,.105,brass);
    const rose = cylinder(2.48,1.01,1.891,.038,.038,.023,brass);
    rose.rotation.x=Math.PI/2;
    box(2.48,1.01,1.855,.025,.025,.065,brass,.009);
    box(2.548,1.01,1.822,.161,.028,.028,brass,.013);
    for(let i=0;i<26;i++) box(-3.65,1.51,-1.55+i*.12,.08,2.55,.074,oak);
    box(-3.55,1.53,-.13,.10,1.0,1.78,steel,.035);
    box(-3.49,1.53,-.13,.018,.93,1.70,material('#23313b',{roughness:.2}),.007);
    const lightMat=new T.MeshBasicMaterial({color:0xfff2d6});
    for(const x of [-1.2,1.2]) {
        for(const z of [-.94,.14]) cylinder(x,2.86,z,.006,.006,.28,steel);
        box(x,2.69,-.4,.088,.067,1.44,steel,.018);
        box(x,2.65,-.4,.072,.014,1.4,lightMat,.005);
    }
    const fabric=material('#b4775b',{roughness:.96});
    const graphite = material('#494e52',{roughness:.86});
    const desk=box(0,.755,-.49,1,.075,1.08,graphite,.034);
    const hub=box(0,.801,-.49,.33,.017,.11,steel,.008);
    hub.castShadow=false;
    const seatGroups=[];
    for(const sign of [-1,1]) {
        const group=new T.Group(); scene.add(group); seatGroups.push(group);
        group.add(cylinder(0,.36,-.49,.065,.09,.72,steel));
        group.add(box(0,.033,-.49,.35,.06,.69,steel,.026));
        for(const side of [-1,1]) {
            const z=-.49+side*.79;
            group.add(cylinder(0,.23,z,.031,.045,.42,steel));
            for(let i=0;i<5;i++) {
                const angle=i*2*Math.PI/5;
                const spoke=box(Math.sin(angle)*.13,.066,z+Math.cos(angle)*.13,.031,.034,.28,steel,.012);
                spoke.rotation.y=angle;group.add(spoke);
                group.add(cylinder(Math.sin(angle)*.255,.031,z+Math.cos(angle)*.255,.034,.034,.055,steel));
            }
            group.add(box(0,.445,z,.53,.105,.49,fabric,.048));
            const back=box(0,.696,z+side*.22,.51,.47,.09,fabric,.043);
            back.rotation.x=side*.12;group.add(back);
            for(const arm of [-1,1]){
                group.add(cylinder(arm*.247,.52,z,.014,.014,.19,steel));
                group.add(box(arm*.247,.625,z,.052,.045,.255,steel,.022));
            }
        }
    }
    const plant=new T.Group();scene.add(plant);
    plant.add(cylinder(0,.23,-1.49,.238,.16,.46,pot));
    plant.add(cylinder(0,.462,-1.49,.212,.212,.009,material('#544833')));
    for(let i=0;i<30;i++) {
        const a=i*2.4, h=.24+(i%7)*.054;
        const blade=mesh(new T.SphereGeometry(1,16,12),leaf,Math.sin(a)*.13,.46+h*.8,-1.49+Math.cos(a)*.13);
        blade.scale.set(.065,h,.021);
        blade.rotation.set(Math.cos(a)*.44,a,-Math.sin(a)*.44);
        plant.add(blade);
    }
    return {
        configure(layout) {
            desk.scale.x=layout.table;
            seatGroups.forEach((group,i)=>group.position.x=(i?1:-1)*layout.table*.29);
            plant.position.x=layout.plant;fabric.color.set(layout.accent);
            renderer.shadowMap.needsUpdate=true;
        },
        render(eye,yaw,pitch) {
            const w=canvas.clientWidth,h=canvas.clientHeight;
            if(!w||!h)return;
            const pixelRatio=renderer.getPixelRatio();
            if(canvas.width!==Math.floor(w*pixelRatio)||canvas.height!==Math.floor(h*pixelRatio)) renderer.setSize(w,h,false);
            camera.aspect=w/h;
            camera.fov=camera.aspect<1 ? 80 : 67;
            camera.updateProjectionMatrix();
            camera.position.fromArray(eye);camera.rotation.set(pitch,-yaw,0,'YXZ');
            renderer.render(scene,camera);
        }
    };
}
