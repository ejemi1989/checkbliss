(function(){
  function makeDraggable(track){
    if(!track) return;
    var down=false, startX, scrollLeft, moved=0;
    track.addEventListener('mousedown', function(e){
      down=true; moved=0; track.classList.add('dragging');
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });
    window.addEventListener('mouseup', function(){
      down=false; track.classList.remove('dragging');
    });
    track.addEventListener('mouseleave', function(){
      if(down){ down=false; track.classList.remove('dragging'); }
    });
    track.addEventListener('mousemove', function(e){
      if(!down) return;
      e.preventDefault();
      var x = e.pageX - track.offsetLeft;
      var walk = (x - startX);
      moved = Math.abs(walk);
      track.scrollLeft = scrollLeft - walk;
    });
    track.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(e){ if(moved>6){ e.preventDefault(); } });
    });
  }
  // all draggable card rows: stays carousel + category cards + promise cards
  document.querySelectorAll('#staysTrack, .cats-grid').forEach(makeDraggable);
})();

(function(){
  var win = document.querySelector('.review-window');
  if(!win) return;
  var reviews = Array.prototype.slice.call(win.querySelectorAll('.review'));
  var dotsWrap = document.getElementById('revDots');
  var prev = document.getElementById('revPrev');
  var next = document.getElementById('revNext');
  var i = 0;
  // build dots
  reviews.forEach(function(_,idx){
    var d = document.createElement('button');
    d.className = 'rev-dot' + (idx===0?' active':'');
    d.setAttribute('aria-label','Review '+(idx+1));
    d.addEventListener('click', function(){ go(idx); });
    dotsWrap.appendChild(d);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);
  function go(n){
    i = (n + reviews.length) % reviews.length;
    reviews.forEach(function(r,idx){ r.classList.toggle('active', idx===i); });
    dots.forEach(function(d,idx){ d.classList.toggle('active', idx===i); });
  }
  prev.addEventListener('click', function(){ go(i-1); });
  next.addEventListener('click', function(){ go(i+1); });
})();
(function(){
  var steps = Array.prototype.slice.call(document.querySelectorAll('.wstep'));
  if(!steps.length) return;
  var numEl = document.getElementById('wcNum');
  var barEl = document.getElementById('wcBar');
  var total = steps.length;
  // reveal on enter
  var revealObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); } });
  }, {threshold:0.2});
  steps.forEach(function(s){ revealObs.observe(s); });
  // active step tracking for counter + progress + mobile side-line
  var activeObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var n = parseInt(e.target.dataset.step,10);
        if(numEl) numEl.textContent = ('0'+n).slice(-2);
        if(barEl) barEl.style.width = ((n/total)*100)+'%';
        steps.forEach(function(s){
          var sn = parseInt(s.dataset.step,10);
          s.classList.toggle('active', s===e.target);
          s.classList.toggle('done', sn <= n);
        });
      }
    });
  }, {threshold:0, rootMargin:'-40% 0px -40% 0px'});
  steps.forEach(function(s){ activeObs.observe(s); });
})();
