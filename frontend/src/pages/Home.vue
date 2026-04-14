<template>
  <div class="p-5">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p class="text-gray-500 text-sm mt-1">Welcome back, {{ studentName }}</p>
    </div>

    <!-- Alert for outstanding fees -->
    <div v-if="hasOutstandingFees" class="mb-6">
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
        <FeatherIcon name="alert-circle" class="w-5 h-5 text-orange-600 mt-0.5" />
        <div class="flex-1">
          <p class="font-medium text-orange-800">Outstanding Fees</p>
          <p class="text-sm text-orange-700">
            You have <strong>KES {{ totalOutstandingFees.toLocaleString() }}</strong> in unpaid fees.
          </p>
        </div>
        <Button variant="solid" size="sm" @click="router.push('/fees')">
          View Fees
        </Button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div 
        v-for="action in quickActions" 
        :key="action.route"
        class="bg-white border rounded-lg p-4 hover:border-gray-400 cursor-pointer transition-colors"
        @click="router.push(action.route)"
      >
        <component :is="action.icon" class="w-5 h-5 text-gray-600 mb-2" />
        <p class="font-medium text-gray-900">{{ action.label }}</p>
      </div>
    </div>

    <!-- Today's Schedule -->
    <div class="bg-white border rounded-lg">
      <div class="px-4 py-3 border-b">
        <h2 class="font-medium text-gray-900">Today's Schedule</h2>
      </div>
      <div v-if="todaySchedule.length > 0" class="divide-y">
        <div 
          v-for="(item, index) in todaySchedule" 
          :key="index"
          class="p-4 flex items-center gap-4 hover:bg-gray-50"
        >
          <div class="text-center min-w-[70px]">
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
      </div>
      <div v-else class="p-8 text-center text-gray-500">
        No classes scheduled for today
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { Button, FeatherIcon } from 'frappe-ui'
import { studentStore } from '@/stores/student'

const router = useRouter()
const { feesData, fetchFees, getStudentInfo, student } = studentStore()

const studentName = computed(() => {
  const info = getStudentInfo().value
  return info?.first_name || info?.student_name || 'Student'
})

const hasOutstandingFees = computed(() => {
  if (!feesData.value?.invoices) return false
  return feesData.value.invoices.some(inv => 
    ['Unpaid', 'Overdue', 'Partly Paid', 'Draft'].includes(inv.status)
  )
})

const totalOutstandingFees = computed(() => {
  if (!feesData.value?.invoices) return 0
  return feesData.value.invoices
    .filter(inv => ['Unpaid', 'Overdue', 'Partly Paid', 'Draft'].includes(inv.status))
    .reduce((sum, inv) => sum + parseFloat(inv.amount?.replace(/[^0-9.-]/g, '') || 0), 0)
})

const CalendarIcon = {
  render() {
    return h(FeatherIcon, { name: 'calendar', class: 'w-5 h-5' })
  }
}

const BookIcon = {
  render() {
    return h(FeatherIcon, { name: 'book-open', class: 'w-5 h-5' })
  }
}

const CreditCardIcon = {
  render() {
    return h(FeatherIcon, { name: 'credit-card', class: 'w-5 h-5' })
  }
}

const UsersIcon = {
  render() {
    return h(FeatherIcon, { name: 'users', class: 'w-5 h-5' })
  }
}

const quickActions = [
  { label: 'Schedule', route: '/schedule', icon: CalendarIcon },
  { label: 'Grades', route: '/grades', icon: BookIcon },
  { label: 'Fees', route: '/fees', icon: CreditCardIcon },
  { label: 'Attendance', route: '/attendance', icon: UsersIcon },
]

const todaySchedule = ref([])

onMounted(async () => {
  await student.fetch()
  fetchFees()
})
</script>
