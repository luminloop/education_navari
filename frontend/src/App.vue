<template>
  <div class="flex h-screen w-screen overflow-hidden">
    <!-- Sidebar: Hidden on mobile by default, toggled via state -->
    <div
      class="h-full border-r bg-gray-50 transition-all duration-300 ease-in-out fixed z-50 md:relative"
      :class="isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-56 md:translate-x-0'"
    >
      <Sidebar />
    </div>

    <div class="flex-1 flex flex-col h-full overflow-hidden">
      <Navbar @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
      <div class="flex-1 overflow-auto bg-white">
        <router-view />
      </div>
    </div>
  </div>
  <Toasts />
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
import { Toasts } from 'frappe-ui'

const isSidebarOpen = ref(false)
</script>
