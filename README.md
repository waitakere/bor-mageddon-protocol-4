# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd BOR-MAGEDDON-1993

# Step 3: Install the necessary dependencies
npm install

# Step 4: Start the development server with auto-reloading
npm run dev
🛠️ Technologies Used
This project bridges the gap between a modern web UI and a highly optimized retro 16-bit game engine:

Phaser 3 (Core Game Engine, 2.5D Arcade Physics, WebGL Rendering)

React (Game HUD, Main Menus, Overlay UI)

TypeScript (Strict object-oriented typing for game entities and systems)

Vite (Ultra-fast build tool and dev server)

Supabase (Backend database for saving player progression and Dinar counts)

Tailwind CSS & shadcn-ui (UI Styling)

📦 Asset Pipeline Rules
To ensure the game loads instantly and runs at 60 FPS in the browser, do not upload raw individual .wav files or single .png animation frames to this repository.

All raw assets must be compiled before being placed in the public/assets/ folder:

Images: Must be packed into a Texture Atlas (.png + .json).

Audio: Must be compiled into an Audio Sprite (.mp3 + .json) using audiosprite --format phaser.

🌐 Building & Deployment
Since this project is powered by Vite, deploying it to production is incredibly simple. You can host this game on any static hosting service (like Vercel, Netlify, or GitHub Pages).

To generate the final production build of the game, run:

Bash
npm run build
This will compile all your React code, Phaser logic, and assets into a highly optimized dist/ folder. You simply upload the contents of that dist/ folder to your web host!


This perfectly sets up your repository for a professional, independent workflow. Are you ready to dive into the Codespace and boot up the game, or do you need help setting up the Supabase database link first?
