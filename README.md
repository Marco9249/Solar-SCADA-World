# 🌍 Solar SCADA World 3D

<div align="center">
  <img src="public/favicon.svg" alt="Logo" width="100" height="100" />
  <h3>Interactive 3D Solar Farm & SCADA Simulation</h3>
  <p>An immersive, physics-informed, fully offline 3D SCADA visualization built with React, Three.js, and Vite.</p>
</div>

---

## 📖 Overview
**Solar SCADA World** is a high-fidelity 3D simulation environment designed to visualize and interact with a modern solar-powered agricultural farm. It combines real-time weather systems, fluid dynamics (pumps and irrigation), power storage (battery banks), and an advanced Heads-Up Display (HUD) into a cohesive digital twin.

This project is built using **React**, **Three.js (React Three Fiber)**, and **Tailwind CSS**. It is fully optimized to run locally (Offline) without relying on external internet connections or CDNs.

---

## ✨ Features
- 🌞 **Dynamic Solar Arrays**: Real-time rendering of solar panels.
- 🌧️ **Interactive Weather System**: Change between Sunny, Cloudy, Rainy, and Stormy weather seamlessly.
- 💧 **Irrigation & Pumping SCADA**: Control hydraulic piping, water tanks, and irrigation fields.
- ⚡ **Electrical & Battery Banks**: Visualize electrical wiring and power storage.
- 🎮 **First-Person Controls**: Navigate the farm like a video game using WASD and mouse look.
- 📊 **Real-time Data Panel**: Interactive UI for controlling and monitoring the SCADA parameters.

---

## 🚀 How to Run Locally (Offline Mode)

We have created an automated launcher to run the world with a single click:

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed on your machine.
2. **Download / Clone**: Download the repository to your local machine.
3. **Run**: 
   - Double-click the **`Run.bat`** file located in the root directory.
   - The script will automatically start the local server and open your default browser at `http://localhost:5173/`.
4. **Alternative Method**: If you are not on Windows or prefer the terminal, simply run:
   ```bash
   npm install
   npm run dev
   ```

---

## 🛠️ Developer Tutorial: How to Add a New Button to the UI

Want to extend the SCADA interface by adding a new interactive button? Follow this comprehensive guide!

### Step 1: Locate the Target Component
In this project, the user interface overlays are built using standard React components with **Tailwind CSS**. The main control panel is usually located in `src/components/SimulationDataPanel.tsx` or `src/components/HUD.tsx`. 

Let's add a button to the **SimulationDataPanel**.

### Step 2: Add the Button UI
Open `src/components/SimulationDataPanel.tsx`. Look for the section where other controls (like the Weather Selector or Pump Toggles) are rendered, and add your button HTML:

```tsx
// Inside your component's return statement:
<button 
  onClick={handleMyButtonClick}
  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded shadow-lg transition-all active:scale-95 flex items-center gap-2"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
  Super Boost Mode
</button>
```
*Notice the Tailwind classes: they make the button look professional, add hover effects, and a click animation (`active:scale-95`).*

### Step 3: Create the Logic (Make it Work!)
Now, you need to define what happens when the button is clicked. Inside the same component (before the `return` statement), add the function `handleMyButtonClick`:

```tsx
import { useState } from "react";
import { toast } from "sonner"; // If you want to show a popup notification!

export default function SimulationDataPanel() {
  const [isBoostActive, setIsBoostActive] = useState(false);

  const handleMyButtonClick = () => {
    // 1. Change the state
    setIsBoostActive(!isBoostActive);

    // 2. Execute your logic (e.g., speed up the water pumps, increase voltage)
    if (!isBoostActive) {
      console.log("Boost Mode Activated! 🚀");
      toast.success("System Boost Activated! Power output increased.");
      // You can call your SCADA context or Three.js store here
    } else {
      console.log("Boost Mode Deactivated! 🛑");
      toast.info("System returned to normal operations.");
    }
  };

  return (
    // ... your JSX containing the button ...
  );
}
```

### Step 4: Connecting UI to the 3D World (Optional but Powerful)
If you want your button to physically alter the 3D world (e.g., change the color of the water tank or speed up a 3D fan):
1. Save your state in a global context (like `WeatherContext.tsx`) OR pass it down.
2. In your 3D Component (e.g., `PumpSystem.tsx`), use the `useFrame` hook from `@react-three/fiber` to read the state and animate the 3D object based on the button click!

```tsx
// Inside a 3D component
useFrame(() => {
  if (isBoostActive && myFanRef.current) {
    myFanRef.current.rotation.z += 0.5; // Spins very fast!
  }
});
```

---
<div align="center">
  <i>Developed with ❤️ by Mohammed</i>
</div>
