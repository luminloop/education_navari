<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Fees -->
    <button
      type="button"
      class="group text-left bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
      @click="$router.push('/fees')"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
          <FeatherIcon name="credit-card" class="w-4.5 h-4.5 text-orange-600" />
        </div>
        <Badge v-if="!loading && hasOutstandingFees" theme="orange" size="sm">
          {{ outstandingCount > 1 ? `${outstandingCount} due` : 'Due' }}
        </Badge>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Fees</p>
      <Skeleton v-if="loading" class="mt-1.5 h-5 w-20" />
      <p v-else class="text-gray-900 text-base font-semibold mt-1 truncate">
        {{ hasOutstandingFees ? formatAmount(outstandingFees) : 'All clear' }}
      </p>
      <p v-if="!loading && !hasOutstandingFees" class="text-green-600 text-xs mt-0.5">
        No outstanding balance
      </p>
    </button>

    <!-- Attendance -->
    <button
      type="button"
      class="group text-left bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
      @click="$router.push('/attendance')"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <FeatherIcon name="user-check" class="w-4.5 h-4.5 text-blue-600" />
        </div>
        <Badge v-if="!loading && attendanceRate !== null && attendanceRate < 80" theme="red" size="sm">
          Low
        </Badge>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Attendance</p>
      <Skeleton v-if="loading" class="mt-1.5 h-5 w-16" />
      <template v-else>
        <p class="text-gray-900 text-base font-semibold mt-1">
          {{ attendanceRate !== null ? attendanceRate + '%' : 'No data' }}
        </p>
        <p v-if="attendanceTotal" class="text-gray-500 text-xs mt-0.5">
          last {{ attendanceTotal }} days
        </p>
      </template>
    </button>

    <!-- Next Class -->
    <button
      type="button"
      class="group text-left bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
      @click="$router.push('/schedule')"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
          <FeatherIcon name="clock" class="w-4.5 h-4.5 text-purple-600" />
        </div>
        <Badge v-if="!loading && nextClass" theme="purple" size="sm">
          {{ nextClass.time }}
        </Badge>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Next class</p>
      <Skeleton v-if="loading" class="mt-1.5 h-5 w-24" />
      <template v-else>
        <p class="text-gray-900 text-base font-semibold mt-1 truncate">
          {{ nextClass ? nextClass.course : 'No more today' }}
        </p>
        <p v-if="nextClass?.room" class="text-gray-500 text-xs mt-0.5 truncate">
          Room {{ nextClass.room }}
        </p>
      </template>
    </button>

    <!-- Latest Grade -->
    <button
      type="button"
      class="group text-left bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
      @click="$router.push('/grades')"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
          <FeatherIcon name="award" class="w-4.5 h-4.5 text-green-600" />
        </div>
        <Badge v-if="!loading && latestGrade?.grade" theme="green" size="sm">
          {{ latestGrade.grade }}
        </Badge>
      </div>
      <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">Latest grade</p>
      <Skeleton v-if="loading" class="mt-1.5 h-5 w-20" />
      <template v-else>
        <p class="text-gray-900 text-base font-semibold mt-1 truncate">
          {{ latestGrade ? (latestGrade.course || latestGrade.assessment) : 'No grades yet' }}
        </p>
        <p v-if="latestGrade?.score != null" class="text-gray-500 text-xs mt-0.5">
          {{ latestGrade.score }} / {{ latestGrade.max_score }}
        </p>
      </template>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Badge, FeatherIcon } from 'frappe-ui'
import { studentStore } from '@/stores/student'
import Skeleton from '@/components/Skeleton.vue'

const store = studentStore()
const { dashboardData } = storeToRefs(store)
const { dashboard } = store

const loading = computed(() => dashboard.loading || !dashboardData.value)
const data = computed(() => dashboardData.value || {})

const hasOutstandingFees = computed(() => (data.value.outstanding_fees || 0) > 0)
const outstandingFees = computed(() => data.value.outstanding_fees || 0)
const outstandingCount = computed(() => data.value.outstanding_count || 0)
const attendanceRate = computed(() =>
  data.value.attendance_rate === undefined ? null : data.value.attendance_rate
)
const attendanceTotal = computed(() => data.value.attendance_total || 0)
const nextClass = computed(() => data.value.next_class || null)
const latestGrade = computed(() => data.value.latest_grade || null)

const currencySymbol = computed(() => data.value.currency || 'KES')

const formatAmount = (amount) => {
  return `${currencySymbol.value} ${new Intl.NumberFormat('en-KE').format(Math.round(amount || 0))}`
}
</script>
