/* Hero parallax — image drifts slower than scroll for cinematic depth */
(function(){
  var ph=document.querySelector('.hero .ph');
  var hero=document.querySelector('.hero');
  if(!ph||!hero) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ticking=false;
  function update(){
    var rect=hero.getBoundingClientRect();
    // only animate while hero is near viewport
    if(rect.bottom>0 && rect.top<window.innerHeight){
      var offset=rect.top * -0.36; // parallax strength (doubled for full-bleed depth)
      ph.style.transform='translate3d(0,'+offset+'px,0)';
    }
    ticking=false;
  }
  window.addEventListener('scroll',function(){
    if(!ticking){ window.requestAnimationFrame(update); ticking=true; }
  },{passive:true});
  update();
})();
