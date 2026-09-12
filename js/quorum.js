/* ==========================================================================
   QUORUM — client logic. No dependencies.
   One source of truth for drops; every board on the site renders from it.
   ========================================================================== */
(function () {
  "use strict";

  /* --- the ledger ------------------------------------------------------- */
  // tiers: [membersRequired, unitPrice] — ascending members, descending price.
  // hoursLeft is relative so the board is never stale.
  var DROPS = [
    { id: "wc-tee", brand: "Wet Cement", item: "12.4oz Loopback Tee", retail: 58,
      tiers: [[25, 41], [100, 33], [250, 27], [500, 23]], members: 387, hoursLeft: 61,
      origin: "Knit + dyed in Barcelos, PT", resale: 0.71, cat: "apparel" },
    { id: "ns-pant", brand: "Nonsuch", item: "14oz Selvedge Carpenter", retail: 168,
      tiers: [[20, 129], [80, 108], [200, 92], [400, 79]], members: 212, hoursLeft: 133,
      origin: "Denim from Okayama, JP · sewn in Tijuana, MX", resale: 0.84, cat: "apparel" },
    { id: "ot-iem", brand: "Overtone Audio", item: "Wired IEM, Beryllium Driver", retail: 79,
      tiers: [[50, 58], [150, 47], [400, 39], [800, 32]], members: 1104, hoursLeft: 19,
      origin: "Assembled in Dongguan, CN", resale: 0.52, cat: "tech" },
    { id: "hm-frames", brand: "Halfmoon Optics", item: "Acetate Frames, Blue-Block", retail: 145,
      tiers: [[25, 98], [100, 81], [250, 69], [500, 58]], members: 96, hoursLeft: 208,
      origin: "Acetate + tumbled in Cadore, IT", resale: 0.61, cat: "objects" },
    { id: "mn-bottle", brand: "Municipal", item: "18/8 Steel Bottle, 24oz", retail: 44,
      tiers: [[50, 31], [200, 26], [500, 21], [1000, 17]], members: 641, hoursLeft: 88,
      origin: "Pressed in Ningbo, CN", resale: 0.38, cat: "objects" },
    { id: "pm-beanie", brand: "Pale Machine", item: "Merino Rib Beanie", retail: 52,
      tiers: [[40, 36], [120, 30], [300, 25], [600, 21]], members: 289, hoursLeft: 44,
      origin: "Yarn spun in Biella, IT", resale: 0.44, cat: "apparel" },
    { id: "ss-mug", brand: "Second Sunday", item: "Stoneware Mug, Set of 2", retail: 68,
      tiers: [[30, 47], [100, 39], [250, 33], [500, 28]], members: 118, hoursLeft: 155,
      origin: "Thrown in Stoke-on-Trent, UK", resale: 0.29, cat: "objects" },
    { id: "cd-tote", brand: "Civic Duty", item: "1000D Cordura Tote", retail: 95,
      tiers: [[25, 68], [100, 56], [250, 47], [500, 40]], members: 452, hoursLeft: 72,
      origin: "Cut + sewn in Ho Chi Minh City, VN", resale: 0.66, cat: "bags" }
  ];

  /* --- tier math -------------------------------------------------------- */
  function stateOf(drop, membersOverride) {
    var members = typeof membersOverride === "number" ? membersOverride : drop.members;
    var tiers = drop.tiers;
    var current = null, next = null;
    for (var i = 0; i < tiers.length; i++) {
      if (members >= tiers[i][0]) current = tiers[i];
      else if (!next) next = tiers[i];
    }
    var floor = tiers[tiers.length - 1];
    var price = current ? current[1] : null;            // null = quorum not met yet
    var ceiling = tiers[0][1];
    return {
      members: members,
      price: price,
      openingPrice: ceiling,
      next: next,
      floorReached: members >= floor[0],
      needed: next ? next[0] - members : 0,
      pct: Math.min(100, (members / floor[0]) * 100),
      saved: price == null ? 0 : drop.retail - price,
      savedPct: price == null ? 0 : Math.round(((drop.retail - price) / drop.retail) * 100)
    };
  }

  var money = function (n) { return "$" + n.toFixed(n % 1 === 0 ? 0 : 2); };

  /* --- countdown -------------------------------------------------------- */
  var START = Date.now();
  function remaining(drop) {
    var ms = drop.hoursLeft * 3600e3 - (Date.now() - START);
    return ms > 0 ? ms : 0;
  }
  function fmtClock(ms) {
    if (ms <= 0) return "CLOSED";
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d > 0 ? d + "d " + pad(h) + "h " + pad(m) + "m"
                 : pad(h) + ":" + pad(m) + ":" + pad(sec);
  }

  /* --- drop card -------------------------------------------------------- */
  function card(drop) {
    var s = stateOf(drop);
    var el = document.createElement("article");
    el.className = "ballot ballot--perf";

    var stops = drop.tiers.map(function (t) {
      var cls = "ladder__stop";
      if (drop.members >= t[0]) cls += " ladder__stop--hit";
      else if (s.next && t[0] === s.next[0]) cls += " ladder__stop--next";
      return '<div class="' + cls + '"><b>' + money(t[1]) + "</b><span>" + t[0] + " in</span></div>";
    }).join("");

    var badge = s.floorReached
      ? '<span class="stamp">Floor reached</span>'
      : s.price == null
        ? '<span class="stamp stamp--wait">Quorum pending</span>'
        : '<span class="stamp">Quorum met</span>';

    var nextLine = s.floorReached
      ? "Lowest tier unlocked. Price cannot fall further."
      : s.price == null
        ? drop.tiers[0][0] - drop.members + " more members opens this drop at " + money(drop.tiers[0][1]) + "."
        : s.needed + " more and everyone pays " + money(s.next[1]) + " — including you, refunded.";

    el.innerHTML =
      '<div class="ballot__head">' +
        '<div><div class="ballot__brand">' + drop.brand + "</div>" +
        '<h3 class="ballot__item">' + drop.item + "</h3></div>" + badge +
      "</div>" +
      '<div class="price">' +
        '<span class="price__now">' + (s.price == null ? "—" : money(s.price)) + "</span>" +
        '<span class="price__was">retail <span class="strike">' + money(drop.retail) + "</span></span>" +
        (s.price == null ? "" : '<span class="price__note">you keep ' + money(s.saved) + " (" + s.savedPct + "%)</span>") +
      "</div>" +
      '<div class="ladder">' +
        '<div class="ladder__track"><div class="ladder__fill" style="--pct:' + s.pct.toFixed(1) + '%"></div></div>' +
        '<div class="ladder__stops">' + stops + "</div>" +
      "</div>" +
      '<p class="price__note">' + nextLine + "</p>" +
      '<div class="ballot__head" style="align-items:center">' +
        '<span class="ballot__origin">' + drop.origin + "</span>" +
        '<span class="ballot__origin">resale index <b class="num">' + drop.resale.toFixed(2) + "</b></span>" +
      "</div>" +
      '<div class="ballot__head" style="align-items:center">' +
        '<span class="mono" style="font-size:var(--step--1)">closes in <b data-clock="' + drop.id + '">' + fmtClock(remaining(drop)) + "</b></span>" +
        '<button class="btn btn--sm" type="button" data-join="' + drop.id + '">Join — ' + drop.members.toLocaleString() + " in</button>" +
      "</div>";
    return el;
  }

  /* --- boards ----------------------------------------------------------- */
  function paintBoards() {
    document.querySelectorAll("[data-board]").forEach(function (host) {
      var mode = host.getAttribute("data-board");
      var list = DROPS.slice();
      if (mode === "featured") list = list.slice(0, 3);
      if (host.getAttribute("data-cat")) {
        list = list.filter(function (d) { return d.cat === host.getAttribute("data-cat"); });
      }
      host.textContent = "";
      list.forEach(function (d) { host.appendChild(card(d)); });
    });
  }

  /* --- category filter (drops page) ------------------------------------- */
  function wireFilter() {
    var bar = document.querySelector("[data-filter]");
    if (!bar) return;
    var board = document.querySelector('[data-board="all"]');
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      var cat = btn.getAttribute("data-cat");
      bar.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("btn--stamp", b === btn);
        b.classList.toggle("btn--ghost", b !== btn);
      });
      if (cat === "all") board.removeAttribute("data-cat");
      else board.setAttribute("data-cat", cat);
      paintBoards();
    });
  }

  /* --- join buttons: you are member n+1 --------------------------------- */
  function wireJoin() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-join]");
      if (!btn) return;
      var drop = DROPS.filter(function (d) { return d.id === btn.getAttribute("data-join"); })[0];
      if (!drop || drop.joined) return;
      drop.joined = true;
      drop.members += 1;
      paintBoards();
      var fresh = document.querySelector('button[data-join="' + drop.id + '"]');
      if (fresh) {
        fresh.textContent = "You're in — " + drop.members.toLocaleString() + " strong";
        fresh.classList.add("btn--stamp");
        fresh.disabled = true;
        fresh.focus();
      }
    });
  }

  /* --- hero dial -------------------------------------------------------- */
  function wireDial() {
    var dial = document.querySelector("[data-dial]");
    if (!dial) return;
    var drop = DROPS[0];
    var input = dial.querySelector("input[type=range]");
    var out = {
      people: dial.querySelector("[data-dial-people]"),
      price: dial.querySelector("[data-dial-price]"),
      saved: dial.querySelector("[data-dial-saved]"),
      note: dial.querySelector("[data-dial-note]"),
      fill: dial.querySelector(".ladder__fill"),
      stops: dial.querySelectorAll(".ladder__stop")
    };
    function draw() {
      var n = parseInt(input.value, 10);
      var s = stateOf(drop, n);
      out.people.textContent = n.toLocaleString();
      out.price.textContent = s.price == null ? "—" : money(s.price);
      out.saved.textContent = s.price == null
        ? "drop hasn't opened"
        : "you keep " + money(s.saved) + " vs retail";
      out.note.textContent = s.price == null
        ? "Under " + drop.tiers[0][0] + " members the drop does not run. Nobody is charged."
        : s.floorReached
          ? "Floor reached. This is the mill price plus everyone's cut, published in full."
          : s.needed + " more members and the price falls to " + money(s.next[1]) + " for every single person here.";
      out.fill.style.setProperty("--pct", s.pct.toFixed(1) + "%");
      out.stops.forEach(function (stop, i) {
        var hit = n >= drop.tiers[i][0];
        var isNext = !hit && s.next && drop.tiers[i][0] === s.next[0];
        stop.classList.toggle("ladder__stop--hit", hit);
        stop.classList.toggle("ladder__stop--next", isNext);
      });
    }
    input.addEventListener("input", draw);
    draw();
  }

  /* --- host earnings calculator ----------------------------------------- */
  function wireCalc() {
    var calc = document.querySelector("[data-calc]");
    if (!calc) return;
    var audience = calc.querySelector("#calc-audience");
    var convert = calc.querySelector("#calc-convert");
    var basket = calc.querySelector("#calc-basket");
    var outBuyers = calc.querySelector("[data-calc-buyers]");
    var outGmv = calc.querySelector("[data-calc-gmv]");
    var outPay = calc.querySelector("[data-calc-pay]");
    function draw() {
      var a = Math.max(0, +audience.value || 0);
      var c = Math.min(100, Math.max(0, +convert.value || 0)) / 100;
      var b = Math.max(0, +basket.value || 0);
      var buyers = Math.round(a * c);
      var gmv = buyers * b;
      outBuyers.textContent = buyers.toLocaleString();
      outGmv.textContent = "$" + Math.round(gmv).toLocaleString();
      outPay.textContent = "$" + Math.round(gmv * 0.03).toLocaleString();
    }
    [audience, convert, basket].forEach(function (i) { i.addEventListener("input", draw); });
    draw();
  }

  /* --- waitlist --------------------------------------------------------- */
  function wireWaitlist() {
    document.querySelectorAll("form[data-waitlist]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = form.querySelector('input[type="email"]');
        var ok = form.querySelector("[data-waitlist-ok]");
        if (!email.value) return;
        try { localStorage.setItem("quorum:card", email.value); } catch (err) { /* private mode */ }
        ok.textContent = "Card issued to " + email.value + ". Saved in this browser only — there is no server behind this prototype yet.";
        email.value = "";
      });
    });
  }

  /* --- ticker: real numbers from the ledger ----------------------------- */
  function wireTicker() {
    var track = document.querySelector("[data-ticker]");
    if (!track) return;
    var items = DROPS.map(function (d) {
      var s = stateOf(d);
      return "<span>" + d.brand.toUpperCase() + " — " + d.members.toLocaleString() +
        " in — <b>" + (s.price == null ? "pending" : money(s.price)) + "</b></span>";
    }).join("");
    track.innerHTML = items + items; // duplicated for a seamless -50% loop
  }

  /* --- clocks ----------------------------------------------------------- */
  function tick() {
    document.querySelectorAll("[data-clock]").forEach(function (el) {
      var drop = DROPS.filter(function (d) { return d.id === el.getAttribute("data-clock"); })[0];
      if (drop) el.textContent = fmtClock(remaining(drop));
    });
  }

  /* --- boot ------------------------------------------------------------- */
  function start() {
    paintBoards();
    wireFilter();
    wireJoin();
    wireDial();
    wireCalc();
    wireWaitlist();
    wireTicker();
    tick();
    setInterval(tick, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
