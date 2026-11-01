export class MissionManager{
 constructor(levels,saveManager){this.levels=levels;this.saveManager=saveManager;this.currentIndex=0;this.completed=false;this.failed=false;}
 get level(){return this.levels[this.currentIndex];}
 start(index=0){this.currentIndex=Math.max(0,Math.min(this.levels.length-1,index));this.completed=false;this.failed=false;}
 complete(score){this.completed=true;return this.saveManager.record(this.level.id,score);}
 fail(){this.failed=true;}
 hasNext(){return this.currentIndex<this.levels.length-1;}
 next(){if(this.hasNext()){this.start(this.currentIndex+1);return true;}return false;}
}
