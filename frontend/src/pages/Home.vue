<template>
  <div class="p-5 space-y-6">
    <!-- Welcome Banner -->
    <DashboardWelcome />

    <!-- Alerts Section -->
    <div v-if="hasAlert">
      <DashboardAlert
        :type="alertType"
        :title="alertTitle"
        :message="alertMessage"
        :action-label="alertActionLabel"
        @action="handleAlertAction"
      />
    </div>

    <!-- Stats Cards -->
    <DashboardStats />

    <!-- Quick Actions -->
    <div>
      <h3 class="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">
        Quick Actions
      </h3>
      <DashboardActions />
    </div>

    <!-- Recent Activity / Upcoming -->
    <div>
      <h3 class="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">
        Today's Schedule
      </h3>
      <div class="bg-white rounded-lg border divide-y">
        <div 
          v-for="(item, index) in todaySchedule" 
          :key="index"
          class="p-3 flex items-center gap-3 hover:bg-gray-50"
        >
          <div class="text-center min-w-[60px]">
            <p class="text-gray-900 font-medium">{{ item.time }}</p>
          </div>
          <div class="flex-1">
            <p class="text-gray-900 font-medium">{{ item.course }}</p>
            <p class="text-gray-500 text-sm">{{ item.teacher }}</p>
          </div>
          <div class="text-right">
            <p class="text-gray-500 text-sm">{{ item.room }}</p>
          </div>
        </div>
        <div v-if="todaySchedule.length === 0" class="p-4 text-center text-gray-500">
          No classes scheduled for today
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DashboardWelcome from '@/components/DashboardWelcome.vue'
import DashboardStats from '@/components/DashboardStats.vue'
import DashboardActions from '@/components/DashboardActions.vue'
import DashboardAlert from '@/components/DashboardAlert.vue'
import { studentStore } from '@/stores/student'

const router = useRouter()
const { feesData, hasOutstandingFees, totalOutstandingFees, fetchFees } = studentStore()

// Alert state
const hasAlert = computed(() => hasOutstandingFees.value)
const alertType = computed(() => 'warning')
const alertTitle = computed(() => 'Outstanding Fees')
const alertMessage = computed(() => {
  if (hasOutstandingFees.value) {
    return `You have KES ${totalOutstandingFees.value.toLocaleString()} in unpaid fees.`
  }
  return ''
})
const alertActionLabel = computed(() => hasOutstandingFees.value ? 'View Fees' : '')
const alertActionLabel2 = computed(() => 'Pay Now')

const handleAlertAction = () => {
  router.push('/fees')
}

// Today's schedule (mock data - would come from API)
const todaySchedule = ref([
  { time: '8:00 AM', course: 'Mathematics', teacher: 'Mr. Kiprop', room: 'Rm 101' },
  { time: '9:00 AM', course: 'English', teacher: 'Ms. Wangari', room: 'Rm 102' },
  { time: '10:00 AM', course: 'Science', teacher: 'Mr. Barasa', room: 'Lab 1' },
])

onMounted(() => {
  fetchFees()
})
</script>