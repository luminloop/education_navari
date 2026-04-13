<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <!-- Fees Card -->
    <div 
      class="bg-white rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      @click="$router.push('/fees')"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
          <FeatherIcon name="credit-card" class="w-5 h-5 text-orange-600" />
        </div>
        <Badge 
          v-if="hasOutstandingFees" 
          theme="orange" 
          size="sm"
        >
          Due
        </Badge>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase">Fees</p>
      <p class="text-gray-900 text-lg font-semibold mt-1">
        {{ hasOutstandingFees ? formatAmount(outstandingFees) : 'All Clear' }}
      </p>
    </div>

    <!-- Attendance Card -->
    <div 
      class="bg-white rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      @click="$router.push('/attendance')"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <FeatherIcon name="calendar" class="w-5 h-5 text-blue-600" />
        </div>
        <Badge 
          v-if="attendanceRate !== null && attendanceRate < 80" 
          theme="red" 
          size="sm"
        >
          Low
        </Badge>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase">Attendance</p>
      <p class="text-gray-900 text-lg font-semibold mt-1">
        {{ attendanceRate !== null ? attendanceRate + '%' : '--' }}
      </p>
    </div>

    <!-- Next Class Card -->
    <div 
      class="bg-white rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      @click="$router.push('/schedule')"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <FeatherIcon name="clock" class="w-5 h-5 text-purple-600" />
        </div>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase">Next Class</p>
      <p class="text-gray-900 text-lg font-semibold mt-1">
        {{ nextClass || '--' }}
      </p>
      <p class="text-gray-500 text-xs mt-1">
        {{ nextClassTime || '' }}
      </p>
    </div>

    <!-- Grades Card -->
    <div 
      class="bg-white rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      @click="$router.push('/grades')"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <FeatherIcon name="award" class="w-5 h-5 text-green-600" />
        </div>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase">Grades</p>
      <p class="text-gray-900 text-lg font-semibold mt-1">
        {{ latestGrade || 'No grades' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Badge, FeatherIcon } from 'frappe-ui'
import { studentStore } from '@/stores/student'

const { feesData, currentProgram } = studentStore()

const hasOutstandingFees = ref(false)
const outstandingFees = ref(0)
const attendanceRate = ref(null)
const nextClass = ref(null)
const nextClassTime = ref(null)
const latestGrade = ref(null)

const formatAmount = (amount) => {
  return 'KES ' + new Intl.NumberFormat('en-KE').format(amount || 0)
}

onMounted(() => {
  // Calculate fees data
  if (feesData.value?.invoices) {
    const invoices = feesData.value.invoices
    const unpaidInvoices = invoices.filter(inv => 
      ['Unpaid', 'Overdue', 'Partly Paid', 'Draft'].includes(inv.status)
    )
    hasOutstandingFees.value = unpaidInvoices.length > 0
    
    if (unpaidInvoices.length > 0) {
      outstandingFees.value = unpaidInvoices.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount?.replace(/[^0-9.-]/g, '') || 0)
        return sum + amount
      }, 0)
    }
  }

  // Get next class from today's schedule
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute
  
  // This would be populated from schedule data
  nextClass.value = 'Math'
  nextClassTime.value = '2:00 PM'
  
  // Latest grade placeholder
  latestGrade.value = 'A'
})
</script>