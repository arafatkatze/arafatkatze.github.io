(function () {
  'use strict';

  var MAX = 18000;

  // ── Item data ──────────────────────────────

  var insideItems = [
    { id:'suitcase', emoji:'🧳', name:'Carry-on Suitcase', w:3500, qty:1, max:1, cat:'bag', quip:'Osprey 46L. This is literally my home.' },
    { id:'black-tee', emoji:'👕', name:'Black T-shirt', w:180, qty:3, max:5, cat:'clothing', quip:"Does 3 jobs: casual, smart-casual, and 'I'm at a conference.'" },
    { id:'grey-tee', emoji:'👕', name:'Grey T-shirt', w:180, qty:2, max:5, cat:'clothing', quip:'Grey goes with everything. That\'s the whole strategy.' },
    { id:'button-up', emoji:'👔', name:'Button-up Shirt', w:250, qty:1, max:2, cat:'clothing', quip:'The one nice thing I own. Weddings, dinners, border crossings.' },
    { id:'jeans', emoji:'👖', name:'Jeans', w:1000, qty:1, max:2, cat:'clothing', quip:'One pair. Wash on Sundays. They develop character.' },
    { id:'chinos', emoji:'👖', name:'Chinos', w:500, qty:1, max:2, cat:'clothing', quip:"Lighter than jeans. Passes as 'dressed up' in most countries." },
    { id:'shorts', emoji:'🩳', name:'Shorts', w:250, qty:2, max:3, cat:'clothing', quip:'For anything above 25°C and all hostel common rooms.' },
    { id:'hoodie', emoji:'🧥', name:'Hoodie', w:700, qty:1, max:1, cat:'clothing', quip:'Airport pillow. Blanket. Jacket. Emotional support garment.' },
    { id:'light-jacket', emoji:'🧥', name:'Lightweight Jacket', w:450, qty:1, max:1, cat:'clothing', quip:'Layers > bulk. Handles 5°C to 20°C.' },
    { id:'rain-jacket', emoji:'🌧️', name:'Rain Jacket', w:350, qty:1, max:1, cat:'clothing', quip:'Gore-Tex. The thing between me and looking like a drowned rat.' },
    { id:'fleece', emoji:'🧶', name:'Fleece Pullover', w:400, qty:1, max:1, cat:'clothing', quip:'The layering system MVP. Under the jacket, over the tee.' },
    { id:'underwear', emoji:'🩲', name:'Underwear', w:60, qty:6, max:8, cat:'clothing', quip:'Merino wool. Can go longer than you\'d think.' },
    { id:'socks', emoji:'🧦', name:'Socks (pair)', w:55, qty:5, max:7, cat:'clothing', quip:'Also merino. The one thing I refuse to compromise on.' },
    { id:'swim-trunks', emoji:'🩱', name:'Swim Trunks', w:150, qty:1, max:1, cat:'clothing', quip:'Double as shorts in a pinch.' },
    { id:'beanie', emoji:'🧶', name:'Beanie', w:80, qty:1, max:1, cat:'clothing', quip:'Takes zero space. Saves your life in cold airports.' },
    { id:'belt', emoji:'〰️', name:'Belt', w:150, qty:1, max:1, cat:'clothing', quip:'Holding everything together. Literally.' },
    { id:'runners', emoji:'👟', name:'Running Shoes', w:950, qty:1, max:2, cat:'shoes', quip:'Daily shoes. Hiking shoes if I\'m brave. Running shoes rarely.' },
    { id:'flip-flops', emoji:'🩴', name:'Flip Flops', w:220, qty:1, max:1, cat:'shoes', quip:'Hostels. Showers. Beaches. Non-negotiable.' },
    { id:'laptop', emoji:'💻', name:'Laptop', w:2200, qty:1, max:1, cat:'tech', quip:'14" MacBook Pro. My office, cinema, and library.' },
    { id:'laptop-charger', emoji:'🔌', name:'Laptop Charger', w:350, qty:1, max:1, cat:'tech', quip:'The one thing I\'d definitely notice forgetting.' },
    { id:'phone', emoji:'📱', name:'Phone + Charger', w:280, qty:1, max:1, cat:'tech', quip:'USB-C changed everything. One cable to rule them all.' },
    { id:'earbuds', emoji:'🎧', name:'Earbuds', w:55, qty:1, max:1, cat:'tech', quip:'Noise-cancelling. The real ticket to sleeping on planes.' },
    { id:'adapter', emoji:'🔌', name:'Universal Adapter', w:180, qty:1, max:1, cat:'tech', quip:'30 countries. This has seen every outlet shape.' },
    { id:'battery', emoji:'🔋', name:'Portable Battery', w:250, qty:1, max:1, cat:'tech', quip:'10,000mAh. For when outlets are mythical.' },
    { id:'kindle', emoji:'📖', name:'Kindle', w:180, qty:1, max:1, cat:'tech', quip:'300 books, 180 grams. Best trade deal in history.' },
    { id:'camera', emoji:'📸', name:'Camera', w:450, qty:1, max:1, cat:'tech', quip:'Sony ZV-E10. For when phone photos don\'t cut it.' },
    { id:'toiletry-bag', emoji:'🧴', name:'Toiletry Bag', w:850, qty:1, max:1, cat:'toiletries', quip:'Deodorant, toothbrush, razor, sunscreen. All ≤100ml.' },
    { id:'passport', emoji:'📔', name:'Passport + Docs', w:120, qty:1, max:1, cat:'essentials', quip:'The only truly irreplaceable thing in here.' },
    { id:'day-bag', emoji:'🎒', name:'Packable Day Bag', w:180, qty:1, max:1, cat:'essentials', quip:'Folds into itself. Use it daily, pack it nightly.' },
    { id:'towel', emoji:'🏖️', name:'Travel Towel', w:300, qty:1, max:1, cat:'essentials', quip:'Microfiber. Dries in an hour. Smells fine-ish.' },
    { id:'sunglasses', emoji:'🕶️', name:'Sunglasses', w:35, qty:1, max:1, cat:'essentials', quip:'Cheap ones. I will lose them. I always do.' },
    { id:'first-aid', emoji:'🩹', name:'First Aid Kit', w:150, qty:1, max:1, cat:'essentials', quip:'Band-aids, ibuprofen, melatonin. The holy trinity.' },
    { id:'packing-cubes', emoji:'📦', name:'Packing Cubes', w:150, qty:3, max:4, cat:'essentials', quip:'The difference between a suitcase and organized chaos.' },
    { id:'water-bottle', emoji:'💧', name:'Water Bottle', w:200, qty:1, max:1, cat:'essentials', quip:'Reusable. Saves money, saves the planet.' },
    { id:'notebook', emoji:'📓', name:'Notebook + Pen', w:200, qty:1, max:2, cat:'essentials', quip:'Some thoughts need paper, not pixels.' },
    { id:'sleep-mask', emoji:'😴', name:'Sleep Mask + Earplugs', w:50, qty:1, max:1, cat:'essentials', quip:'The hostel survival kit.' },
    { id:'laundry-bag', emoji:'👜', name:'Laundry Bag', w:80, qty:1, max:1, cat:'essentials', quip:'Keeps the dirty separate from the clean.' }
  ];

  var shelfItems = [
    { id:'dress-shirt', emoji:'👔', name:'Dress Shirt', w:280, qty:0, max:2, cat:'clothing', quip:'For when the button-up isn\'t fancy enough.' },
    { id:'thermal', emoji:'🧤', name:'Thermal Base Layer', w:200, qty:0, max:2, cat:'clothing', quip:'For when the hoodie+jacket combo isn\'t enough.' },
    { id:'scarf', emoji:'🧣', name:'Scarf', w:150, qty:0, max:1, cat:'clothing', quip:'Fashion or warmth? Both. Neither.' },
    { id:'pajamas', emoji:'😴', name:'Pajamas', w:300, qty:0, max:1, cat:'clothing', quip:'Some people sleep in PJs. I sleep in tomorrow\'s outfit.' },
    { id:'second-jeans', emoji:'👖', name:'Extra Jeans', w:1000, qty:0, max:1, cat:'clothing', quip:'The luxury most people can\'t imagine giving up.' },
    { id:'winter-coat', emoji:'🧥', name:'Winter Coat', w:1500, qty:0, max:1, cat:'clothing', quip:'Warm? Yes. Worth 8% of your total capacity? Debatable.' },
    { id:'suit', emoji:'🤵', name:'Suit', w:1800, qty:0, max:1, cat:'clothing', quip:'2 kg of social obligation.' },
    { id:'gloves', emoji:'🧤', name:'Gloves', w:100, qty:0, max:1, cat:'clothing', quip:'Pockets exist. But sometimes they aren\'t enough.' },
    { id:'dress-shoes', emoji:'👞', name:'Dress Shoes', w:600, qty:0, max:1, cat:'shoes', quip:'Look good, feel bad, weigh a ton.' },
    { id:'hiking-boots', emoji:'🥾', name:'Hiking Boots', w:1200, qty:0, max:1, cat:'shoes', quip:'Proper ankle support. At the cost of everything else.' },
    { id:'nice-sandals', emoji:'👡', name:'Nice Sandals', w:350, qty:0, max:1, cat:'shoes', quip:'For when flip flops are too honest.' },
    { id:'dslr', emoji:'📷', name:'DSLR Camera', w:800, qty:0, max:1, cat:'tech', quip:'Better photos. Worse back.' },
    { id:'drone', emoji:'🛸', name:'Drone', w:900, qty:0, max:1, cat:'tech', quip:'Incredible footage. Incredible weight.' },
    { id:'ipad', emoji:'📱', name:'iPad', w:500, qty:0, max:1, cat:'tech', quip:'Already have a laptop. Redundancy weighs.' },
    { id:'speaker', emoji:'🔊', name:'Portable Speaker', w:350, qty:0, max:1, cat:'tech', quip:'Beach vibes cost 350 grams.' },
    { id:'switch', emoji:'🎮', name:'Nintendo Switch', w:400, qty:0, max:1, cat:'tech', quip:'Gaming on the go. But the Kindle already lives here.' },
    { id:'extra-cables', emoji:'🔌', name:'Extra Cables', w:150, qty:0, max:1, cat:'tech', quip:"'Just in case.' The 3 most dangerous words in packing." },
    { id:'hair-dryer', emoji:'💨', name:'Hair Dryer', w:600, qty:0, max:1, cat:'toiletries', quip:'Air is free. And it\'s everywhere.' },
    { id:'full-shampoo', emoji:'🧴', name:'Full-size Shampoo', w:400, qty:0, max:1, cat:'toiletries', quip:'Hostels have soap. Hotels have shampoo. Why carry it?' },
    { id:'cologne', emoji:'✨', name:'Cologne', w:200, qty:0, max:1, cat:'toiletries', quip:'Smelling good is 200g I could spend on socks.' },
    { id:'electric-toothbrush', emoji:'🪥', name:'Electric Toothbrush', w:300, qty:0, max:1, cat:'toiletries', quip:'The manual one works fine at 20 grams.' },
    { id:'physical-book', emoji:'📚', name:'Physical Book', w:350, qty:0, max:3, cat:'extras', quip:'Beautiful to hold. The Kindle holds 300 of them at 180g.' },
    { id:'pillow', emoji:'🛏️', name:'Travel Pillow', w:400, qty:0, max:1, cat:'extras', quip:'The hoodie exists for this exact reason.' },
    { id:'sleeping-liner', emoji:'🛏️', name:'Sleep Liner', w:200, qty:0, max:1, cat:'extras', quip:'For when hostel sheets seem... questionable.' },
    { id:'yoga-mat', emoji:'🧘', name:'Yoga Mat', w:1500, qty:0, max:1, cat:'extras', quip:'Namaste at home. It\'s too heavy.' },
    { id:'guitar', emoji:'🎸', name:'Travel Guitar', w:2000, qty:0, max:1, cat:'extras', quip:'Music for the soul. Goodbye, half the wardrobe.' },
    { id:'umbrella', emoji:'☂️', name:'Umbrella', w:350, qty:0, max:1, cat:'extras', quip:'That\'s what the rain jacket is for.' },
    { id:'board-game', emoji:'🎲', name:'Board Game', w:500, qty:0, max:1, cat:'extras', quip:'Fun for the hostel. Pain for the spine.' },
    { id:'snorkel', emoji:'🤿', name:'Snorkeling Gear', w:600, qty:0, max:1, cat:'extras', quip:'Rent at the beach. Don\'t carry across continents.' },
    { id:'ski-goggles', emoji:'🎿', name:'Ski Goggles', w:300, qty:0, max:1, cat:'extras', quip:'Rent them. Seriously.' },
    { id:'espresso', emoji:'☕', name:'Espresso Maker', w:400, qty:0, max:1, cat:'extras', quip:'I\'ve thought about this more than I\'d like to admit.' },
    { id:'dumbbells', emoji:'🏋️', name:'Travel Dumbbells', w:2000, qty:0, max:1, cat:'extras', quip:'Just... no. Use water bottles.' },
    { id:'cast-iron', emoji:'🍳', name:'Cast Iron Skillet', w:3000, qty:0, max:1, cat:'extras', quip:'For the unhinged home cook who refuses to compromise.' }
  ];

  var addReacts = {
    'winter-coat': "1.5kg — that's 8% of the entire suitcase for one item.",
    'guitar': "2kg of music. Say goodbye to a lot of clothes.",
    'yoga-mat': "1.5kg of inner peace. Outer chaos.",
    'hair-dryer': "Air. Is. Free.",
    'pillow': "The hoodie exists for this exact reason.",
    'dumbbells': "You're joking, right? ...right?",
    'cast-iron': "This person is chaotic evil.",
    'suit': "2kg of social obligation. Worth it?",
    'dslr': "The phone camera is right there. But I get it.",
    'drone': "900 grams of YouTube dreams.",
    'physical-book': "Beautiful object. The Kindle holds 300 of them though.",
    'second-jeans': "The luxury most travelers can't imagine giving up.",
    'hiking-boots': "1.2kg. Your feet say thanks. Your back says no.",
    'espresso': "I've considered this more than I'd like to admit.",
    'pajamas': "I sleep in tomorrow's outfit. But you do you.",
    'full-shampoo': "Hostels have soap. Hotels have shampoo. Why carry it?",
    'electric-toothbrush': "The manual one works fine at 20 grams.",
    'snorkel': "Rent at the beach. Don't haul across continents.",
    'board-game': "Fun for the hostel. Pain for the spine.",
    'umbrella': "That's what the rain jacket is for.",
    'ski-goggles': "Rent them. Seriously.",
    'cologne': "Smelling good costs 200g. That's almost 4 pairs of socks.",
    'ipad': "You already have a laptop and a Kindle and a phone..."
  };

  var removeReacts = {
    'laptop': "Bold move. Doing machine learning on napkins now.",
    'passport': "Interesting strategy. Permanent vacation wherever you are.",
    'hoodie': "Goodbye, emotional support garment.",
    'kindle': "300 books, gone in one click.",
    'suitcase': "You removed the suitcase? Carrying everything in your arms?",
    'toiletry-bag': "Deodorant is a courtesy to others. Just saying.",
    'phone': "No phone? Are you a time traveler from 1995?",
    'earbuds': "Enjoy the crying babies on your next flight.",
    'camera': "Fair. The phone camera is honestly pretty good.",
    'rain-jacket': "You'll remember this decision in a monsoon.",
    'first-aid': "Living dangerously. I respect it.",
    'water-bottle': "Buying plastic bottles everywhere. The planet weeps.",
    'sunglasses': "I'd lose them anyway. You're just speeding up the process."
  };

  // ── State ──────────────────────────────────

  var allItems = {};
  var origQty = {};
  var reactionTimer = null;

  function initState() {
    insideItems.forEach(function (it) {
      allItems[it.id] = Object.assign({}, it, { source: 'inside' });
      origQty[it.id] = it.qty;
    });
    shelfItems.forEach(function (it) {
      allItems[it.id] = Object.assign({}, it, { source: 'shelf' });
      origQty[it.id] = it.qty;
    });
  }

  function totalWeight() {
    var sum = 0;
    for (var k in allItems) sum += allItems[k].w * allItems[k].qty;
    return sum;
  }

  // ── Rendering ──────────────────────────────

  function fmtWeight(g) {
    return g >= 1000 ? (g / 1000).toFixed(1) + 'kg' : g + 'g';
  }

  function renderBar() {
    var tw = totalWeight();
    var pct = Math.min((tw / MAX) * 100, 100);
    var fill = document.getElementById('pack-bar-fill');
    var text = document.getElementById('pack-bar-text');
    var wrap = document.getElementById('pack-bar-wrap');
    if (!fill || !text || !wrap) return;

    fill.style.width = pct + '%';
    text.textContent = (tw / 1000).toFixed(1) + ' / ' + (MAX / 1000).toFixed(1) + ' kg';

    var color;
    if (tw > MAX) { color = '#ef4444'; }
    else if (tw > MAX * 0.97) { color = '#ef4444'; }
    else if (tw > MAX * 0.89) { color = '#f59e0b'; }
    else { color = '#22c55e'; }

    text.style.color = color;
    fill.style.background = color;

    wrap.classList.remove('pack-over');
    if (tw > MAX) {
      wrap.classList.add('pack-over');
    }
  }

  function makeCard(item) {
    var div = document.createElement('div');
    div.className = 'pack-item';
    div.setAttribute('data-id', item.id);
    if (item.qty === 0) div.classList.add('pack-item-empty');

    div.innerHTML =
      '<div class="pack-item-emoji">' + item.emoji + '</div>' +
      '<div class="pack-item-name">' + item.name + '</div>' +
      '<div class="pack-item-weight">' + fmtWeight(item.w) + '</div>' +
      '<div class="pack-item-quip">"' + item.quip + '"</div>' +
      '<div class="pack-item-controls">' +
        '<button class="pack-btn pack-btn-remove" ' + (item.qty <= 0 ? 'disabled' : '') + '>Remove</button>' +
        '<span class="pack-item-qty">' + item.qty + '</span>' +
        '<button class="pack-btn pack-btn-add" ' + (item.qty >= item.max ? 'disabled' : '') + '>Pack</button>' +
      '</div>';

    div.querySelector('.pack-btn-add').addEventListener('click', function () { changeQty(item.id, 1); });
    div.querySelector('.pack-btn-remove').addEventListener('click', function () { changeQty(item.id, -1); });
    return div;
  }

  function renderGrid(containerId, items) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    items.forEach(function (it) { el.appendChild(makeCard(it)); });
  }

  function renderShelf() {
    var el = document.getElementById('pack-shelf');
    if (!el) return;
    el.innerHTML = '';

    var cats = [
      { key: 'clothing', label: 'Clothing' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'tech', label: 'Tech' },
      { key: 'toiletries', label: 'Toiletries' },
      { key: 'extras', label: 'The Questionable Ideas' }
    ];

    cats.forEach(function (cat) {
      var items = shelfItems.filter(function (it) { return it.cat === cat.key; });
      if (!items.length) return;

      var h = document.createElement('h4');
      h.className = 'pack-cat-title';
      h.textContent = cat.label;
      el.appendChild(h);

      var grid = document.createElement('div');
      grid.className = 'pack-grid';
      items.forEach(function (it) { grid.appendChild(makeCard(allItems[it.id])); });
      el.appendChild(grid);
    });
  }

  function updateCard(id) {
    var item = allItems[id];
    var cards = document.querySelectorAll('.pack-item[data-id="' + id + '"]');
    cards.forEach(function (card) {
      card.querySelector('.pack-item-qty').textContent = item.qty;
      card.querySelector('.pack-btn-remove').disabled = item.qty <= 0;
      card.querySelector('.pack-btn-add').disabled = item.qty >= item.max;
      if (item.qty === 0) card.classList.add('pack-item-empty');
      else card.classList.remove('pack-item-empty');
    });
  }

  function renderReceipt() {
    var wrap = document.getElementById('pack-receipt-wrap');
    var el = document.getElementById('pack-receipt');
    if (!wrap || !el) return;

    var added = [], removed = [];
    for (var k in allItems) {
      var diff = allItems[k].qty - origQty[k];
      if (diff > 0) added.push({ item: allItems[k], diff: diff });
      if (diff < 0) removed.push({ item: allItems[k], diff: -diff });
    }

    if (!added.length && !removed.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';

    var html = '<table class="pack-receipt-table">';
    if (added.length) {
      html += '<tr class="pack-receipt-header"><td colspan="3">Packed</td></tr>';
      added.forEach(function (a) {
        html += '<tr><td>' + a.item.emoji + ' ' + a.item.name + '</td><td>×' + a.diff + '</td><td class="pack-receipt-w pack-receipt-plus">+' + fmtWeight(a.item.w * a.diff) + '</td></tr>';
      });
    }
    if (removed.length) {
      html += '<tr class="pack-receipt-header"><td colspan="3">Removed</td></tr>';
      removed.forEach(function (r) {
        html += '<tr><td>' + r.item.emoji + ' ' + r.item.name + '</td><td>×' + r.diff + '</td><td class="pack-receipt-w pack-receipt-minus">−' + fmtWeight(r.item.w * r.diff) + '</td></tr>';
      });
    }

    var origW = 0, nowW = totalWeight();
    for (var k2 in origQty) origW += allItems[k2].w * origQty[k2];
    var delta = nowW - origW;
    html += '<tr class="pack-receipt-total"><td>Net change</td><td></td><td class="pack-receipt-w ' + (delta > 0 ? 'pack-receipt-plus' : 'pack-receipt-minus') + '">' + (delta > 0 ? '+' : '−') + fmtWeight(Math.abs(delta)) + '</td></tr>';
    html += '</table>';
    el.innerHTML = html;
  }

  // ── Reactions ──────────────────────────────

  function showReaction(text) {
    var el = document.getElementById('pack-reaction');
    if (!el) return;
    clearTimeout(reactionTimer);
    el.textContent = text;
    el.classList.add('pack-reaction-show');
    reactionTimer = setTimeout(function () {
      el.classList.remove('pack-reaction-show');
    }, 3200);
  }

  function getReaction(id, action) {
    if (action === 'add' && addReacts[id]) return addReacts[id];
    if (action === 'remove' && removeReacts[id]) return removeReacts[id];
    var tw = totalWeight();
    if (action === 'add' && tw > MAX) return "🔴 Won't close. Something's gotta go.";
    if (action === 'remove' && tw < 8000) return "At this point just go with a passport and vibes.";
    if (action === 'remove' && tw < 12000) return "Impressive minimalism. Sure you'll survive?";
    return null;
  }

  // ── Actions ────────────────────────────────

  function changeQty(id, delta) {
    var item = allItems[id];
    if (!item) return;
    var next = item.qty + delta;
    if (next < 0 || next > item.max) return;
    item.qty = next;

    var action = delta > 0 ? 'add' : 'remove';
    updateCard(id);
    renderBar();
    renderReceipt();

    var reaction = getReaction(id, action);
    if (reaction) showReaction(reaction);
  }

  // ── Init ───────────────────────────────────

  function init() {
    initState();
    renderGrid('pack-inside', insideItems);
    renderShelf();
    renderBar();
    renderReceipt();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
