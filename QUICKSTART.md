# ⚡ Mini-BI Quick Start Guide

Get up and running with Mini-BI in under 5 minutes!

## 🚀 Step 1: Installation

```bash
# Create a new Svelte project (if starting fresh)
npm create svelte@latest my-dashboard-app
cd my-dashboard-app

# Install Mini-BI
npm install @jaspero/mini-bi --save-exact

# Install peer dependencies
npm install svelte@^5.0.0 --save-exact

# Install Tailwind CSS for styling
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography --save-exact
npx tailwindcss init -p
```

## 🎨 Step 2: Configure Tailwind CSS

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@jaspero/mini-bi/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {}
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
```

Add to `src/app.css`:

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
```

## 📊 Step 3: Create Your First Dashboard

Replace `src/routes/+page.svelte`:

```svelte
<script>
  import { DashboardComponent, MockDashboardService } from '@jaspero/mini-bi';
  
  const dashboardService = new MockDashboardService();
  let selectedDashboardId = '1'; // Use built-in sample dashboard
</script>

<svelte:head>
  <title>My Dashboard App</title>
</svelte:head>

<main class="h-screen">
  <DashboardComponent 
    {dashboardService}
    {selectedDashboardId}
    editable={true}
  />
</main>
```

## 🏃‍♂️ Step 4: Run Your App

```bash
npm run dev
```

Visit `http://localhost:5173` and you'll see:

- 📊 **Interactive charts** with sample sales data
- 📋 **Data tables** with sorting and filtering
- 🎛️ **Filter sidebar** with region and date filters
- ✏️ **Edit mode** for drag-and-drop block positioning

## 🎯 Step 5: Try the Features

### Edit Mode
- Click blocks to see edit controls
- Drag blocks to reposition them
- Resize blocks using corner handles
- Add new blocks with the "+" button

### Filtering
- Click the "Filter" button to open the sidebar
- Change region selection to see data update
- Modify date ranges to filter time periods

### Query Management
- Access the built-in SQL editor
- See sample queries for sales and campaign data
- Use AI assistance to generate new queries

## 🔧 Step 6: Customize Your Dashboard

### Add Your Own Data

```svelte
<script>
  import { DashboardComponent, type IDashboardService } from '@jaspero/mini-bi';
  
  // Create custom service
  class MyDashboardService {
    async executeQuery(queryId, parameters) {
      // Connect to your API
      const response = await fetch(`/api/data/${queryId}`, {
        method: 'POST',
        body: JSON.stringify({ parameters })
      });
      return response.json();
    }
    
    // Implement other required methods...
  }
  
  const dashboardService = new MyDashboardService();
</script>
```

### Create Custom Blocks

```svelte
<!-- CustomKPI.svelte -->
<script>
  let { value, target, label } = $props();
  const progress = (value / target) * 100;
</script>

<div class="bg-white p-6 rounded-lg shadow">
  <h3 class="text-lg font-semibold mb-2">{label}</h3>
  <div class="text-3xl font-bold text-blue-600">{value.toLocaleString()}</div>
  <div class="text-sm text-gray-500">Target: {target.toLocaleString()}</div>
  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
    <div class="bg-blue-600 h-2 rounded-full" style="width: {progress}%"></div>
  </div>
</div>
```

## 📱 Mobile-Responsive Layout

```svelte
<script>
  import { DashboardComponent } from '@jaspero/mini-bi';
  
  let isMobile = false;
  
  // Detect screen size
  function checkMobile() {
    isMobile = window.innerWidth < 768;
  }
</script>

<svelte:window on:resize={checkMobile} />

<main class="h-screen {isMobile ? 'p-2' : 'p-6'}">
  <DashboardComponent 
    {dashboardService}
    {selectedDashboardId}
    editable={!isMobile}
  />
</main>
```

## 🎨 Custom Styling

```css
/* Add to your app.css */
.mini-bi-dashboard {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.mini-bi-block {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## 🔗 Next Steps

1. **Read the full documentation**: Check `README.md` for comprehensive API reference
2. **Explore examples**: See `IMPLEMENTATION.md` for real-world scenarios
3. **Connect your database**: Replace MockDashboardService with your own implementation
4. **Add authentication**: Integrate with your auth system
5. **Deploy**: Build and deploy to your preferred platform

## 🆘 Need Help?

- 📖 **Documentation**: Full API reference in README.md
- 💡 **Examples**: Real-world implementations in IMPLEMENTATION.md
- 🐛 **Issues**: Report bugs on GitHub
- 💬 **Community**: Join discussions for support

---

🎉 **Congratulations!** You now have a fully functional BI dashboard. Start exploring the features and customizing it for your needs!
