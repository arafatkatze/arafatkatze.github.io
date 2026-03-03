(function () {
  "use strict";

  var canvas, ctx, width, height, particles, mouse, raf;
  var NUM_PARTICLES = 22;
  var CONNECTION_DIST = 70;
  var BASE_SPEED = 0.18;
  var HOVER_SPEED = 1.6;
  var HOVER_RADIUS = 100;

  mouse = { x: -9999, y: -9999, over: false };

  function getColors() {
    var dark =
      document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      return {
        nodeStroke: "rgba(180,180,200,0.6)",
        nodeCore: "rgba(210,210,230,0.8)",
        line: { r: 150, g: 150, b: 170 },
      };
    }
    return {
      nodeStroke: "rgba(80,80,100,0.45)",
      nodeCore: "rgba(55,55,75,0.7)",
      line: { r: 90, g: 90, b: 110 },
    };
  }

  function createParticle() {
    var angle = Math.random() * Math.PI * 2;
    var speed = BASE_SPEED * (0.5 + Math.random() * 0.5);
    var radius = 2.5 + Math.random() * 4.5;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseSpeed: speed,
      radius: radius,
      rings: Math.floor(1 + Math.random() * 2),
    };
  }

  function resize() {
    var tile = canvas.parentElement;
    var rect = tile.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    canvas = document.getElementById("network-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    resize();
    particles = [];
    for (var i = 0; i < NUM_PARTICLES; i++) {
      particles.push(createParticle());
    }

    var tile = canvas.parentElement;
    tile.addEventListener("mouseenter", function () {
      mouse.over = true;
    });
    tile.addEventListener("mouseleave", function () {
      mouse.over = false;
      mouse.x = -9999;
      mouse.y = -9999;
    });
    tile.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    window.addEventListener("resize", function () {
      resize();
    });

    new MutationObserver(function () {}).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ["data-theme"] }
    );

    loop();
  }

  function update() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var speed = p.baseSpeed;

      if (mouse.over) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < HOVER_RADIUS) {
          var factor = 1 - dist / HOVER_RADIUS;
          speed = p.baseSpeed + (HOVER_SPEED - p.baseSpeed) * factor * factor;
        }
      }

      var angle = Math.atan2(p.vy, p.vx);
      p.x += Math.cos(angle) * speed;
      p.y += Math.sin(angle) * speed;

      var margin = 30;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;

      p.vx += (Math.random() - 0.5) * 0.012;
      p.vy += (Math.random() - 0.5) * 0.012;
      var mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (mag > 0) {
        p.vx = (p.vx / mag) * p.baseSpeed;
        p.vy = (p.vy / mag) * p.baseSpeed;
      }
    }
  }

  function drawNode(p, colors) {
    var r = p.radius;

    for (var ring = p.rings; ring >= 1; ring--) {
      var rr = r * (0.4 + ring * 0.3);
      if (rr < 1.2) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = colors.nodeStroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(r * 0.28, 1.4), 0, Math.PI * 2);
    ctx.fillStyle = colors.nodeCore;
    ctx.fill();
  }

  function draw() {
    var colors = getColors();
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          var t = 1 - dist / CONNECTION_DIST;
          var alpha = t * 0.35;
          var lw = t * 1.0 + 0.15;
          ctx.strokeStyle =
            "rgba(" +
            colors.line.r + "," +
            colors.line.g + "," +
            colors.line.b + "," +
            alpha + ")";
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    for (var k = 0; k < particles.length; k++) {
      drawNode(particles[k], colors);
    }
  }

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
