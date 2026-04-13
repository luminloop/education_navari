<template>
  <div v-if="showAlert" class="rounded-lg p-4 mb-4" :class="alertClass">
    <div class="flex items-start gap-3">
      <FeatherIcon :name="alertIcon" class="w-5 h-5 mt-0.5" :class="iconClass" />
      <div class="flex-1">
        <p class="font-medium text-sm">{{ title }}</p>
        <p v-if="message" class="text-sm mt-1 opacity-90">{{ message }}</p>
        <button 
          v-if="actionLabel" 
          class="mt-2 text-xs font-medium underline"
          @click="$emit('action')"
        >
          {{ actionLabel }}
        </button>
      </div>
      <button @click="showAlert = false" class="opacity-70 hover:opacity-100">
        <FeatherIcon name="x" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FeatherIcon } from 'frappe-ui'

const props = defineProps({
  type: {
    type: String,
    default: 'info' // info, warning, success, error
  },
  title: {
    type: String,
    required: true
  },
  message: String,
  actionLabel: String,
  persist: {
    type: Boolean,
    default: false
  }
})

defineEmits(['action'])

const showAlert = ref(true)

const alertClass = computed(() => {
  const classes = {
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200'
  }
  return classes[props.type] || classes.info
})

const iconClass = computed(() => {
  const classes = {
    info: 'text-blue-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
    error: 'text-red-600'
  }
  return classes[props.type] || classes.info
})

const alertIcon = computed(() => {
  const icons = {
    info: 'info',
    warning: 'alert-triangle',
    success: 'check-circle',
    error: 'alert-circle'
  }
  return icons[props.type] || 'info'
})
</script>