const KEYMAP={ ' ':'space','ArrowUp':'arrowup','ArrowDown':'arrowdown','ArrowLeft':'arrowleft','ArrowRight':'arrowright' };
export class Input{
 constructor(){this.keys=new Set();this.edges=new Set();window.addEventListener('keydown',e=>{const key=KEYMAP[e.key]||e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key))e.preventDefault();if(!this.keys.has(key))this.edges.add(key);this.keys.add(key);});window.addEventListener('keyup',e=>this.keys.delete(KEYMAP[e.key]||e.key.toLowerCase()));window.addEventListener('blur',()=>this.keys.clear());}
 down(...keys){return keys.some(k=>this.keys.has(k.toLowerCase()));}
 pressed(key){return this.edges.has(key.toLowerCase());}
 endFrame(){this.edges.clear();}
}
