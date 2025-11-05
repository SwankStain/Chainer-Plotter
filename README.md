# ⛓️ Chainers Plot Planner

A web-based tool designed to help players of the game [Chainers](https://chainers.io/) optimize their farm layout for maximum Bio Point (BP) generation.

This planner allows you to input your current inventory of seeds, plots, lamps, and animals, and then calculates the most effective strategy for planting, whether you're playing actively or idling.

![Chainers Plot Planner Screenshot](https://via.placeholder.com/800x450.png?text=App+Screenshot+Here)
*(Replace this with a screenshot of the application)*

---

## ✨ Key Features

- **📋 Inventory Management:** Easily track the quantities of all your in-game assets, including seeds, plots, lamps, and animals across all rarities.
- **📊 Optimal Strategy Calculator:**
  - **Max BP/min:** Calculates the best setup for active players who can replant crops immediately.
  - **Max BP/batch:** Determines the best setup for idle players who plant once and harvest everything together.
- **💡 Lamp Integration:** The strategy calculator automatically accounts for the time reduction bonus provided by your lamps, assigning them to the most valuable plots.
- **🚫 Exclusion System:** Fine-tune your strategy by excluding specific seeds you don't want to use, directly from the strategy results page.
- **⬆️ Upgrade & Info Views:**
  - **Upgrade View:** Instantly see the number of common seeds (and their cost) required to merge up to the next rarity you don't own.
  - **Info View:** Flip any card to see detailed stats like BP/m range, grow times, and total crafting costs.
- **🏪 In-Game Shop Browser:** A complete, filterable, and sortable view of all items available for purchase in the game, including their prices and stats.
- **💾 Profile Management:** Save and load multiple farm profiles directly in your browser's local storage.
- **📱 Responsive Design:** Fully functional on both desktop and mobile browsers.

---

## 🚀 How to Use

1.  **Input Your Inventory:**
    - Navigate to the **🌱 Seeds**, **📦 Plots**, **💡 Lamps**, and **🐮 Animals** tabs.
    - Use the `+` and `-` buttons or type directly into the input fields to set the quantity of each item you own.

2.  **Calculate Your Strategy:**
    - Go to the **📊 Strategy** tab.
    - At the top, select your preferred playstyle:
      - `⚡ Max BP/min (Active Play)`
      - `🎯 Max BP/batch (Idle Play)`
    - The planner will automatically display the optimal seed-to-plot assignments.

3.  **Refine and Analyze:**
    - The results are split into three sections: **Optimal Assignments**, **Unused Seeds**, and **Excluded Seeds**.
    - If you want to ignore a specific seed in the calculation, click the `🚫` button on its card in either the "Optimal" or "Unused" section. It will be moved to the "Excluded" section and the strategy will recalculate.
    - To re-include an excluded seed, click the `➕` button on its card in the "Excluded" section.

4.  **Save Your Profile:**
    - Click the `💾 Save` button in the top navigation bar.
    - Give your profile a name (e.g., "Main Farm", "Alt Account").
    - You can load or delete profiles using the dropdown menu and adjacent buttons.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Framework:** Bootstrap 5 for responsive layout and components.
- **Data:** Game data is managed via static `JSON` files located in the `/public/data` directory.

---

## 🖼️ Screenshots

### Strategy View
!Strategy View Screenshot

### Seed Card - Upgrade View
!Upgrade View Screenshot

---

## ✍️ Author

aS2o
