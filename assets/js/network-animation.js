(function () {
  "use strict";

  var canvas, ctx, width, height, particles, mouse, raf;
  var NUM_PARTICLES = 48;
  var CONNECTION_DIST = 120;
  var BASE_SPEED = 0.15;
  var HOVER_SPEED = 1.6;
  var HOVER_RADIUS = 160;

  mouse = { x: -9999, y: -9999, over: false };

  function getColors() {
    var dark =
      document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      return {
        ring: "rgba(170,170,190,0.5)",
        core: "rgba(200,200,220,0.85)",
        line: { r: 140, g: 140, b: 160 },
      };
    }
    return {
      ring: "rgba(60,60,70,0.4)",
      core: "rgba(40,40,50,0.75)",
      line: { r: 60, g: 60, b: 70 },
    };
  }

  function createParticle() {
    var angle = Math.random() * Math.PI * 2;
    var speed = BASE_SPEED * (0.4 + Math.random() * 0.6);
    var rand = Math.random();
    var radius, rings;
    if (rand < 0.3) {
      radius = 1.5 + Math.random() * 2;
      rings = 0;
    } else if (rand < 0.7) {
      radius = 3.5 + Math.random() * 3;
      rings = 1;
    } else {
      radius = 5 + Math.random() * 4;
      rings = 2;
    }
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseSpeed: speed,
      radius: radius,
      rings: rings,
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

      var margin = 40;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;

      p.vx += (Math.random() - 0.5) * 0.01;
      p.vy += (Math.random() - 0.5) * 0.01;
      var mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (mag > 0) {
        p.vx = (p.vx / mag) * p.baseSpeed;
        p.vy = (p.vy / mag) * p.baseSpeed;
      }
    }
  }

  function drawNode(p, colors) {
    var r = p.radius;

    if (p.rings >= 2) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    if (p.rings >= 1) {
      var inner = p.rings >= 2 ? r * 0.6 : r * 0.75;
      ctx.beginPath();
      ctx.arc(p.x, p.y, inner, 0, Math.PI * 2);
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    var coreR = p.rings === 0 ? r * 0.7 : Math.max(r * 0.22, 1.5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = colors.core;
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
          var alpha = t * 0.45;
          var lw = t * 1.2 + 0.2;
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
