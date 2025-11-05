// Chainers Plot Planner - Main Script

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = {
  Common: '#a4aed3',
  Uncommon: '#72d275',
  Rare: '#40c6ff',
  Epic: '#fe83d9',
  Legendary: '#e6ad15'
};

// Data stores
let SEED_DATA = {};
let PLOT_DATA = {};
let LAMP_DATA = {};
let ANIMAL_DATA = {};
let PRODUCT_DATA = {};
let SHOP_DATA = {};

// State
let farmName = 'Default';
let seedQuantities = {};
let plotQuantities = {};
let lampQuantities = {};
let animalQuantities = {};
let seasonalFlags = {};
let flippedCards = new Set();
let compareMode = {};
let shopFilter = 'all';
let shopSort = 'rarity';
let shopSortDesc = false;
let sortDescending = false;
let shopShowInStockOnly = true;
let sortVar = 'grow_time';
let showSeasonal = false;
let showCompareOnly = false;
let showCompactMode = false;
let excludedSeeds = new Set();
let strategyVar = 'bp_per_batch';
let autosaveTimer = null;

const nf = new Intl.NumberFormat();

// ==================== INITIALIZATION ====================

async function loadAllData() {
  try {
    const [seedRes, plotRes, lampRes, animalRes, robotRes, productRes, foodRes] = await Promise.all([
      fetch('data/seed_data.json'),
      fetch('data/plot_data.json'),
      fetch('data/lamp_data.json'),
      fetch('data/animal_data.json'),
      fetch('data/robot_data.json'),
      fetch('data/product_data.json'),
      fetch('data/food_data.json')
    ]);

    if (!seedRes.ok || !plotRes.ok || !lampRes.ok || !animalRes.ok || !productRes.ok || !foodRes.ok) {
      throw new Error('Failed to fetch data files');
    }

    SEED_DATA = (await seedRes.json()).seeds || {};
    PLOT_DATA = (await plotRes.json()).plots || {};
    LAMP_DATA = (await lampRes.json()).lamps || {};
    PRODUCT_DATA = (await productRes.json()).products || {};
    
    const animalJson = await animalRes.json();
    ANIMAL_DATA = animalJson.animals || {};
    
    const robotJson = await robotRes.json();
    SHOP_DATA = {
      Seeds: {},
      Plots: {},
      Lamps: {},
      Animals: {},
      'Auto Harvesters': robotJson['Auto Harvesters'] || {}
    };
    FOOD_DATA = (await foodRes.json()).food || {};

    // Build shop data from individual files
    Object.entries(SEED_DATA).forEach(([name, data]) => {
      SHOP_DATA.Seeds[name] = { 
        price: data.price || 0, 
        usdt: 0,
        in_stock: data.in_stock || false, 
        icon: data.icon 
      };
    });

    Object.entries(PLOT_DATA).forEach(([name, data]) => {
      SHOP_DATA.Plots[name] = { 
        price: data.price || 0, 
        usdt: data.usdt || 0,
        in_stock: data.in_stock || false, 
        icon: data.icon 
      };
    });

    Object.entries(LAMP_DATA).forEach(([name, data]) => {
      SHOP_DATA.Lamps[name] = { 
        price: data.price || 0, 
        usdt: data.usdt || 0,
        in_stock: data.in_stock || false, 
        icon: data.icon 
      };
    });

    // Flatten and add animals to shop - ALL ANIMALS
    Object.values(ANIMAL_DATA).forEach(category => {
      Object.entries(category).forEach(([name, data]) => {
        if (typeof data === 'object' && data.grow_time !== undefined) {
          SHOP_DATA.Animals[name] = { 
            price: data.price || 0, 
            usdt: data.usdt || 0,
            in_stock: data.in_stock || false 
          };
        }
      });
    });

    console.log('✅ Data loaded successfully');
    console.log('Seeds:', Object.keys(SEED_DATA).length);
    console.log('Plots:', Object.keys(PLOT_DATA).length);
    console.log('Lamps:', Object.keys(LAMP_DATA).length);
    console.log('Products:', Object.keys(PRODUCT_DATA).length);
    console.log('Food Recipes:', Object.keys(FOOD_DATA).length);
    console.log('Shop Items:', Object.values(SHOP_DATA).reduce((sum, cat) => sum + Object.keys(cat).length, 0));
  } catch (err) {
    console.error('❌ Error loading data:', err);
    showToast('Error loading data - using fallback data', 'warning');
    loadFallbackData();
  }
}

function loadFallbackData() {
  // Minimal fallback data for testing
  SEED_DATA = {
    "Strawberry": {
      "Common": { "grow_time": 2, "bio_points": 1 },
      "Uncommon": { "grow_time": 2, "bio_points": 2 },
      "Rare": { "grow_time": 2, "bio_points": 3 },
      "Epic": { "grow_time": 2, "bio_points": 7 },
      "Legendary": { "grow_time": 2, "bio_points": 13 },
      "seasonal": false,
      "icon": "🍓"
    }
  };
  PLOT_DATA = {
    "Cardboard": { "multiplier": 1, "icon": "📦" }
  };
  LAMP_DATA = {
    "Common": { "time_reduce": 3, "chance": 3, "icon": "💡" }
  };
  ANIMAL_DATA = {};
  FOOD_DATA = {};
  SHOP_DATA = {};
}

function initializeQuantities() {
  seedQuantities = {};
  plotQuantities = {};
  lampQuantities = {};
  animalQuantities = {};
  seasonalFlags = {};

  Object.keys(SEED_DATA).forEach(seed => {
    RARITIES.forEach(rarity => {
      seedQuantities[`${seed}_${rarity}`] = 0;
    });
    seasonalFlags[seed] = SEED_DATA[seed].seasonal || false;
  });

  Object.keys(PLOT_DATA).forEach(plot => {
    plotQuantities[plot] = 0;
  });

  Object.keys(LAMP_DATA).forEach(lamp => {
    lampQuantities[lamp] = 0;
  });

  Object.keys(ANIMAL_DATA).forEach(animal => {
    animalQuantities[animal] = 0;
  });
}


// ==================== CARD CREATION ====================

function createSeedCard(seed) {
  const highestRarity = RARITIES.slice().reverse().find(r => seedQuantities[`${seed}_${r}`] > 0) || 'Common';
  const cardId = `seed_${seed}`;
  const viewMatch = [...flippedCards].find(id => id.startsWith(cardId + '_view_'));
  const cardView = viewMatch ? viewMatch.split('_view_')[1] : 'default';
  
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const cardEl = document.createElement('div');
  cardEl.className = `card rarity-${highestRarity.toLowerCase()}`;
  cardEl.dataset.cardId = cardId;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = `images/seeds/${highestRarity.toLowerCase()}/${seed.toLowerCase().replace(/ /g, '_')}.png`;
  img.alt = seed;
  img.className = 'seed-img';
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">${SEED_DATA[seed].icon || '🌱'}</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = seed;
  header.appendChild(name);
  
  const time = document.createElement('span');
  time.className = 'ms-auto small text-muted';

  const seedData = SEED_DATA[seed];
  const ownedRarities = RARITIES.filter(r => (seedQuantities[`${seed}_${r}`] || 0) > 0);
  const growTimes = RARITIES.map(r => seedData[r].grow_time);
  const allSameTime = growTimes.every(t => t === growTimes[0]);

  if (allSameTime) {
    // If all rarities have the same grow time, just display it.
    time.textContent = formatTime(growTimes[0]);
  } else if (ownedRarities.length > 0) {
    // User owns seeds. Check for varying grow times among owned seeds.
    const ownedTimeData = [...new Set(ownedRarities.map(r => seedData[r].grow_time))].sort((a, b) => a - b);

    if (ownedTimeData.length <= 1) {
      // If all owned seeds have the same grow time, display it simply.
      time.textContent = formatTime(ownedTimeData[0]);
    } else {
      // If owned seeds have multiple different grow times, format with colors.
      const primaryTime = ownedTimeData[0];
      const secondaryTimes = ownedTimeData.slice(1);

      // For each secondary time, find the highest rarity that has it.
      const secondaryTimeStrings = secondaryTimes.map(t => {
        const rarityForTime = RARITIES.slice().reverse().find(r => 
          ownedRarities.includes(r) && seedData[r].grow_time === t
        );
        return `<span class="text-${rarityForTime.toLowerCase()}">${formatTime(t)}</span>`;
      });

      time.innerHTML = `${formatTime(primaryTime)} (${secondaryTimeStrings.join(', ')})`;
    }
  } else {
    // User does not own any, show the full range for seeds with varying times.
    const minTime = Math.min(...growTimes);
    const maxTime = Math.max(...growTimes);
    time.textContent = `${formatTime(minTime)} - ${formatTime(maxTime)}`;
  }
  header.appendChild(time);
  
  const controlBtns = document.createElement('div');
  controlBtns.className = 'card-controls-overlay';
  
  const compareBtn = document.createElement('button');
  compareBtn.className = `control-btn ${compareMode[seed] ? 'active' : ''}`;
  compareBtn.innerHTML = '⚖️';
  compareBtn.title = 'Toggle compare';
  compareBtn.onclick = (e) => {
    e.stopPropagation();
    compareMode[seed] = !compareMode[seed];
    updateSeedList();
    autosave();
  };
  controlBtns.appendChild(compareBtn);
  
  const upgradeBtn = document.createElement('button');
  upgradeBtn.className = `control-btn ${cardView === 'upgrade' ? 'active' : ''}`;
  upgradeBtn.innerHTML = '⬆️';
  upgradeBtn.title = 'Upgrade strategy';
  upgradeBtn.onclick = (e) => {
    e.stopPropagation();
    toggleCardView(cardId, 'upgrade');
  };
  controlBtns.appendChild(upgradeBtn);
  
  const infoBtn = document.createElement('button');
  infoBtn.className = `control-btn ${cardView === 'info' ? 'active' : ''}`;
  infoBtn.innerHTML = 'ℹ️';
  infoBtn.title = 'Information';
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    toggleCardView(cardId, 'info');
  };
  controlBtns.appendChild(infoBtn);
  
  header.appendChild(controlBtns);
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';

  if (cardView === 'info') {
    body.appendChild(SeedInfoContent(seed));
  } else if (cardView === 'upgrade') {
    body.appendChild(SeedUpgradeContent(seed));
  } else {
    if (showCompactMode) {
      // Only show rarities that user has
      RARITIES.forEach(rarity => {
        const qty = seedQuantities[`${seed}_${rarity}`] || 0;
        if (qty > 0) {
          body.appendChild(createRarityRow(seed, rarity));
        }
      });
    } else {
      // Show all rarities
      RARITIES.forEach(rarity => {
        body.appendChild(createRarityRow(seed, rarity));
      });
    }
  }
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}

function SeedInfoContent(seedName) {
  const container = document.createElement('div');
  const seed = SEED_DATA[seedName];
  
  const growTimes = RARITIES.map(r => seed[r].grow_time);
  const allSameTime = growTimes.every(t => t === growTimes[0]);
  let growTimeText;
  if (allSameTime) {
    growTimeText = formatTime(growTimes[0]);
  } else {
    const minTime = Math.min(...growTimes);
    const maxTime = Math.max(...growTimes);
    growTimeText = `${formatTime(minTime)} - ${formatTime(maxTime)}`;
  }

  const bpMinValues = RARITIES.map(r => seed[r].bio_points / seed[r].grow_time);
  const minBpMin = Math.min(...bpMinValues);
  const maxBpMin = Math.max(...bpMinValues);

  container.innerHTML = `
    <div class="info-row"><strong>Grow Time:</strong> ${growTimeText}</div>
    <div class="info-row"><strong>Bio Points Range:</strong> 🍀${seed.Common.bio_points} - ${seed.Legendary.bio_points} per harvest</div>
    <div class="info-row"><strong>BP/m Range:</strong> 🍀${minBpMin.toFixed(1)} - ${maxBpMin.toFixed(1)} per minute</div>
    <div class="info-row"><strong>Seed Price CFB:</strong> ${seed.price ? `🪙${seed.price}` : 'Not available'}</div>
    <div class="info-row"><strong>Seed Price USDT:</strong> ${seed.usdt ? `$${seed.usdt}` : 'Not available'}</div>
    <div class="info-row"><strong>Total Cost per Legendary:</strong> ${seed.price ? `🪙${nf.format(16 * seed.price)} / ` : ' '} ${seed.usdt ? `$${nf.format(16 * seed.usdt)}` : ' '}</div>
    <div class="info-row"><strong>Shop Status:</strong> ${seed.in_stock ? '✅ Available' : 'Not available'}</div>
  `;
  
  return container;
}

function SeedUpgradeContent(seedName) {
  const container = document.createElement('div');
  const seed = SEED_DATA[seedName];
  const price = seed.price || 0;
  const usdt = seed.usdt || 0;

  const counts = RARITIES.map(r => seedQuantities[`${seedName}_${r}`] || 0);

  const simulateMerges = arr => {
    const temp = arr.slice();
    let changed;
    do {
      changed = false;
      for (let i = 0; i < RARITIES.length - 1; i++) {
        const pairs = Math.floor(temp[i] / 2);
        if (pairs > 0) {
          temp[i] -= pairs * 2;
          temp[i + 1] += pairs;
          changed = true;
        }
      }
    } while (changed);
    return temp;
  };

  let lowestOwnedIndex = -1;
  for (let i = 0; i < RARITIES.length; i++) {
    if (counts[i] > 0) {
      lowestOwnedIndex = i;
      break;
    }
  }

  function commonsNeededForRarity(targetIndex, currentCounts) {
    for (let extra = 0; extra <= 1024; extra++) {
      const temp = currentCounts.slice();
      temp[0] += extra;
      const result = simulateMerges(temp);
      if (result[targetIndex] > 0) return extra;
    }
    return null;
  }

  let html = `<h6 class="mb-3">⬆️ Current Upgrade Requirements</h6>`;

  if (lowestOwnedIndex === -1) {
    html += `<div class="info-row">Acquire Seeds<br>1 x Legendary = 16 x Commons (🪙 ${nf.format(16 * price)})</div>`;
    container.innerHTML = html;
    return container;
  }

  html += `<div class="upgrade-path-visual">`;
  
  for (let target = lowestOwnedIndex + 1; target < RARITIES.length; target++) {
    const needed = commonsNeededForRarity(target, counts);
    
    if (needed !== null && needed > 0) {
      const cost = needed * price;
      const costU = needed * usdt;
      const sourceRarity = RARITIES[lowestOwnedIndex].toLowerCase();
      const targetRarity = RARITIES[target].toLowerCase();
      const targetImg = `images/seeds/${targetRarity}/${seedName.toLowerCase().replace(/ /g, '_')}.png`;
      const commonImg = `images/seeds/common/${seedName.toLowerCase().replace(/ /g, '_')}.png`;

      html += `
        <div class="upgrade-step">
          <div class="upgrade-source">
            <img src="${commonImg}" alt="Common ${seedName}" class="upgrade-seed-img" 
                 onerror="this.outerHTML='<span style=\\'font-size:2.5rem\\'>${seed.icon || '🌱'}</span>'">
            <div class="upgrade-quantity">${needed}×</div>
          </div>
          <span class="upgrade-arrow">→</span>
          <div class="upgrade-target">
            <img src="${targetImg}" alt="${RARITIES[target]} ${seedName}" class="upgrade-result-img"
                 onerror="this.outerHTML='<span style=\\'font-size:2.8rem\\'>${seed.icon || '🌱'}</span>'">
            <div class="text-${targetRarity} upgrade-rarity-label">${RARITIES[target]}</div>
          </div>

          ${price > 0 ? `<div class="upgrade-cost">🪙${nf.format(cost)}${usdt > 0 ? ` / $${nf.format(costU)}` : ''}</div>` : ''}</div>`;
    }
  }
  
  html += '</div>';

  container.innerHTML = html;
  return container;
}



function PlotCard(plot) {
  const cardId = `plot_${plot}`;
  const viewMatch = [...flippedCards].find(id => id.startsWith(cardId + '_view_'));
  const cardView = viewMatch ? viewMatch.split('_view_')[1] : 'default';
  
  let rarityClass = '';
  const mult = PLOT_DATA[plot].multiplier;
  if (mult === 1) rarityClass = 'rarity-common';
  else if (mult === 2) rarityClass = 'rarity-uncommon';
  else if (mult === 4) rarityClass = 'rarity-rare';
  else if (mult === 8) rarityClass = 'rarity-epic';
  else if (mult === 16) rarityClass = 'rarity-legendary';
  
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const cardEl = document.createElement('div');
  cardEl.className = `card ${rarityClass}`;
  cardEl.dataset.cardId = cardId;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = `images/plots/${plot.toLowerCase().replace(/ /g, '_')}.png`;
  img.alt = plot;
  img.className = 'plot-img';
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">${PLOT_DATA[plot].icon || '📦'}</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = plot;
  name.className = 'ms-2';
  header.appendChild(name);
  
  const mult2 = document.createElement('span');
  mult2.className = 'ms-auto text-muted';
  mult2.innerHTML = `<strong>x${PLOT_DATA[plot].multiplier}</strong> harvest`;
  header.appendChild(mult2);
  
  const controlBtns = document.createElement('div');
  controlBtns.className = 'card-controls-overlay';
  
  const infoBtn = document.createElement('button');
  infoBtn.className = `control-btn ${cardView === 'info' ? 'active' : ''}`;
  infoBtn.innerHTML = 'ℹ️';
  infoBtn.title = 'Information';
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    toggleCardView(cardId, 'info');
  };
  controlBtns.appendChild(infoBtn);
  
  header.appendChild(controlBtns);
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';
  
  if (cardView === 'info') {
    body.appendChild(PlotInfoContent(plot));
  } else {
    body.className = 'card-body d-flex justify-content-center';
    body.appendChild(PlotControls(plot));
  }
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}

function PlotControls(plot) {
  const controls = document.createElement('div');
  controls.className = 'qty-controls';
  
  const minusBtn = document.createElement('button');
  minusBtn.className = 'qty-btn';
  minusBtn.textContent = '-';
  minusBtn.onclick = () => {
    plotQuantities[plot] = Math.max(0, (plotQuantities[plot] || 0) - 1);
    updatePlotList();
    updateTotals();
    autosave();
  };
  controls.appendChild(minusBtn);
  
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'qty-input';
  input.value = plotQuantities[plot] || 0;
  input.min = 0;
  input.oninput = () => {
    plotQuantities[plot] = Math.max(0, parseInt(input.value) || 0);
    input.value = plotQuantities[plot];
    updateTotals();
    autosave();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
  controls.appendChild(input);
  
  const plusBtn = document.createElement('button');
  plusBtn.className = 'qty-btn';
  plusBtn.textContent = '+';
  plusBtn.onclick = () => {
    plotQuantities[plot] = (plotQuantities[plot] || 0) + 1;
    updatePlotList();
    updateTotals();
    autosave();
  };
  controls.appendChild(plusBtn);
  
  return controls;
}

function PlotInfoContent(plotName) {
  const container = document.createElement('div');
  const plot = PLOT_DATA[plotName];

  // Get ordered list of plot names
  const plotNames = Object.keys(PLOT_DATA);
  const index = plotNames.indexOf(plotName);
  const previousPlotName = index > 0 ? plotNames[index - 1] : null;

  container.innerHTML = `
    <h6 class="mb-3">ℹ️ Plot Info</h6>
    <div class="info-row"><strong>Multiplier:</strong> Harvest x${plot.multiplier} crops per Seed</div>
    <div class="info-row"><strong>Price CFB:</strong> ${plot.price ? `🪙${plot.price}` : "Can't be purchased"}</div>
    <div class="info-row"><strong>Price USDT:</strong> ${plot.usdt ? `$${plot.usdt}` : "Can't be purchased"}</div>
    <div class="info-row"><strong>Craft/Merge Requirements:</strong><br>
    ${previousPlotName && plot.merge_cost ? `2x ${previousPlotName} Plots + 🪙${plot.merge_cost} + ${plot.fert_req} Fertiliser` : previousPlotName ? `2x ${previousPlotName} Plots` : plot.merge_cost ? `🪙${plot.merge_cost} + ${plot.fert_req} Fertiliser` : "Can't be merged"}
    </div>
    </div>
  `;

  return container;
}




function LampCard(lamp) {
  const cardId = `lamp_${lamp}`;
  const viewMatch = [...flippedCards].find(id => id.startsWith(cardId + '_view_'));
  const cardView = viewMatch ? viewMatch.split('_view_')[1] : 'default';
  
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.cardId = cardId;
  
  const rarityClass = RARITIES.find(r => lamp.toLowerCase() === r.toLowerCase());
  if (rarityClass) {
    cardEl.classList.add(`rarity-${rarityClass.toLowerCase()}`);
  }
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = `images/lamps/${lamp.toLowerCase().replace(/ /g, '_')}.png`;
  img.alt = lamp;
  img.className = 'lamp-img';
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">${LAMP_DATA[lamp].icon || '💡'}</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = lamp;
  name.className = 'ms-2';
  header.appendChild(name);
  
  const bonus = document.createElement('span');
  bonus.className = 'ms-auto text-muted';
  bonus.textContent = `${LAMP_DATA[lamp].time_reduce}%`;
  header.appendChild(bonus);
  
  const controlBtns = document.createElement('div');
  controlBtns.className = 'card-controls-overlay';
  
  const infoBtn = document.createElement('button');
  infoBtn.className = `control-btn ${cardView === 'info' ? 'active' : ''}`;
  infoBtn.innerHTML = 'ℹ️';
  infoBtn.title = 'Information';
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    toggleCardView(cardId, 'info');
  };
  controlBtns.appendChild(infoBtn);
  
  header.appendChild(controlBtns);
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';
  
  if (cardView === 'info') {
    body.appendChild(LampInfoContent(lamp));
  } else {
    body.className = 'card-body d-flex justify-content-center';
    body.appendChild(LampControls(lamp));
  }
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}

function LampControls(lamp) {
  const controls = document.createElement('div');
  controls.className = 'qty-controls';
  
  const minusBtn = document.createElement('button');
  minusBtn.className = 'qty-btn';
  minusBtn.textContent = '-';
  minusBtn.onclick = () => {
    lampQuantities[lamp] = Math.max(0, (lampQuantities[lamp] || 0) - 1);
    updateLampList();
    updateTotals();
    autosave();
  };
  controls.appendChild(minusBtn);
  
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'qty-input';
  input.value = lampQuantities[lamp] || 0;
  input.min = 0;
  input.oninput = () => {
    lampQuantities[lamp] = Math.max(0, parseInt(input.value) || 0);
    input.value = lampQuantities[lamp];
    updateTotals();
    autosave();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
  controls.appendChild(input);
  
  const plusBtn = document.createElement('button');
  plusBtn.className = 'qty-btn';
  plusBtn.textContent = '+';
  plusBtn.onclick = () => {
    lampQuantities[lamp] = (lampQuantities[lamp] || 0) + 1;
    updateLampList();
    updateTotals();
    autosave();
  };
  controls.appendChild(plusBtn);
  
  return controls;
}

function LampInfoContent(lampName) {
  const container = document.createElement('div');
  const lamp = LAMP_DATA[lampName];
  
  // Get ordered list of lamp names by rarity
  const lampNames = Object.keys(LAMP_DATA);
  const index = lampNames.indexOf(lampName);
  const previousLampName = index > 0 ? lampNames[index - 1] : null;
  
  container.innerHTML = `
    <h6 class="mb-3">📊 Information</h6>
    <div class="info-row"><strong>Time Reduction:</strong> -${lamp.time_reduce}%</div>
    <div class="info-row"><strong>Higher Rarity Chance:</strong> +${lamp.chance}%</div>
    <div class="info-row"><strong>Harvest Multiplier Chance Increase:</strong> ${lamp.plot_bonus}</div>
    <div class="info-row"><strong>Price CFB:</strong> ${lamp.price && lamp.price > 0 ? `🪙${lamp.price}` : "Can't be purchased"}</div>
    <div class="info-row"><strong>Price USDT:</strong> ${lamp.usdt && lamp.usdt > 0 ? `$${lamp.usdt}` : "Can't be purchased"}</div>
    <div class="info-row"><strong>Craft/Merge Requirements:</strong><br>
    ${previousLampName && lamp.merge_cost ? `2x ${previousLampName} Lamps + 🪙${lamp.merge_cost} + ${lamp.fert_req} Fertiliser` : previousLampName ? `2x ${previousLampName} Lamps` : lamp.merge_cost ? `🪙${lamp.merge_cost} + ${lamp.fert_req} Fertiliser` : "Can't be merged"}
    </div>
  `;
  
  return container;
}



function AnimalCard(animal, data) {
  const cardId = `animal_${animal}`;
  const viewMatch = [...flippedCards].find(id => id.startsWith(cardId + '_view_'));
  const cardView = viewMatch ? viewMatch.split('_view_')[1] : 'default';
  
  let rarityClass = '';
  if (data.products === 1) rarityClass = 'rarity-common';
  else if (data.products === 2) rarityClass = 'rarity-uncommon';
  else if (data.products === 4) rarityClass = 'rarity-rare';
  else if (data.products === 8) rarityClass = 'rarity-epic';
  else if (data.products === 16) rarityClass = 'rarity-legendary';
  
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const cardEl = document.createElement('div');
  cardEl.className = `card ${rarityClass}`;
  cardEl.dataset.cardId = cardId;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = `images/animals/${animal.toLowerCase().replace(/ /g, '_')}.png`;
  img.alt = animal;
  img.className = 'animal-img';
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">🐾</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = animal;
  name.className = 'ms-2';
  header.appendChild(name);
  
  const info = document.createElement('span');
  info.className = 'ms-auto text-muted small';
  info.textContent = `${data.products}x ${data.produces}`;
  header.appendChild(info);
  
  const controlBtns = document.createElement('div');
  controlBtns.className = 'card-controls-overlay';
  
  const infoBtn = document.createElement('button');
  infoBtn.className = `control-btn ${cardView === 'info' ? 'active' : ''}`;
  infoBtn.innerHTML = 'ℹ️';
  infoBtn.title = 'Information';
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    toggleCardView(cardId, 'info');
  };
  controlBtns.appendChild(infoBtn);
  
  header.appendChild(controlBtns);
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';
  
  if (cardView === 'info') {
    body.appendChild(AnimalInfoContent(animal, data));
  } else {
    body.className = 'card-body d-flex justify-content-center';
    body.appendChild(AnimalControls(animal));
  }
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}

function AnimalControls(animal) {
  const controls = document.createElement('div');
  controls.className = 'qty-controls';
  
  const minusBtn = document.createElement('button');
  minusBtn.className = 'qty-btn';
  minusBtn.textContent = '-';
  minusBtn.onclick = () => {
    animalQuantities[animal] = Math.max(0, (animalQuantities[animal] || 0) - 1);
    updateAnimalList();
    updateTotals();
    autosave();
  };
  controls.appendChild(minusBtn);
  
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'qty-input';
  input.value = animalQuantities[animal] || 0;
  input.min = 0;
  input.oninput = () => {
    animalQuantities[animal] = Math.max(0, parseInt(input.value) || 0);
    input.value = animalQuantities[animal];
    updateTotals();
    autosave();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
  controls.appendChild(input);
  
  const plusBtn = document.createElement('button');
  plusBtn.className = 'qty-btn';
  plusBtn.textContent = '+';
  plusBtn.onclick = () => {
    animalQuantities[animal] = (animalQuantities[animal] || 0) + 1;
    updateAnimalList();
    updateTotals();
    autosave();
  };
  controls.appendChild(plusBtn);
  
  return controls;
}

function AnimalInfoContent(animalName, data) {
  const container = document.createElement('div');
  
  // Find the category this animal belongs to
  let categoryAnimals = null;
  let animalsList = [];
  
  for (const [category, animals] of Object.entries(ANIMAL_DATA)) {
    if (animals[animalName]) {
      categoryAnimals = animals;
      // Get ordered list of animals in this category by products (rarity)
      animalsList = Object.entries(animals)
        .filter(([name, data]) => typeof data === 'object' && data.grow_time !== undefined)
        .sort((a, b) => a[1].products - b[1].products)
        .map(([name]) => name);
      break;
    }
  }
  
  const index = animalsList.indexOf(animalName);
  const previousAnimalName = index > 0 ? animalsList[index - 1] : null;
  
  let mergeReqText = "Can't be crafted/merged";
  const parts = [];
  if (previousAnimalName) {
    parts.push(`2x ${previousAnimalName}`);
  }
  if (data.merge_cost) {
    parts.push(`🪙${data.merge_cost}`);
  }
  if (data.item_req) {
    parts.push(data.item_req);
  }
  if (parts.length > 0) {
    mergeReqText = parts.join('<br>+ ');
  }

  container.innerHTML = `
    <div class="info-row"><strong>Produces:</strong> ${data.products}x ${data.produces}</div>
    <div class="info-row"><strong>Production Time:</strong> ${formatTime(data.grow_time)}</div>
    <div class="info-row"><strong>Price CFB:</strong> ${data.price && data.price > 0 ? `🪙${data.price}` : "Can't be purchased"}</div>
    <div class="info-row"><strong>Price USDT:</strong> ${data.usdt && data.usdt > 0 ? `$${data.usdt}` : "Can't be purchased"}</div>
    <div class="info-row"><strong>Craft/Merge Requirements:</strong><br>
    ${mergeReqText}
    </div>
  `;
  
  return container;
}

function switchAnimalView(view) {
  // Hide all subsections
  document.querySelectorAll('.animal-subsection').forEach(section => {
    section.style.display = 'none';
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('#animals-tab .menu-toggle-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected view
  if (view === 'animals') {
    document.getElementById('animals-view').style.display = 'block';
    document.getElementById('animals-view-btn').classList.add('active');
  } else if (view === 'food') {
    document.getElementById('food-view').style.display = 'block';
    document.getElementById('food-view-btn').classList.add('active');
    updateFoodList();
  } else if (view === 'products') {
    document.getElementById('products-view').style.display = 'block';
    document.getElementById('products-view-btn').classList.add('active');
    updateProductList();
  }
}

function FoodCard(category, rarity) {
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const rarityClass = `rarity-${rarity.toLowerCase()}`;
  
  const cardEl = document.createElement('div');
  cardEl.className = `card ${rarityClass}`;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = `images/food/${category.toLowerCase()}/${rarity.toLowerCase()}.png`;
  img.alt = `${rarity} ${category} Food`;
  img.className = 'item-img';
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">🍱</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = category === 'Pigs' ? `${category} Food` : `${rarity} ${category} Food`;
  name.className = 'ms-2';
  header.appendChild(name);
  
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';

  const foodInfo = FOOD_DATA[category];
  if (!foodInfo) {
    body.innerHTML = '<div class="info-row">Recipe data not found.</div>';
  } else {
    // Build recipe HTML
    const recipeItems = foodInfo.recipe.map(ing => {
      const itemRarity = ing.rarity || rarity.toLowerCase();
      const imgName = ing.name.replace(/ /g, '_');
      let path;
      if (ing.type === 'products') {
        path = `images/products/${imgName}/${itemRarity}.png`;
      } else { // 'seeds'
        path = `images/seeds/${itemRarity}/${imgName}.png`;
      }
      const alt = `${itemRarity} ${ing.name}`;
      return `
        <div class="ingredient-item">
          <div class="ingredient-quantity">${ing.quantity}×</div>
          <img src="${path}" alt="${alt}" class="ingredient-img">
        </div>
      `;
    }).join('<span class="ingredient-plus">+</span>');

    const foodYieldRarity = category === 'Pigs' ? 'common' : rarity.toLowerCase();
    const recipeHTML = `
      <div class="info-row">
        <strong>Recipe:</strong>
        <div class="ingredient-list">
          ${recipeItems}
          <span class="ingredient-plus">=</span>
          <div class="ingredient-item">
            <div class="ingredient-quantity">${foodInfo.yield}×</div>
            <img src="images/food/${category.toLowerCase()}/${foodYieldRarity}.png" class="ingredient-img">
          </div>
        </div>
      </div>
    `;

    // Build produces HTML
    const productRarity = category === 'Pigs' ? 'common' : rarity.toLowerCase();
    const producesHTML = `
      <div class="info-row">
        <strong>${category} Produce:</strong>
        <div class="ingredient-list">
          <div class="ingredient-item">
            <img src="images/products/${foodInfo.produces}/${productRarity}.png" alt="${rarity} ${foodInfo.produces}" class="ingredient-img">
            
          </div>
        </div>
      </div>
    `;

    body.innerHTML = recipeHTML + producesHTML;
  }
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}

function ProductCard(productType, rarity, data) {
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const rarityClass = `rarity-${rarity.toLowerCase()}`;
  
  const cardEl = document.createElement('div');
  cardEl.className = `card ${rarityClass}`;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = `images/products/${productType}/${rarity.toLowerCase()}.png`;
  img.alt = `${rarity} ${productType}`;
  img.className = 'item-img';
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">🍶</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = `${rarity} ${productType.charAt(0).toUpperCase() + productType.slice(1)}`;
  name.className = 'ms-2';
  header.appendChild(name);
  
  const time = document.createElement('span');
  time.className = 'ms-auto small text-muted';
  time.textContent = formatTime(data.grow_time);
  header.appendChild(time);
  
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';
  
  const sourceAnimal = productType === 'eggs' ? 'Birds' : 
                       productType === 'milk' ? 'Cattle' : 
                       productType === 'wool' ? 'Fuzzies' : 
                       productType === 'truffles' ? 'Pigs' : 'Animals';
  
  body.innerHTML = `
    <div class="info-row"><strong>Production Time:</strong> ${formatTime(data.grow_time)}</div>
    <div class="info-row"><strong>Bio Points:</strong> <span class="bp-highlight">🍀${data.bio_points}</span></div>
    <div class="info-row"><strong>BP/min:</strong> <span class="bp-highlight">🍀${(data.bio_points / data.grow_time).toFixed(1)}</span></div>
    <div class="info-row"><strong>Source:</strong> Any ${sourceAnimal} with ${rarity} ${sourceAnimal} food</div>
  `;
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}

function updateFoodList() {
  const list = document.getElementById('food-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  // Add tips section
  const tipsSection = document.createElement('div');
  tipsSection.className = 'col-12 mb-4';
  tipsSection.innerHTML = `
    <div class="card">
      <div class="card-header">
        <strong>💡 Tips</strong>
      </div>
      <div class="card-body">
        <div class="info-row">
          <strong>Higher rarity animals</strong> produce more products.
        </div>
        <div class="info-row">
          Animals produce higher rarity products when fed <strong>higher rarity food</strong>.
        </div>
        <div class="info-row">
          Animals can eat <strong>any rarity</strong> of food.<br>
          e.g. A White Chicken fed Epic Bird Food would produce 1 Epic Egg. 
        </div>
        <div class="info-row">
          Merging food requires the harvested products from the seeds shown (not the seeds themselves)
        </div>
      </div>
    </div>
  `;
  list.appendChild(tipsSection);
  
  const foodCategories = Object.keys(FOOD_DATA);
  const foodRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  
  foodCategories.forEach(category => {
    const section = document.createElement('div');
    section.className = 'col-12 mb-4';
    
    const header = document.createElement('h5');
    header.className = 'section-header';
    header.innerHTML = `${ANIMAL_DATA[category]?.icon || '🍱'} ${category} Food`;
    section.appendChild(header);
    
    const row = document.createElement('div');
    row.className = 'row';
    
    if (category === 'Pigs') {
      row.appendChild(FoodCard(category, 'Common'));
    } else {
      foodRarities.forEach(rarity => {
        row.appendChild(FoodCard(category, rarity));
      });
    }
    section.appendChild(row);
    list.appendChild(section);
  });
}

function updateProductList() {
  const list = document.getElementById('product-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!PRODUCT_DATA || Object.keys(PRODUCT_DATA).length === 0) {
    list.innerHTML = '<div class="col-12"><div class="alert alert-info">No product data available</div></div>';
    return;
  }

  
  Object.entries(PRODUCT_DATA).forEach(([productType, rarityData]) => {
    const section = document.createElement('div');
    section.className = 'col-12 mb-4';
    
    const header = document.createElement('h5');
    header.className = 'section-header';
    const icon = productType === 'eggs' ? '🥚' : productType === 'milk' ? '🥛' : productType === 'wool' ? '🧶' : '🍶';
    header.innerHTML = `${icon} ${productType.charAt(0).toUpperCase() + productType.slice(1)}`;
    section.appendChild(header);
    
    const row = document.createElement('div');
    row.className = 'row';
    
    Object.entries(rarityData).forEach(([rarity, data]) => {
      row.appendChild(ProductCard(productType, rarity, data));
    });
    
    section.appendChild(row);
    list.appendChild(section);
  });
}


function ShopCard(category, itemName, itemData) {
  const card = document.createElement('div');
  card.className = 'col-md-6 col-lg-4 mb-3';
  
  const cardEl = document.createElement('div');
  cardEl.className = 'card shop-card';
  
  // Determine rarity class and image path based on category and item
  let rarityClass = '';
  let imgPath = '';
  let imgAlt = itemName;
  let imgClass = 'item-img';
  let fallbackEmoji = '🛒';
  let additionalInfo = '';
  
  if (category === 'Seeds') {
    const seedData = SEED_DATA[itemName];
    if (seedData) {
      imgPath = `images/seeds/common/${itemName.toLowerCase().replace(/ /g, '_')}.png`;
      fallbackEmoji = seedData.icon || '🌱';
      additionalInfo = `
        <div class="shop-info-row"><strong>Grow Time:</strong> ${formatTime(seedData.Common.grow_time)}</div>
        <div class="shop-info-row"><strong>Bio Points Range:</strong> 🍀${seedData.Common.bio_points} - ${seedData.Legendary.bio_points}</div>
        <div class="shop-info-row"><strong>BP/m Range:</strong> 🍀${(seedData.Common.bio_points / seedData.Common.grow_time).toFixed(1)} - ${(seedData.Legendary.bio_points / seedData.Common.grow_time).toFixed(1)}</div>
      `;
    }
  } else if (category === 'Plots') {
    const plotData = PLOT_DATA[itemName];
    if (plotData) {
      imgPath = `images/plots/${itemName.toLowerCase().replace(/ /g, '_')}.png`;
      fallbackEmoji = plotData.icon || '📦';
      const mult = plotData.multiplier;
      if (mult === 1) rarityClass = 'rarity-common';
      else if (mult === 2) rarityClass = 'rarity-uncommon';
      else if (mult === 4) rarityClass = 'rarity-rare';
      else if (mult === 8) rarityClass = 'rarity-epic';
      else if (mult === 16) rarityClass = 'rarity-legendary';
      additionalInfo = `
        <div class="shop-info-row"><strong>Harvest Multiplier:</strong> x${plotData.multiplier} Crop yield</div>
        ${plotData.merge_cost ? `<div class="shop-info-row"><strong>Merge Cost:</strong> 🪙${plotData.merge_cost} + ${plotData.fert_req} Fertlizer</div>` : ''}
      `;
    }
  } else if (category === 'Lamps') {
    const lampData = LAMP_DATA[itemName];
    if (lampData) {
      imgPath = `images/lamps/${itemName.toLowerCase().replace(/ /g, '_')}.png`;
      fallbackEmoji = lampData.icon || '💡';
      const rarityIndex = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].indexOf(itemName);
      if (rarityIndex === 0) rarityClass = 'rarity-common';
      else if (rarityIndex === 1) rarityClass = 'rarity-uncommon';
      else if (rarityIndex === 2) rarityClass = 'rarity-rare';
      else if (rarityIndex === 3) rarityClass = 'rarity-epic';
      else if (rarityIndex === 4) rarityClass = 'rarity-legendary';
      additionalInfo = `
        <div class="shop-info-row"><strong>Time Reduction:</strong> -${lampData.time_reduce}%</div>
        <div class="shop-info-row"><strong>Rarity Chance:</strong> +${lampData.chance}%</div>
        <div class="shop-info-row"><strong>Plot Bonus:</strong> ${lampData.plot_bonus}x</div>
      `;
    }
  } else if (category === 'Animals') {
    // Find animal in ANIMAL_DATA
    let animalData = null;
    for (const [catName, animals] of Object.entries(ANIMAL_DATA)) {
      if (animals[itemName] && typeof animals[itemName] === 'object' && animals[itemName].grow_time !== undefined) {
        animalData = animals[itemName];
        break;
      }
    }
    if (animalData) {
      imgPath = `images/animals/${itemName.toLowerCase().replace(/ /g, '_')}.png`;
      fallbackEmoji = '🐾';
      const products = animalData.products;
      if (products === 1) rarityClass = 'rarity-common';
      else if (products === 2) rarityClass = 'rarity-uncommon';
      else if (products === 4) rarityClass = 'rarity-rare';
      else if (products === 8) rarityClass = 'rarity-epic';
      else if (products === 16) rarityClass = 'rarity-legendary';
      additionalInfo = `
        <div class="shop-info-row"><strong>Produces:</strong> ${animalData.products}x ${animalData.produces}</div>
        <div class="shop-info-row"><strong>Production Time:</strong> ${formatTime(animalData.grow_time)}</div>
      `;
    }
  } else if (category === 'Auto Harvesters') {
    imgPath = `images/robots/${itemName.toLowerCase().replace(/ /g, '_')}.png`;
    fallbackEmoji = '🤖';
    additionalInfo = `<div class="shop-info-row"><strong>Type:</strong> Automation</div>`;
  }
  
  cardEl.className = `card shop-card ${rarityClass}`;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const img = document.createElement('img');
  img.src = imgPath;
  img.alt = imgAlt;
  img.className = imgClass;
  img.onerror = () => {
    img.outerHTML = `<span style="font-size: 2rem;">${fallbackEmoji}</span>`;
  };
  header.appendChild(img);
  
  const name = document.createElement('span');
  name.textContent = itemName;
  name.className = 'ms-2';
  header.appendChild(name);
  
  cardEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'card-body';
  
  const categoryLabel = document.createElement('div');
  categoryLabel.className = 'text-muted small mb-2';
  categoryLabel.textContent = category;
  body.appendChild(categoryLabel);
  
  const priceSection = document.createElement('div');
  priceSection.className = 'mb-2';
  
  const priceCFB = itemData.price || 0;
  const priceUSDT = itemData.usdt || 0;
  
  if (priceCFB > 0) {
    priceSection.innerHTML = `
      <div class="shop-price-row">
        <strong>CFB:</strong> 
        <span style="color: var(--button-color); font-weight: 700;">🪙 ${nf.format(priceCFB)}</span>
      </div>
    `;
  }
  
  if (priceUSDT > 0) {
    priceSection.innerHTML += `
      <div class="shop-price-row">
        <strong>USDT:</strong> 
        <span style="color: var(--biopoints-color); font-weight: 700;">💵 $${priceUSDT}</span>
      </div>
    `;
  }
  
  if (priceCFB === 0 && priceUSDT === 0) {
    priceSection.innerHTML = `<div class="text-muted">Cannot be purchased</div>`;
  }
  
  body.appendChild(priceSection);
  
  if (additionalInfo) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'mt-2';
    infoDiv.innerHTML = additionalInfo;
    body.appendChild(infoDiv);
  }
  
  const stock = document.createElement('div');
  stock.className = 'mt-2';
  const isInStock = itemData.in_stock && (itemData.price > 0 || itemData.usdt > 0);
  stock.className += isInStock ? ' text-success' : ' text-danger';
  stock.innerHTML = isInStock ? '<strong>✅ Available in Game Shop</strong>' : '<strong>❌ Unavailable to purchase</strong>';
  body.appendChild(stock);
  
  cardEl.appendChild(body);
  card.appendChild(cardEl);
  
  return card;
}




// Toggle card view function
function toggleCardView(cardId, view) {
  const baseId = cardId.split('_view_')[0];

  // Check if the same view is already active → toggle back to default
  const activeView = [...flippedCards].find(id => id.startsWith(baseId + '_view_'));
  const isSameView = activeView && activeView.endsWith('_view_' + view);

  // Clear all existing view states for this card
  for (const id of [...flippedCards]) {
    if (id.startsWith(baseId + '_view_') || id === baseId) {
      flippedCards.delete(id);
    }
  }

  // If not same view, activate new one
  if (!isSameView && view !== 'default') {
    flippedCards.add(`${baseId}_view_${view}`);
  }

  // Refresh card lists
  const type = baseId.split('_')[0];
  switch (type) {
    case 'seed':   updateSeedList(); break;
    case 'plot':   updatePlotList(); break;
    case 'lamp':   updateLampList(); break;
    case 'animal': updateAnimalList(); break;
  }

  autosave();
}

function createRarityRow(seed, rarity) {
  const data = SEED_DATA[seed][rarity];
  const bp = data.bio_points;
  const bpMin = (bp / data.grow_time).toFixed(1);
  const qty = seedQuantities[`${seed}_${rarity}`] || 0;
  const key = `${seed}_${rarity}`;
  
  const row = document.createElement('div');
  row.className = 'rarity-row';
  
  const label = document.createElement('span');
  label.className = `rarity-label text-${rarity.toLowerCase()}`;
  label.textContent = rarity;
  row.appendChild(label);
  
  const bpDisplay = document.createElement('div');
  bpDisplay.className = 'bp-display';
  bpDisplay.innerHTML = `<span class="bp-value">🍀${bp}</span> <span class="bp-rate">${bpMin}/m</span>`;
  row.appendChild(bpDisplay);
  
  const controls = document.createElement('div');
  controls.className = 'qty-controls';
  
  const minusBtn = document.createElement('button');
  minusBtn.className = 'qty-btn';
  minusBtn.textContent = '-';
  minusBtn.onclick = () => {
    seedQuantities[key] = Math.max(0, (seedQuantities[key] || 0) - 1);
    updateSeedList();
    updateTotals();
    autosave();
  };
  controls.appendChild(minusBtn);
  
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'qty-input';
  input.value = qty;
  input.min = 0;
  input.oninput = () => {
    seedQuantities[key] = Math.max(0, parseInt(input.value) || 0);
    input.value = seedQuantities[key];
    updateSeedList();
    updateTotals();
    autosave();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
  controls.appendChild(input);
  
  const plusBtn = document.createElement('button');
  plusBtn.className = 'qty-btn';
  plusBtn.textContent = '+';
  plusBtn.onclick = () => {
    seedQuantities[key] = (seedQuantities[key] || 0) + 1;
    updateSeedList();
    updateTotals();
    autosave();
  };
  controls.appendChild(plusBtn);
  
  row.appendChild(controls);
  
  return row;
}


// ==================== LIST UPDATES ====================

function updateSeedList() {
  const list = document.getElementById('seed-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  let seeds = Object.keys(SEED_DATA)
  .filter(seed => {
    const hasQuantity = RARITIES.some(r => seedQuantities[`${seed}_${r}`] > 0);
    const passesCompactFilter = !showCompactMode || hasQuantity;
    const passesSeasonalFilter = showSeasonal || !seasonalFlags[seed] || hasQuantity;
    const passesCompareFilter = !showCompareOnly || compareMode[seed];
    return passesCompactFilter && passesSeasonalFilter && passesCompareFilter;
  })
    .map(s => ({
      name: s,
      grow_time: SEED_DATA[s].Common.grow_time,
      // Correctly calculate BP/m for each rarity using its own grow time
      common_bp: SEED_DATA[s].Common.bio_points / SEED_DATA[s].Common.grow_time,
      uncommon_bp: SEED_DATA[s].Uncommon.bio_points / SEED_DATA[s].Uncommon.grow_time,
      rare_bp: SEED_DATA[s].Rare.bio_points / SEED_DATA[s].Rare.grow_time,
      epic_bp: SEED_DATA[s].Epic.bio_points / SEED_DATA[s].Epic.grow_time,
      legendary_bp: SEED_DATA[s].Legendary.bio_points / SEED_DATA[s].Legendary.grow_time
    }));
  
  seeds.sort((a, b) => {
    const compare = b[sortVar] - a[sortVar] || a.grow_time - b.grow_time;
    return sortDescending ? -compare : compare;
  });
  
  seeds.forEach(s => list.appendChild(createSeedCard(s.name)));
}

function updatePlotList() {
  const list = document.getElementById('plot-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  Object.keys(PLOT_DATA)
    .sort((a, b) => PLOT_DATA[a].multiplier - PLOT_DATA[b].multiplier)
    .forEach(plot => list.appendChild(PlotCard(plot)));
}

function updateLampList() {
  const list = document.getElementById('lamp-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  Object.keys(LAMP_DATA).forEach(lamp => list.appendChild(LampCard(lamp)));
}

function updateAnimalList() {
  const list = document.getElementById('animal-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!ANIMAL_DATA || Object.keys(ANIMAL_DATA).length === 0) {
    list.innerHTML = '<div class="col-12"><div class="alert alert-info">No animal data available</div></div>';
    return;
  }
  
  // Create sections for each category
  Object.entries(ANIMAL_DATA).forEach(([category, animals]) => {
    if (category === 'icon' || typeof animals !== 'object') return;
    
    const section = document.createElement('div');
    section.className = 'col-12 mb-4';
    
    const header = document.createElement('h5');
    header.className = 'section-header';
    header.innerHTML = `${animals.icon || '🐾'} ${category}`;
    section.appendChild(header);
    
    const row = document.createElement('div');
    row.className = 'row';
    
    Object.entries(animals).forEach(([animal, data]) => {
      if (animal === 'icon' || animal === 'seasonal' || typeof data !== 'object' || !data.grow_time) return;
      row.appendChild(AnimalCard(animal, data));
    });
    
    section.appendChild(row);
    list.appendChild(section);
  });
}

function updateShopList() {
  const list = document.getElementById('shop-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  // Create filter buttons
  const filterSection = document.createElement('div');
  filterSection.className = 'col-12 mb-3';
  filterSection.innerHTML = `
    <div class="card">
      <div class="card-body">
        <div class="shop-filters-container">
          <div class="filter-group">
            <label class="filter-label">Category:</label>
            <div class="filter-buttons">
              <button class="menu-toggle-btn ${shopFilter === 'all' ? 'active' : ''}" onclick="filterShop('all')">All</button>
              <button class="menu-toggle-btn ${shopFilter === 'Seeds' ? 'active' : ''}" onclick="filterShop('Seeds')">🌱 Seeds</button>
              <button class="menu-toggle-btn ${shopFilter === 'Plots' ? 'active' : ''}" onclick="filterShop('Plots')">📦 Plots</button>
              <button class="menu-toggle-btn ${shopFilter === 'Lamps' ? 'active' : ''}" onclick="filterShop('Lamps')">💡 Lamps</button>
              <button class="menu-toggle-btn ${shopFilter === 'Animals' ? 'active' : ''}" onclick="filterShop('Animals')">🐮 Animals</button>
              <button class="menu-toggle-btn ${shopFilter === 'Auto Harvesters' ? 'active' : ''}" onclick="filterShop('Auto Harvesters')">🤖 Robots</button>
            </div>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Filter:</label>
            <div class="filter-buttons">
              <button class="menu-toggle-btn ${shopShowInStockOnly ? 'active' : ''}" onclick="toggleShopInStockOnly()" title="Show only in-stock items">
                ${shopShowInStockOnly ? '✅' : '📦'} Available In Shop
              </button>
            </div>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Sort:</label>
            <div class="filter-buttons">
              <select class="form-select form-select-sm shop-sort-select" id="shop-sort" onchange="sortShop(this.value)">
                <option value="name" ${shopSort === 'name' ? 'selected' : ''}>Name</option>
                <option value="price" ${shopSort === 'price' ? 'selected' : ''}>Price</option>
                <option value="rarity" ${shopSort === 'rarity' ? 'selected' : ''}>Rarity</option>
              </select>
              <button class="menu-toggle-btn" onclick="toggleShopSortDirection()" title="Toggle sort direction">
                ${shopSortDesc ? '⬇️' : '⬆️'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  list.appendChild(filterSection);
  
  if (!SHOP_DATA || Object.keys(SHOP_DATA).length === 0) {
    list.innerHTML += '<div class="col-12"><div class="alert alert-info">No shop data available</div></div>';
    return;
  }
  
  // Collect and filter items
  let items = [];
  Object.entries(SHOP_DATA).forEach(([category, categoryItems]) => {
    if (shopFilter === 'all' || shopFilter === category) {
      Object.entries(categoryItems).forEach(([name, data]) => {
        // Apply in-stock filter
        if (!shopShowInStockOnly || (data.in_stock && data.price || data.usdt > 0)) {
          items.push({ category, name, data });
        }
      });
    }
  });
  
  // Sort items
  items = sortShopItems(items);
  
  // Render items
  items.forEach(({ category, name, data }) => {
    list.appendChild(ShopCard(category, name, data));
  });
}


function filterShop(category) {
  shopFilter = category;
  updateShopList();
}

function sortShop(sortBy) {
  shopSort = sortBy;
  updateShopList();
}

function toggleShopSortDirection() {
  shopSortDesc = !shopSortDesc;
  updateShopList();
}

function sortShopItems(items) {
  items.sort((a, b) => {
    let compare = 0;
    
    if (shopSort === 'name') {
      compare = a.name.localeCompare(b.name);
    } else if (shopSort === 'price') {
      compare = (a.data.price || 0) - (b.data.price || 0);
    } else if (shopSort === 'rarity') {
      // Attempt to determine rarity from name or category
      const rarityOrder = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
      const aRarity = RARITIES.find(r => a.name.includes(r)) || 'Common';
      const bRarity = RARITIES.find(r => b.name.includes(r)) || 'Common';
      compare = rarityOrder[aRarity] - rarityOrder[bRarity];
    }
    
    return shopSortDesc ? -compare : compare;
  });
  
  return items;
}

function toggleShopInStockOnly() {
  shopShowInStockOnly = !shopShowInStockOnly;
  updateShopList();
}

// Make functions globally accessible
window.filterShop = filterShop;
window.sortShop = sortShop;
window.toggleShopSortDirection = toggleShopSortDirection;
window.toggleShopInStockOnly = toggleShopInStockOnly;
window.copyToClipboard = copyToClipboard;
window.switchAnimalView = switchAnimalView;
window.toggleSeedExclusion = toggleSeedExclusion;

// ==================== TOTALS & STRATEGY ====================

function calculateTotalValue() {
  let totalValue = 0;
  
  // Seeds - calculate based on merge equivalents (2^rarity_index * base_price)
  Object.entries(seedQuantities).forEach(([key, qty]) => {
    if (qty > 0) {
      const parts = key.split('_');
      const rarity = parts[parts.length - 1];
      const seedName = parts.slice(0, -1).join('_');
      const seed = SEED_DATA[seedName];
      
      if (seed && seed.price) {
        const rarityIndex = RARITIES.indexOf(rarity);
        const commonEquivalent = Math.pow(2, rarityIndex); // 1, 2, 4, 8, 16
        totalValue += seed.price * qty * commonEquivalent;
      }
    }
  });
  
  // Plots - based on multiplier as merge equivalent
  Object.entries(plotQuantities).forEach(([plot, qty]) => {
    if (qty > 0 && PLOT_DATA[plot]) {
      const mult = PLOT_DATA[plot].multiplier;
      // Find base plot price (Cardboard = multiplier 1)
      const basePlot = Object.values(PLOT_DATA).find(p => p.multiplier === 1);
      if (basePlot && basePlot.price) {
        totalValue += basePlot.price * qty * mult;
      }
    }
  });
  
  // Lamps - based on rarity name matching
  Object.entries(lampQuantities).forEach(([lamp, qty]) => {
    if (qty > 0 && LAMP_DATA[lamp]) {
      const rarityIndex = RARITIES.findIndex(r => r === lamp);
      if (rarityIndex !== -1) {
        const baseLamp = LAMP_DATA['Common'];
        if (baseLamp && baseLamp.price) {
          const commonEquivalent = Math.pow(2, rarityIndex);
          totalValue += baseLamp.price * qty * commonEquivalent;
        }
      }
    }
  });
  
  // Animals - based on products output (merge equivalent)
  Object.entries(animalQuantities).forEach(([animal, qty]) => {
    if (qty > 0) {
      for (const category of Object.values(ANIMAL_DATA)) {
        if (category[animal] && typeof category[animal] === 'object') {
          const products = category[animal].products;
          // Find base animal in same category (products = 1)
          const baseAnimal = Object.values(category).find(
            a => typeof a === 'object' && a.products === 1
          );
          if (baseAnimal && baseAnimal.price) {
            totalValue += baseAnimal.price * qty * products;
          }
          break;
        }
      }
    }
  });
  
  return totalValue;
}

function calculateLampBonus() {
  // Calculate total time reduction from lamps
  // Lamps reduce time by their percentage, applied multiplicatively
  let timeMultiplier = 1.0;
  
  Object.entries(lampQuantities).forEach(([lamp, qty]) => {
    if (qty > 0 && LAMP_DATA[lamp]) {
      const reduction = LAMP_DATA[lamp].time_reduce / 100;
      // Each lamp of same type adds to reduction
      const totalReduction = reduction * qty;
      timeMultiplier *= (1 - Math.min(totalReduction, 0.9)); // Cap at 90% reduction
    }
  });
  
  return timeMultiplier;
}

function updateTotals() {
  const totalSeeds = Object.values(seedQuantities).reduce((a, b) => a + b, 0);
  const totalPlots = Object.values(plotQuantities).reduce((a, b) => a + b, 0);
  const totalLamps = Object.values(lampQuantities).reduce((a, b) => a + b, 0);
  const totalAnimals = Object.values(animalQuantities).reduce((a, b) => a + b, 0);
  const totalValue = calculateTotalValue();
  
  let totalBpPerMin = 0;
  const lampBonus = calculateLampBonus();
  
  Object.keys(SEED_DATA).forEach(seed => {
    RARITIES.forEach(rarity => {
      const qty = seedQuantities[`${seed}_${rarity}`] || 0;
      if (qty > 0) {
        const data = SEED_DATA[seed][rarity];
        const adjustedTime = data.grow_time * lampBonus;
        totalBpPerMin += (data.bio_points / adjustedTime) * qty;
      }
    });
  });
  
  // Update navbar stats
  document.getElementById('nav-total-seeds').textContent = totalSeeds;
  document.getElementById('nav-total-plots').textContent = totalPlots;
  document.getElementById('nav-total-lamps').textContent = totalLamps;
  document.getElementById('nav-total-animals').textContent = totalAnimals;
  document.getElementById('nav-total-value').textContent = `${nf.format(totalValue)}`;
  updateStrategy();
}

function calculateLampAssignments(seeds, plots, lamps) {
  // This function determines optimal lamp placement
  // Each lamp can affect 1-2 adjacent plots
  
  const lampCount = Object.values(lampQuantities).reduce((a, b) => a + b, 0);
  if (lampCount === 0) return [];
  
  const assignments = [];
  let availableLamps = [];
  
  // Collect all lamps
  Object.entries(lampQuantities).forEach(([lampType, qty]) => {
    for (let i = 0; i < qty; i++) {
      availableLamps.push({
        type: lampType,
        reduction: LAMP_DATA[lampType].time_reduce / 100
      });
    }
  });
  
  // Sort lamps by effectiveness (highest reduction first)
  availableLamps.sort((a, b) => b.reduction - a.reduction);
  
  // Sort seeds by priority (depends on strategy)
  const sortedSeeds = [...seeds];
  if (strategyVar === 'bp_per_minute') {
    sortedSeeds.sort((a, b) => b.bp_min - a.bp_min);
  } else {
    sortedSeeds.sort((a, b) => b.bp - a.bp);
  }
  
  // Assign lamps to top seeds
  // Each lamp can affect 1-2 plots (we'll do 2 for efficiency)
  let seedIndex = 0;
  for (const lamp of availableLamps) {
    const affectedSeeds = [];
    
    // Assign to 2 adjacent plots if available
    for (let i = 0; i < 2 && seedIndex < sortedSeeds.length; i++) {
      affectedSeeds.push(seedIndex);
      seedIndex++;
    }
    
    if (affectedSeeds.length > 0) {
      assignments.push({
        lamp: lamp.type,
        reduction: lamp.reduction,
        affectedPlots: affectedSeeds
      });
    }
  }
  
  return assignments;
}

function renderStrategy(assignments, unused, totalBp, totalBpMin, maxTime, usedPlots, totalSeeds, totalPlots, lampBonus) {
  const summary = document.getElementById('strategy-summary');
  const assignCont = document.getElementById('assignments-container');
  const unusedCont = document.getElementById('unused-container');
  const excludedCont = document.getElementById('excluded-container');
  
  if (!summary || !assignCont || !unusedCont || !excludedCont) return;
  
  const strategyName = strategyVar === 'bp_per_minute' ? 'Max BP/min (Active Play)' : 'Max BP/batch (Idle Play)';
  const strategyDesc = strategyVar === 'bp_per_minute' 
    ? 'Assumes continuous replanting. Shorter seeds will be replanted multiple times during the longest seed\'s growth period.'
    : 'One-time harvest. Plant all seeds once and harvest when complete. Best for idle/away play.';
  
  summary.innerHTML = `
    <br>
    <div class="strategy-header">
      <h4>📊 ${strategyName}</h4>
      <p class="small text-muted mb-3">${strategyDesc}</p>
      <div class="strategy-stat">
        <span class="stat-label">Plots Used</span>
        <span class="stat-value">${usedPlots} / ${totalPlots}</span>
      </div>
      <div class="strategy-stat">
        <span class="stat-label">Seeds Used</span>
        <span class="stat-value">${usedPlots} / ${totalSeeds}</span>
      </div>
      <div class="strategy-stat">
        <span class="stat-label">Total Bio Points</span>
        <span class="stat-value bp-highlight">🍀${nf.format(totalBp)} BP</span>
      </div>
      <div class="strategy-stat">
        <span class="stat-label">Bio Points Per Minute</span>
        <span class="stat-value bp-highlight">🍀${totalBpMin.toFixed(1)}/m</span>
      </div>
      ${strategyVar === 'bp_per_batch' && assignments.length ? `
      <div class="strategy-stat">
        <span class="stat-label">Batch Completion Time</span>
        <span class="stat-value">${formatTime(Math.ceil(maxTime))}</span>
      </div>` : ''}
      ${strategyVar === 'bp_per_minute' && assignments.length ? `
      <div class="strategy-stat">
        <span class="stat-label">Cycle Time (Longest Seed)</span>
        <span class="stat-value">${formatTime(Math.ceil(maxTime))}</span>
      </div>` : ''}
    </div>
  `;
  
  if (assignments.length) {
    assignCont.innerHTML = `
      <br>
      <h5 class="section-header">🌟 Optimal Assignments</h5>
      <div class="assignments-grid">
        ${assignments.map(a => {
          const hasLamp = a.lampBonus && a.lampBonus < 1;
          const lampReduction = hasLamp ? ((1 - a.lampBonus) * 100).toFixed(0) : 0;
          const cycles = strategyVar === 'bp_per_minute' ? Math.floor(maxTime / a.adjustedTime) : 1;
          
          return `
          <div class="assignment-card rarity-${a.rarity.toLowerCase()} ${hasLamp ? 'has-lamp-bonus' : ''}" style="position: relative;">
            <div class="card-controls-overlay" style="opacity: 1; background: transparent; box-shadow: none;">
              <button class="control-btn" title="Exclude Seed from Strategy Plan"
                      onclick="toggleSeedExclusion('${a.id}')">
                🚫
              </button>
            </div>
            <div class="assignment-title text-${a.rarity.toLowerCase()}">${a.seed}</div>
            <div class="text-muted small mb-2">${a.rarity}</div>
            <div class="assignment-images">
              <div class="assignment-image-wrapper">
                <img src="images/seeds/${a.rarity.toLowerCase()}/${a.seed.toLowerCase().replace(/ /g, '_')}.png" 
                     alt="${a.seed}" 
                     onerror="this.outerHTML='<span style=\\'font-size:3rem\\'>${a.seedIcon}</span>'">
              </div>
              <span class="assignment-arrow">➜</span>
              <div class="assignment-image-wrapper">
                <img src="images/plots/${a.plot.toLowerCase().replace(/ /g, '_')}.png" 
                     alt="${a.plot}" 
                     onerror="this.outerHTML='<span style=\\'font-size:3rem\\'>${a.plotIcon}</span>'">
              </div>
            </div>
            <div class="fw-bold text-muted">${a.plot} Plot</div>
            <div class="assignment-stats">
              ${strategyVar === 'bp_per_minute' && cycles > 1 ? `
              <div class="assignment-stat-row">
                <strong>Cycles:</strong>
                <span class="text-success">${cycles}x plantings</span>
              </div>
              <div class="assignment-stat-row">
                <strong>Total BP:</strong>
                <span class="bp-highlight">🍀${nf.format(a.bp * cycles)}</span>
              </div>
              ` : `
              <div class="assignment-stat-row">
                <strong>BP:</strong>
                <span class="bp-highlight">🍀${nf.format(a.bp)}</span>
              </div>
              `}
              <div class="assignment-stat-row">
                <strong>BP/m:</strong>
                <span class="bp-highlight">🍀${a.bpMin.toFixed(1)}</span>
              </div>
              <div class="assignment-stat-row">
                <strong>Time:</strong>
                <span>${formatTime(Math.ceil(a.adjustedTime))}</span>
              </div>
              ${hasLamp ? `
              <div class="assignment-stat-row lamp-bonus-row">
                <strong>💡 Lamp bonus:</strong>
                <span class="text-success">-${lampReduction}%</span>
              </div>
              <div class="assignment-stat-row">
                <strong>Base time:</strong>
                <span class="text-muted small">${formatTime(a.time)}</span>
              </div>
              ` : ''}
            </div>
          </div>
        `}).join('')}
      </div>
    `;
  } else {
    assignCont.innerHTML = '<div class="alert alert-info">Add seeds and plots to see optimal assignments!</div>';
  }
  
  if (unused.length) {
    unusedCont.innerHTML = `
      <br><br>
      <h5 class="section-header">📦 Unused Seeds</h5>
      <div class="assignments-grid">
        ${unused.map((s, idx) => `
          <div class="assignment-card" style="position: relative; opacity: ${excludedSeeds.has(s.id) ? '0.5' : '1'};">
            <div class="card-controls-overlay" style="opacity: 1; background: transparent; box-shadow: none;">
              <button class="control-btn" title="Exclude Seed from Strategy Plan"
                      onclick="toggleSeedExclusion('${s.id}')">
                🚫
              </button>
            </div>
            <div class="assignment-title text-${s.rarity.toLowerCase()}">${s.name}</div>
            <div class="text-muted small mb-2">${s.rarity}</div>
            <div style="font-size: 3.5rem; margin: 1rem 0;">
              <img src="images/seeds/${s.rarity.toLowerCase()}/${s.name.toLowerCase().replace(/ /g, '_')}.png" 
                   alt="${s.name}" 
                   style="width: 80px; height: 80px; border-radius: 8px;"
                   onerror="this.outerHTML='<span>${s.icon}</span>'">
            </div>
            <div class="assignment-stats">
              <div class="assignment-stat-row">
                <strong>BP:</strong>
                <span class="bp-highlight">🍀${s.bp}</span>
              </div>
              <div class="assignment-stat-row">
                <strong>BP/m:</strong>
                <span class="bp-highlight">🍀${s.bp_min.toFixed(1)}</span>
              </div>
              <div class="assignment-stat-row">
                <strong>Time:</strong>
                <span>${formatTime(Math.ceil(s.adjustedTime))}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    unusedCont.innerHTML = '';
  }

  // Render Excluded Seeds
  if (excludedSeeds.size > 0) {
    const excludedItemsHTML = Array.from(excludedSeeds).map(seedId => {
      const [seedName, rarity] = seedId.split('_');
      const seedData = SEED_DATA[seedName];
      if (!seedData) return '';

      return `
        <div class="assignment-card excluded-card">
          <div class="card-controls-overlay">
            <button class="control-btn active" title="Include in strategy"
                    onclick="toggleSeedExclusion('${seedId}')">
              ➕
            </button>
          </div>
          <div class="assignment-title text-${rarity.toLowerCase()}">${seedName}</div>
          <div class="text-muted small mb-2">${rarity}</div>
          <div style="font-size: 3.5rem; margin: 1rem 0;">
            <img src="images/seeds/${rarity.toLowerCase()}/${seedName.toLowerCase().replace(/ /g, '_')}.png" 
                 alt="${seedName}" 
                 style="width: 80px; height: 80px; border-radius: 8px;"
                 onerror="this.outerHTML='<span>${seedData.icon || '🌱'}</span>'">
          </div>
        </div>
      `;
    }).join('');

    excludedCont.innerHTML = `
      <br><br>
      <h5 class="section-header">🚫 Excluded Seeds</h5>
      <div class="assignments-grid">${excludedItemsHTML}</div>
    `;
  } else {
    excludedCont.innerHTML = '';
  }
}

function updateStrategy() {
  const seeds = [];
  
  // Create a unique list of all owned seeds with an ID
  Object.keys(SEED_DATA).forEach(name => {
    RARITIES.forEach(rarity => {
      const qty = seedQuantities[`${name}_${rarity}`];
      if (qty > 0) {
        const data = SEED_DATA[name][rarity];
        for (let i = 0; i < qty; i++) {
          seeds.push({
            id: `${name}_${rarity}_${i}`, // Unique ID for each seed instance
            name,
            rarity,
            bp: data.bio_points,
            time: data.grow_time,
            bp_min: data.bio_points / data.grow_time,
            icon: SEED_DATA[name].icon || '🌱'
          });
        }
      }
    });
  });
  
  // Filter out the seeds that are marked for exclusion
  const availableSeeds = seeds.filter(s => !excludedSeeds.has(s.id));

  const plots = [];
  Object.keys(PLOT_DATA).forEach(plot => {
    const qty = plotQuantities[plot];
    for (let i = 0; i < qty; i++) {
      plots.push({
        type: plot,
        mult: PLOT_DATA[plot].multiplier,
        icon: PLOT_DATA[plot].icon || '📦'
      });
    }
  });
  
  plots.sort((a, b) => b.mult - a.mult);
  
  if (strategyVar === 'bp_per_minute') {
    availableSeeds.sort((a, b) => b.bp_min - a.bp_min);
  } else {
    availableSeeds.sort((a, b) => b.bp - a.bp || a.time - b.time);
  }
  
  // Calculate lamp assignments
  const lampAssignments = calculateLampAssignments(availableSeeds, plots);
  
  const assignments = [];
  const unused = [];
  let totalBp = 0;
  let totalBpMin = 0;
  let maxTime = 0;
  const used = Math.min(availableSeeds.length, plots.length);
  
  for (let i = 0; i < used; i++) {
    const s = availableSeeds[i];
    const p = plots[i];
    
    // Check if this plot has a lamp assigned
    let lampBonus = 1.0;
    let assignedLamp = null;
    
    for (const lampAssignment of lampAssignments) {
      if (lampAssignment.affectedPlots.includes(i)) {
        lampBonus = 1 - lampAssignment.reduction;
        assignedLamp = lampAssignment.lamp;
        break;
      }
    }
    
    const adjustedTime = s.time * lampBonus;
    const bp = s.bp * p.mult;
    const bpMin = bp / adjustedTime;
    
    assignments.push({
      id: s.id,
      seed: s.name,
      rarity: s.rarity,
      plot: p.type,
      bp,
      bpMin,
      time: s.time,
      adjustedTime: adjustedTime,
      lampBonus: lampBonus,
      assignedLamp: assignedLamp,
      seedIcon: s.icon,
      plotIcon: p.icon
    });
    
    totalBp += bp;
    totalBpMin += bpMin;
    maxTime = Math.max(maxTime, adjustedTime);
  }
  
  // For BP/min strategy, calculate replanting
  if (strategyVar === 'bp_per_minute' && assignments.length > 0) {
    // Find the longest seed time
    const longestTime = maxTime;
    
    // Recalculate BP considering replanting shorter seeds
    totalBp = 0;
    totalBpMin = 0;
    
    assignments.forEach(a => {
      const cycles = Math.floor(longestTime / a.adjustedTime);
      const totalBpForSeed = a.bp * cycles;
      totalBp += totalBpForSeed;
      totalBpMin += a.bpMin;
    });
  }
  
  availableSeeds.slice(used).forEach(s => {
    unused.push({
      ...s,
      adjustedTime: s.time,
      qty: 1
    });
  });
  
  renderStrategy(assignments, unused, totalBp, totalBpMin, maxTime, used, availableSeeds.length, plots.length, 1.0);
}

function toggleSeedExclusion(seedId) {
  if (excludedSeeds.has(seedId)) {
    excludedSeeds.delete(seedId);
  } else {
    excludedSeeds.add(seedId);
  }
  updateTotals();
  autosave();
}



// ==================== UI HELPERS ====================

function updateAllLists() {
  updateSeedList();
  updatePlotList();
  updateLampList();
  updateAnimalList();
  updateShopList();
}

function updateUIControls() {
  document.getElementById('bp_per_minute').checked = strategyVar === 'bp_per_minute';
  document.getElementById('bp_per_batch').checked = strategyVar === 'bp_per_batch';
  document.getElementById('sort-select').value = sortVar;
  
  const seasonalToggle = document.getElementById('seasonal-toggle');
  if (seasonalToggle) {
    seasonalToggle.textContent = showSeasonal ? '⭐ Seasonal' : '☆ Seasonal';
    seasonalToggle.classList.toggle('active', showSeasonal);
  }
  
  const compareToggle = document.getElementById('compare-toggle');
  if (compareToggle) {
    compareToggle.textContent = '⚖️ Compare';
    compareToggle.classList.toggle('active', showCompareOnly);
  }

  const compactToggle = document.getElementById('compact-toggle');
  if (compactToggle) {
    compactToggle.textContent = '📦 Compact';
    compactToggle.classList.toggle('active', showCompactMode);
  }
}

function formatTime(mins) {
  const rounded = Math.ceil(mins);
  if (rounded < 60) {
    return `${rounded}m`;
  }

  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function autosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    persistInventory();
  }, 1000);
}

function showToast(msg, type = 'info', timeout = 2000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), timeout);
}

function copyToClipboard(elementId) {
  const input = document.getElementById(elementId);
  input.select();
  input.setSelectionRange(0, 99999); // For mobile
  
  try {
    document.execCommand('copy');
    showToast('Address copied to clipboard!', 'success');
  } catch (err) {
    showToast('Failed to copy address', 'danger');
  }
}

function scrollToFaqSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==================== SAVE MODAL ====================

function showSaveModal() {
  const modal = new bootstrap.Modal(document.getElementById('saveModal'));
  const input = document.getElementById('profile-name-input');
  input.value = farmName;
  input.select();
  modal.show();
}

function confirmSave() {
  const input = document.getElementById('profile-name-input');
  const newName = input.value.trim();
  
  if (!newName) {
    showToast('Please enter a profile name', 'warning');
    return;
  }
  
  // Remove old profile if name changed
  if (newName !== farmName) {
    const oldKey = `farm_${farmName.replace(/ /g, '_')}`;
    localStorage.removeItem(oldKey);
  }
  
  farmName = newName;
  persistInventory();
  updateFarmSelect();
  
  const modal = bootstrap.Modal.getInstance(document.getElementById('saveModal'));
  modal.hide();
  
  showToast(`Profile "${farmName}" saved successfully`, 'success');
}



// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Farm profile selector
  const farmSelect = document.getElementById('farm-select');
  if (farmSelect) {
    farmSelect.addEventListener('change', (e) => {
      farmName = e.target.value;
      loadInventory();
    });
  }
  
  // Save button - opens modal
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', showSaveModal);
  }
  
  // Confirm save in modal
  const confirmSaveBtn = document.getElementById('confirm-save-btn');
  if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener('click', confirmSave);
  }
  
  // Profile name input - save on Enter
  const profileInput = document.getElementById('profile-name-input');
  if (profileInput) {
    profileInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmSave();
      }
    });
  }
  
  // Load button
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', loadInventory);
  }
  
  // Delete button
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteProfile);
  }
  
  // Sort selector
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortVar = e.target.value;
      updateSeedList();
      autosave();
    });
  }
  
  // Compact toggle
  const compactToggle = document.getElementById('compact-toggle');
  if (compactToggle) {
    compactToggle.addEventListener('click', () => {
      showCompactMode = !showCompactMode;
      updateUIControls();
      updateSeedList();
      autosave();
    });
  }

  // Compare toggle
  const compareToggle = document.getElementById('compare-toggle');
  if (compareToggle) {
    compareToggle.addEventListener('click', () => {
      showCompareOnly = !showCompareOnly;
      updateUIControls();
      updateSeedList();
      autosave();
    });
  }

  // Clear compare button
  const clearCompareBtn = document.getElementById('clear-compare-btn');
  if (clearCompareBtn) {
    clearCompareBtn.addEventListener('click', () => {
      // Clear all compare selections
      Object.keys(compareMode).forEach(key => {
        compareMode[key] = false;
      });
      
      // If compare-only filter is active, turn it off
      if (showCompareOnly) {
        showCompareOnly = false;
      }
      
      updateUIControls();
      updateSeedList();
      autosave();
      showToast('All compare selections cleared', 'info', 1500);
    });
  }

  // Seasonal toggle
  const seasonalToggle = document.getElementById('seasonal-toggle');
  if (seasonalToggle) {
    seasonalToggle.addEventListener('click', () => {
      showSeasonal = !showSeasonal;
      updateUIControls();
      updateSeedList();
      autosave();
    });
  }

  // Sort direction button - FIX
  const sortDirectionBtn = document.getElementById('sort-direction-btn');
  if (sortDirectionBtn) {
    sortDirectionBtn.addEventListener('click', () => {
      sortDescending = !sortDescending;
      sortDirectionBtn.textContent = sortDescending ? '⬇️' : '⬆️';
      sortDirectionBtn.classList.toggle('desc', sortDescending);
      updateSeedList();
      autosave();
    });
  }
  
  // Strategy radio buttons
  const bpPerMinuteBtn = document.getElementById('bp_per_minute');
  if (bpPerMinuteBtn) {
    bpPerMinuteBtn.addEventListener('click', () => {
      strategyVar = 'bp_per_minute';
      document.querySelectorAll('#strategy-tab .menu-toggle-btn').forEach(btn => btn.classList.remove('active'));
      bpPerMinuteBtn.classList.add('active');
      updateTotals();
      autosave();
    });
  }

  const bpPerBatchBtn = document.getElementById('bp_per_batch');
  if (bpPerBatchBtn) {
    bpPerBatchBtn.addEventListener('click', () => {
      strategyVar = 'bp_per_batch';
      document.querySelectorAll('#strategy-tab .menu-toggle-btn').forEach(btn => btn.classList.remove('active'));
      bpPerBatchBtn.classList.add('active');
      updateTotals();
      autosave();
    });
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      showSaveModal();
    }
  });
}



// ==================== INITIALIZATION ====================

async function initialize() {
  console.log('Initializing Chainers Plot Planner...');
  
  await loadAllData();
  initializeQuantities();
  loadSettings();
  updateFarmSelect();
  loadInventory();
  setupEventListeners();
  
  // Set initial strategy button state
  const defaultBtn = document.getElementById(strategyVar === 'bp_per_minute' ? 'bp_per_minute' : 'bp_per_batch');
  if (defaultBtn) {
    defaultBtn.classList.add('active');
  }
  
  console.log('Chainers Plot Planner initialized successfully');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}



// ==================== STORAGE & PROFILES ====================

function persistInventory() {
  const key = `farm_${farmName.replace(/ /g, '_')}`;
  const data = {
    seeds: seedQuantities,
    plots: plotQuantities,
    lamps: lampQuantities,
    animals: animalQuantities,
    seasonal_flags: seasonalFlags,
    sort_var: sortVar,
    show_compare_only: showCompareOnly,
    show_compact_mode: showCompactMode,
    strategy_var: strategyVar,
    excluded_seeds: Array.from(excludedSeeds),
    compare_mode: compareMode
  };
  localStorage.setItem(key, JSON.stringify(data));
  saveSettings();
}

function loadInventory() {
  const key = `farm_${farmName.replace(/ /g, '_')}`;
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  
  initializeQuantities();
  
  if (data.seeds) Object.assign(seedQuantities, data.seeds);
  if (data.plots) Object.assign(plotQuantities, data.plots);
  if (data.lamps) Object.assign(lampQuantities, data.lamps);
  if (data.animals) Object.assign(animalQuantities, data.animals);
  if (data.compare_mode) compareMode = data.compare_mode;
  if (data.excluded_seeds) excludedSeeds = new Set(data.excluded_seeds);
  if (data.lamp_assignments) lampAssignments = data.lamp_assignments;
  
  strategyVar = data.strategy_var || 'bp_per_batch';
  showCompareOnly = data.show_compare_only ?? false;
  showCompactMode = data.show_compact_mode ?? false;
  sortVar = data.sort_var || 'grow_time';
  
  flippedCards.clear();
  
  updateUIControls();
  updateAllLists();
  updateTotals();
  
  showToast('Profile loaded', 'info');
}

function saveSettings() {
  localStorage.setItem('settings', JSON.stringify({
    last_farm: farmName,
    sort_var: sortVar,
    strategy_var: strategyVar
  }));
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('settings') || '{}');
  farmName = settings.last_farm || 'Default';
  sortVar = settings.sort_var || 'grow_time';
  strategyVar = settings.strategy_var || 'bp_per_batch';
}

function updateFarmSelect() {
  const select = document.getElementById('farm-select');
  if (!select) return;
  
  select.innerHTML = '';
  
  const farms = ['Default', ...Object.keys(localStorage)
    .filter(k => k.startsWith('farm_'))
    .map(k => k.replace('farm_', '').replace(/_/g, ' '))
    .sort()];
  
  farms.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === farmName) opt.selected = true;
    select.appendChild(opt);
  });
}



// ==================== SAVE / DATA ====================

// Export profile data as downloadable JSON
function exportProfile() {
  const key = `farm_${farmName.replace(/ /g, '_')}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    showToast('No profile data to export', 'warning');
    return;
  }
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chainers_${farmName.replace(/ /g, '_')}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('Profile exported successfully', 'success');
}

// Import profile from JSON file
function importProfile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const importName = prompt('Enter name for imported profile:', farmName);
        
        if (!importName) return;
        
        const key = `farm_${importName.replace(/ /g, '_')}`;
        localStorage.setItem(key, JSON.stringify(data));
        
        farmName = importName;
        loadInventory();
        updateFarmSelect();
        
        showToast('Profile imported successfully', 'success');
      } catch (err) {
        showToast('Error importing profile: Invalid file', 'danger');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// Delete current profile
function deleteProfile() {
  if (farmName === 'Default') {
    showToast('Cannot delete Default profile', 'warning');
    return;
  }
  
  if (confirm(`Delete profile "${farmName}"? This cannot be undone.`)) {
    const key = `farm_${farmName.replace(/ /g, '_')}`;
    localStorage.removeItem(key);
    
    farmName = 'Default';
    loadInventory();
    updateFarmSelect();
    
    showToast('Profile deleted', 'success');
  }
}


// Calculate total investment value
function calculateInvestment() {
  let totalValue = 0;
  
  // Calculate seed values
  Object.keys(SEED_DATA).forEach(seed => {
    RARITIES.forEach(rarity => {
      const qty = seedQuantities[`${seed}_${rarity}`];
      if (qty > 0 && SHOP_DATA.Seeds && SHOP_DATA.Seeds[seed]) {
        totalValue += SHOP_DATA.Seeds[seed].price * qty;
      }
    });
  });
  
  // Calculate plot values
  Object.entries(plotQuantities).forEach(([plot, qty]) => {
    if (qty > 0 && SHOP_DATA.Plots && SHOP_DATA.Plots[plot]) {
      totalValue += SHOP_DATA.Plots[plot].price * qty;
    }
  });
  
  // Calculate lamp values
  Object.entries(lampQuantities).forEach(([lamp, qty]) => {
    if (qty > 0 && SHOP_DATA.Lamps && SHOP_DATA.Lamps[lamp]) {
      totalValue += SHOP_DATA.Lamps[lamp].price * qty;
    }
  });
  
  // Calculate animal values
  Object.entries(animalQuantities).forEach(([animal, qty]) => {
    if (qty > 0 && SHOP_DATA.Animals && SHOP_DATA.Animals[animal]) {
      totalValue += SHOP_DATA.Animals[animal].price * qty;
    }
  });
  
  return totalValue;
}



// Debug helper - logs current state
function debugState() {
  console.log('=== Chainers Plot Planner Debug Info ===');
  console.log('Farm Name:', farmName);
  console.log('Total Seeds:', Object.values(seedQuantities).reduce((a, b) => a + b, 0));
  console.log('Total Plots:', Object.values(plotQuantities).reduce((a, b) => a + b, 0));
  console.log('Total Lamps:', Object.values(lampQuantities).reduce((a, b) => a + b, 0));
  console.log('Total Animals:', Object.values(animalQuantities).reduce((a, b) => a + b, 0));
  console.log('Lamp Bonus:', (1 - calculateLampBonus()) * 100 + '%');
  console.log('Strategy:', strategyVar);
  console.log('Show Seasonal:', showSeasonal);
  console.log('Sort By:', sortVar);
  console.log('Investment Value:', calculateInvestment());
  console.log('======================================');
}

// Expose functions to window for debugging/console access
window.chainersDebug = {
  exportProfile,
  importProfile,
  deleteProfile,
  calculateInvestment,
  debugState,
  getState: () => ({
    farmName,
    seedQuantities,
    plotQuantities,
    lampQuantities,
    animalQuantities,
    seasonalFlags,
    sortVar,
    showSeasonal,
    strategyVar
  })
};

console.log('💡 Debug tools available: window.chainersDebug');