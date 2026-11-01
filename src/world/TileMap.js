export const TILE = { FLOOR:0, WALL:1, CARPET:2, METAL:3, MACHINERY:4 };
export class TileMap {
  constructor(grid,tileSize=20){this.grid=grid;this.tileSize=tileSize;this.height=grid.length;this.width=grid[0].length;}
  cellAtWorld(x,y){return {x:Math.floor(x/this.tileSize),y:Math.floor(y/this.tileSize)};}
  tileAtWorld(x,y){const c=this.cellAtWorld(x,y);return this.tileAt(c.x,c.y);}
  tileAt(x,y){if(y<0||x<0||y>=this.height||x>=this.width)return TILE.WALL;return this.grid[y][x];}
  isSolidWorld(x,y){return this.tileAtWorld(x,y)===TILE.WALL;}
  canOccupy(x,y,r=5){return !this.isSolidWorld(x-r,y-r)&&!this.isSolidWorld(x+r,y-r)&&!this.isSolidWorld(x-r,y+r)&&!this.isSolidWorld(x+r,y+r);}
  lineOfSight(x0,y0,x1,y1){let x=Math.floor(x0/this.tileSize),y=Math.floor(y0/this.tileSize),tx=Math.floor(x1/this.tileSize),ty=Math.floor(y1/this.tileSize);const dx=Math.abs(tx-x),sx=x<tx?1:-1,dy=-Math.abs(ty-y),sy=y<ty?1:-1;let err=dx+dy;while(true){if(!(x===Math.floor(x0/this.tileSize)&&y===Math.floor(y0/this.tileSize))&&this.tileAt(x,y)===TILE.WALL)return false;if(x===tx&&y===ty)return true;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y+=sy;}}}
  draw(ctx,time=0){const s=this.tileSize;ctx.fillStyle='#071521';ctx.fillRect(0,0,this.width*s,this.height*s);for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){const t=this.grid[y][x],px=x*s,py=y*s;if(t===TILE.WALL){ctx.fillStyle='#142938';ctx.fillRect(px,py,s,s);ctx.fillStyle='#203c4a';ctx.fillRect(px+1,py+1,s-2,2);ctx.fillStyle='#0b1924';ctx.fillRect(px+2,py+5,s-4,s-7);}else{ctx.fillStyle=t===TILE.CARPET?'#152a33':t===TILE.METAL?'#1a303b':t===TILE.MACHINERY?'#192c36':'#0c1c29';ctx.fillRect(px,py,s,s);ctx.strokeStyle=t===TILE.METAL?'#33505c':'#142b38';ctx.lineWidth=.6;ctx.strokeRect(px+.5,py+.5,s-1,s-1);if(t===TILE.METAL){ctx.strokeStyle='#355765';ctx.beginPath();ctx.moveTo(px+4,py+5);ctx.lineTo(px+s-4,py+5);ctx.stroke();}if(t===TILE.MACHINERY){ctx.fillStyle='#f2b65d';ctx.globalAlpha=.25+.12*Math.sin(time/180+x);ctx.fillRect(px+6,py+6,8,8);ctx.globalAlpha=1;}if(t===TILE.CARPET){ctx.fillStyle='rgba(85,226,220,.12)';for(let k=4;k<s;k+=6)ctx.fillRect(px+k,py+4,1,s-8);}}}}
}
