# Pantheon Design System 🏛️

This is a lightweight design system scaffold for the **Oh My OpenCode Slim** project. It is designed to bring visual cohesion, accessibility, and high-performance interactions to any future user-facing interfaces (Dashboards, Settings, or TUIs).

## 🎨 Visual Vision

The aesthetic is **"Technological Elegance"**—a blend of modern terminal minimalism with rich, intentional accents. 

- **Primary Motif**: Deep Obsidian backgrounds with vibrant, glowing accents that represent the different agents in the Pantheon.
- **Typography**: High-contrast pairings between characterful display fonts and precise monospaced data.
- **Motion**: Orchestrated, staggered entries and status-driven pulses.

## 🧱 Component Strategy

### 1. Atomic Foundation (`/src/tokens`)
We define our core "Source of Truth" for:
- **Colors**: Named after geological and electrical elements (Obsidian, Cyan, Voltage Purple).
- **Typography**: Built for hierarchical clarity.
- **Spacing**: A 4px-base grid system.

### 2. Atomic Components (`/src/components/atoms`)
Base building blocks:
- `Button`: Multiple variants (Ghost, Glass, Glow).
- `Badge`: Compact status indicators.
- `Icon`: Custom-tuned stroke icons.

### 3. Molecular Components (`/src/components/molecules`)
Context-aware groupings:
- `AgentCard`: The primary way to represent an AI agent's state.
- `InputGroup`: Floating labels and focused states.

### 4. Organisms (`/src/components/organisms`)
Complex layout structures:
- `ActivityFeed`: A real-time stream of agent events.
- `Sidebar`: Collapsible navigation with active-agent highlights.

## 🚀 Styling Philosophy

- **Tailwind First**: We use Tailwind CSS for rapid, maintainable styling.
- **Intentional Overrides**: Custom CSS is reserved for complex animations and "holographic" glass effects that utilities can't easily express.
- **Accessibility**: All components target AA compliance, with clear focus states and ARIA labels.

---

*This design system is curated by the **Designer** agent.*
