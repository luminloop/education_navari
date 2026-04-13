<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <button
      v-for="action in actions"
      :key="action.label"
      class="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border hover:shadow-md transition-all hover:border-indigo-300"
      @click="handleAction(action)"
    >
      <div 
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        :class="action.bgClass"
      >
        <FeatherIcon :name="action.icon" :class="action.iconClass" class="w-5 h-5" />
      </div>
      <span class="text-sm font-medium text-gray-700">{{ action.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { FeatherIcon } from 'frappe-ui'

const router = useRouter()

const actions = [
  {
    label: 'Pay Fees',
    icon: 'credit-card',
    bgClass: 'bg-orange-100',
    iconClass: 'text-orange-600',
    route: '/fees'
  },
  {
    label: 'View Schedule',
    icon: 'calendar',
    bgClass: 'bg-blue-100',
    iconClass: 'text-blue-600',
    route: '/schedule'
  },
  {
    label: 'My Grades',
    icon: 'award',
    bgClass: 'bg-green-100',
    iconClass: 'text-green-600',
    route: '/grades'
  },
  {
    label: 'Apply Leave',
    icon: 'calendar-plus',
    bgClass: 'bg-purple-100',
    iconClass: 'text-purple-600',
    route: '/attendance'
  }
]

const handleAction = (action) => {
  router.push(action.route)
}
</script>