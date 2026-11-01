import {AcousticField} from '../world/AcousticField.js';
export class NoiseSystem{
 constructor(tileMap){this.map=tileMap;this.acoustics=new AcousticField(tileMap);this.events=[];this.rings=[];this.nextId=1;}
 emit(x,y,intensity,type='movement',duration=1.1){const field=this.acoustics.propagate(x,y,intensity);const event={id:this.nextId++,x,y,intensity,type,duration,age:0,field};this.events.push(event);this.rings.push({x,y,r:4,max:intensity*.65,age:0,duration:.7,type});return event;}
 update(dt){for(const e of this.events)e.age+=dt;this.events=this.events.filter(e=>e.age<e.duration+1.5);for(const r of this.rings){r.age+=dt;r.r+=(r.max/.7)*dt;}this.rings=this.rings.filter(r=>r.age<r.duration);}
 getIntensity(event,x,y){return this.acoustics.intensityAt(event.field,x,y);}
 draw(ctx){for(const r of this.rings){const a=Math.max(0,1-r.age/r.duration);ctx.strokeStyle=r.type==='decoy'?`rgba(85,226,220,${a*.75})`:r.type==='movement'?`rgba(242,182,93,${a*.45})`:`rgba(255,95,102,${a*.6})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();}}
}
