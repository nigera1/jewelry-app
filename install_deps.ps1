$env:PATH += ";C:\Program Files\nodejs\"
cd "c:\Users\geran\OneDrive\Desktop\jewelry-app"

# Install TypeScript and Next.js types
npm install -D typescript @types/node @types/react @types/react-dom

# Install enterprise dependencies
npm install @tanstack/react-query @vercel/speed-insights zod react-hook-form @hookform/resolvers

# Install Shadcn UI utilities
npm install clsx tailwind-merge class-variance-authority tailwindcss-animate
