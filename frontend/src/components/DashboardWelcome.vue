<template>
  <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
        <img 
          v-if="studentImage" 
          :src="studentImage" 
          :alt="studentFullName"
          class="w-full h-full object-cover"
        />
        <FeatherIcon v-else name="user" class="w-8 h-8 text-white/80" />
      </div>
      <div class="flex-1">
        <h2 class="text-xl font-semibold">
          Welcome, {{ studentName }}!
        </h2>
        <p class="text-white/80 text-sm mt-1">
          {{ programName }}
        </p>
        <p v-if="studentGroups.length > 0" class="text-white/70 text-xs mt-1">
          {{ studentGroups.join(', ') }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-white/60 text-xs">Today's Date</p>
        <p class="font-medium">{{ formattedDate }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { studentStore } from '@/stores/student'

const { studentName, studentFullName, studentImage, currentProgram, studentGroups } = studentStore()

const programName = computed(() => {
  return currentProgram.value?.program || 'No program enrolled'
})

const formattedDate = computed(() => {
  const today = new Date()
  return today.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
})
</script>